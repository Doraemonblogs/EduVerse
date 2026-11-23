import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { TUTORIAL_PAGES_DEFAULTS } from '@/globals/tutorial-pages-defaults'
import { cacheTags } from '@/hooks/revalidate'
import { DISCIPLINE_REF_SELECT, optionalText, queryDisciplineRefs } from '@/lib/data/courses'
import { getPayloadClient } from '@/lib/payload'
import { toTutorialCard } from '@/lib/tutorials/mappers'
import type { TutorialListData, TutorialPagesSettings } from '@/lib/tutorials/types'

/**
 * 免费教程的数据查询：教程列表（含筛选项来源）、教程页面设置。
 *
 * 两层导出（同 src/lib/data/courses.ts）：
 * - `query*(payload, …)`：查询函数，接收 Payload 实例，集成测试直接调用；
 * - `get*(…)`：页面使用的缓存版本（unstable_cache + 与 Payload 钩子一致的缓存标签）。
 *
 * 草稿：Local API 默认 overrideAccess=true——教程一律过滤 `_status: published`；
 * 填充进来的专业方向按 `_status` 再过滤（未发布时 discipline 为 null）。
 * 播放器地址由平台 + 视频 ID 构造并按白名单校验（tutorialEmbedUrl），不合法时为 null。
 * “留资后解锁”只是引导，不是访问控制：gated 教程同样给出播放器地址（视频本身在公开平台）。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 教程卡片用到的字段（src/lib/tutorials/mappers.ts 的 toTutorialCard 读取这些字段，增删时同步） */
const TUTORIAL_SELECT = {
  title: true,
  slug: true,
  description: true,
  cover: true,
  discipline: true,
  level: true,
  provider: true,
  videoId: true,
  duration: true,
  gated: true,
  createdAt: true,
} as const

/**
 * 查询：教程列表 /tutorials 的数据——全部已发布教程（后台排序 order、ID），
 * 以及筛选项来源（已发布的专业方向，按后台排序）。教程不多，页面一次全部渲染、按 searchParams 过滤。
 */
export async function queryTutorialList(payload: Payload): Promise<TutorialListData> {
  const [{ docs }, disciplines] = await Promise.all([
    payload.find({
      collection: 'tutorials',
      where: published,
      select: TUTORIAL_SELECT,
      populate: { disciplines: DISCIPLINE_REF_SELECT },
      depth: 1,
      sort: ['order', 'id'],
      pagination: false,
    }),
    queryDisciplineRefs(payload),
  ])
  return { tutorials: docs.map(toTutorialCard), facets: { disciplines } }
}

/** 查询：教程页面设置（全局 tutorial-pages），缺省值见 src/globals/tutorial-pages-defaults.ts */
export async function queryTutorialPagesSettings(payload: Payload): Promise<TutorialPagesSettings> {
  const doc = await payload.findGlobal({ slug: 'tutorial-pages', depth: 1 })
  const D = TUTORIAL_PAGES_DEFAULTS
  return {
    list: {
      title: doc.list?.title?.trim() || D.list.title,
      description: optionalText(doc.list?.description, D.list.description),
      seo: doc.list?.seo ?? null,
    },
    gate: {
      title: doc.gate?.title?.trim() || D.gate.title,
      description: optionalText(doc.gate?.description, D.gate.description),
      submitLabel: doc.gate?.submitLabel?.trim() || D.gate.submitLabel,
    },
  }
}

// ───────────────────────── 缓存版本（页面使用） ─────────────────────────

/** 教程列表：教程、专业方向（名称 / 发布状态 / 排序）、封面 */
const TUTORIAL_LIST_TAGS = ['tutorials', 'disciplines', 'media'].map(cacheTags.collection)

/**
 * 教程列表的数据（缓存）：全部教程卡片 + 筛选项来源。页面渲染时按 searchParams 过滤，
 * `?play=<id>` 用 parseTutorialId() 解析后在 tutorials 里查找（找不到不打开弹窗）。
 */
export const getTutorialList = unstable_cache(
  async (): Promise<TutorialListData> => queryTutorialList(await getPayloadClient()),
  ['tutorial-list'],
  { tags: TUTORIAL_LIST_TAGS },
)

/** 教程页面设置（缓存）：列表页标题 / 简介 / SEO、留资解锁区文案 */
export const getTutorialPagesSettings = unstable_cache(
  async (): Promise<TutorialPagesSettings> => queryTutorialPagesSettings(await getPayloadClient()),
  ['tutorial-pages-settings'],
  { tags: [cacheTags.global('tutorial-pages'), cacheTags.collection('media')] },
)
