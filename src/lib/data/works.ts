import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { WORK_PAGES_DEFAULTS } from '@/globals/work-pages-defaults'
import { cacheTags } from '@/hooks/revalidate'
import { publishedDoc, relationId } from '@/lib/course/mappers'
import { DISCIPLINE_REF_SELECT, optionalText, queryDisciplineRefs } from '@/lib/data/courses'
import { imageSource } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import {
  mergeRelatedWorks,
  sortWorks,
  toSoftwareTags,
  toWorkCard,
  toWorkGallery,
  toWorkVideo,
} from '@/lib/works/mappers'
import { parseWorkId } from '@/lib/works/paths'
import type {
  SoftwareTag,
  WorkCardData,
  WorkCourseRef,
  WorkDetail,
  WorkListData,
  WorkPagesSettings,
} from '@/lib/works/types'

/**
 * 学员作品的数据查询：作品列表（含筛选项来源）、作品详情、作品页面设置。
 *
 * 两层导出（同 src/lib/data/courses.ts）：
 * - `query*(payload, …)` / `findWorkCards`：查询函数，接收 Payload 实例，集成测试直接调用；
 * - `get*(…)`：页面使用的缓存版本（unstable_cache + 与 Payload 钩子一致的缓存标签）。
 *
 * 草稿、授权与隐私：Local API 默认 overrideAccess=true——
 * - 作品一律过滤 `_status: published` 且 `consentConfirmed = true`（未授权的作品不出现在任何地方，详情返回 null）；
 * - 填充进来的专业方向按 `_status` 再过滤（未发布时 discipline 为 null）；
 * - 所属课程只有在课程已发布、且课程的专业方向已发布时给出（可链接），否则为 null；
 * - 外部播放器地址不在白名单时当作无视频。
 * 只读取前台展示需要的字段，不涉及线索、用户等数据；作者只有化名与届别。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 前台可见的作品：已发布、且已确认学员授权 */
const visible = {
  and: [published, { consentConfirmed: { equals: true } }],
} as const satisfies Where

/** 作品卡片用到的作品字段（mappers 读取这些字段，增删时同步） */
const WORK_CARD_SELECT = {
  title: true,
  author: true,
  cover: true,
  discipline: true,
  software: true,
  featured: true,
  publishedAt: true,
} as const

/** 填充软件时只取名称与 slug */
const SOFTWARE_POPULATE = { name: true, slug: true } as const

/**
 * 作品列表的数据库排序：发布时间降序、ID 降序。
 * 注意 PostgreSQL 降序时把 NULL（发布时间被清空的作品）排在最前，与 compareWorks（排在最后）不一致：
 * 不限数量时查出后再用 sortWorks 排序；限量查询见 findWorkCards。
 */
const WORK_SORT = ['-publishedAt', '-id']

/** 详情页相关作品的数量上限 */
const RELATED_LIMIT = 8

const hasPublishedAt = { publishedAt: { exists: true } } as const satisfies Where
const noPublishedAt = { publishedAt: { exists: false } } as const satisfies Where

/**
 * 前台可见作品的卡片（where 为附加条件），按 compareWorks 排序（发布时间降序、ID 降序，
 * 没有发布时间的排在最后）；limit 不传为全部。
 * 讲师详情（src/lib/data/teachers.ts）也用它查询授课课程的作品。
 *
 * 限量时不能直接让数据库按发布时间降序截取（NULL 排在最前，会挤掉较新的作品）：
 * 先取有发布时间的前 limit 件，不足时再用没有发布时间的（ID 降序）补齐。
 */
export async function findWorkCards(
  payload: Payload,
  where: Where | null,
  limit?: number,
): Promise<WorkCardData[]> {
  const find = async (extra: Where | null, sort: string[], max?: number) => {
    const conditions = [visible, where, extra].filter((c): c is Where => c !== null)
    const { docs } = await payload.find({
      collection: 'works',
      where: conditions.length > 1 ? { and: conditions } : visible,
      select: WORK_CARD_SELECT,
      populate: { disciplines: DISCIPLINE_REF_SELECT, software: SOFTWARE_POPULATE },
      depth: 1,
      sort,
      pagination: false,
      ...(max ? { limit: max } : {}),
    })
    return docs.map(toWorkCard)
  }

  if (!limit) return sortWorks(await find(null, WORK_SORT))
  const dated = await find(hasPublishedAt, WORK_SORT, limit)
  const undated =
    dated.length < limit ? await find(noPublishedAt, ['-id'], limit - dated.length) : []
  return sortWorks([...dated, ...undated])
}

/** 全部软件（按后台排序），作品筛选“软件”一行的来源 */
async function findSoftwareTags(payload: Payload): Promise<SoftwareTag[]> {
  const { docs } = await payload.find({
    collection: 'software',
    select: SOFTWARE_POPULATE,
    depth: 0,
    sort: ['order', 'id'],
    pagination: false,
  })
  return toSoftwareTags(docs)
}

/** 课程可公开访问（已发布、且所属专业方向已发布）时返回课程引用，否则 null */
async function findReachableCourse(
  payload: Payload,
  courseId: number,
): Promise<WorkCourseRef | null> {
  const { docs } = await payload.find({
    collection: 'courses',
    where: {
      and: [
        { id: { equals: courseId } },
        published,
        { 'discipline._status': { equals: 'published' } },
      ],
    },
    select: { title: true, slug: true },
    depth: 0,
    limit: 1,
    pagination: false,
  })
  const course = docs[0]
  return course ? { id: course.id, title: course.title, slug: course.slug } : null
}

/**
 * 查询：作品列表 /works 的数据——全部前台可见作品（发布时间降序、ID 降序），
 * 以及筛选项来源（已发布的专业方向、全部软件，按后台排序）。
 * 页面渲染时：parseWorkFilters → filterWorks → paginate；筛选栏用 buildWorkFilterRows(works, filters, facets)。
 */
export async function queryWorkList(payload: Payload): Promise<WorkListData> {
  const [works, disciplines, software] = await Promise.all([
    findWorkCards(payload, null),
    queryDisciplineRefs(payload),
    findSoftwareTags(payload),
  ])
  return { works, facets: { disciplines, software } }
}

/** 查询：作品详情；作品不存在 / 未发布 / 未确认授权时返回 null */
export async function queryWorkDetail(payload: Payload, id: number): Promise<WorkDetail | null> {
  const { docs } = await payload.find({
    collection: 'works',
    where: { and: [visible, { id: { equals: id } }] },
    // depth 1：封面、图集、视频文件、分享图（媒体），专业方向、课程、软件
    populate: {
      disciplines: DISCIPLINE_REF_SELECT,
      courses: { title: true, slug: true, _status: true },
      software: SOFTWARE_POPULATE,
    },
    depth: 1,
    limit: 1,
    pagination: false,
  })
  const work = docs[0]
  if (!work) return null

  const courseId = relationId(work.course)
  const disciplineId = relationId(work.discipline)
  const courseDoc = publishedDoc(work.course)
  const [course, sameCourse, sameDiscipline] = await Promise.all([
    courseDoc ? findReachableCourse(payload, courseDoc.id) : null,
    courseId !== null
      ? findWorkCards(
          payload,
          { and: [{ course: { equals: courseId } }, { id: { not_equals: work.id } }] },
          RELATED_LIMIT,
        )
      : [],
    disciplineId !== null
      ? findWorkCards(
          payload,
          { and: [{ discipline: { equals: disciplineId } }, { id: { not_equals: work.id } }] },
          RELATED_LIMIT * 2,
        )
      : [],
  ])

  const card = toWorkCard(work)
  const heroImage = imageSource(work.cover, 'hero')
  return {
    ...card,
    heroImage,
    shareImage: imageSource(work.cover, 'og'),
    gallery: toWorkGallery(work.gallery),
    video: toWorkVideo(work.video, heroImage),
    description: work.description?.trim() || null,
    course,
    software: toSoftwareTags(work.software),
    related: mergeRelatedWorks(sameCourse, sameDiscipline, work.id, RELATED_LIMIT),
    seo: work.seo,
  }
}

/** 查询：前台可见作品的 ID（发布时间降序），用于 /works/[id] 的 generateStaticParams */
export async function queryPublishedWorkIds(payload: Payload): Promise<number[]> {
  const { docs } = await payload.find({
    collection: 'works',
    where: visible,
    select: {},
    depth: 0,
    sort: WORK_SORT,
    pagination: false,
  })
  return docs.map((doc) => doc.id)
}

/** 查询：作品页面设置（全局 work-pages），缺省值见 src/globals/work-pages-defaults.ts */
export async function queryWorkPagesSettings(payload: Payload): Promise<WorkPagesSettings> {
  const doc = await payload.findGlobal({ slug: 'work-pages', depth: 1 })
  const D = WORK_PAGES_DEFAULTS
  return {
    list: {
      title: doc.list?.title?.trim() || D.list.title,
      description: optionalText(doc.list?.description, D.list.description),
      seo: doc.list?.seo ?? null,
    },
    detail: {
      ctaTitle: doc.detail?.ctaTitle?.trim() || D.detail.ctaTitle,
      ctaDescription: optionalText(doc.detail?.ctaDescription, D.detail.ctaDescription),
    },
  }
}

// ───────────────────────── 缓存版本（页面使用） ─────────────────────────

const tags = (...slugs: string[]) => [...new Set(slugs.map(cacheTags.collection))]

/** 作品列表：作品、专业方向（名称 / 发布状态 / 排序）、软件、封面 */
const WORK_LIST_TAGS = tags('works', 'disciplines', 'software', 'media')

/** 作品详情：另加课程（所属课程是否可访问、名称 / slug） */
const WORK_DETAIL_TAGS = tags('works', 'disciplines', 'courses', 'software', 'media')

/**
 * 作品列表的数据（缓存）：全部作品卡片 + 筛选项来源。页面渲染时按 searchParams 过滤与分页，
 * 不同筛选组合共用这一份缓存。
 */
export const getWorkList = unstable_cache(
  async (): Promise<WorkListData> => queryWorkList(await getPayloadClient()),
  ['work-list'],
  { tags: WORK_LIST_TAGS },
)

const cachedWorkDetail = unstable_cache(
  async (id: number): Promise<WorkDetail | null> => queryWorkDetail(await getPayloadClient(), id),
  ['work-detail'],
  { tags: WORK_DETAIL_TAGS },
)

/**
 * 作品详情（缓存）。参数是路由里的原始字符串：不是不带前导 0 的正整数时直接返回 null（不查库），
 * 作品不存在 / 未发布 / 未授权也返回 null → 页面 notFound()。
 */
export async function getWorkDetail(id: string): Promise<WorkDetail | null> {
  const workId = parseWorkId(id)
  if (workId === null) return null
  return cachedWorkDetail(workId)
}

/** 前台可见作品的 ID（缓存），用于 /works/[id] 的 generateStaticParams（转成字符串） */
export const getPublishedWorkIds = unstable_cache(
  async (): Promise<number[]> => queryPublishedWorkIds(await getPayloadClient()),
  ['published-work-ids'],
  { tags: tags('works') },
)

/** 作品页面设置（缓存）：列表页标题 / 简介 / SEO、详情页行动号召 */
export const getWorkPagesSettings = unstable_cache(
  async (): Promise<WorkPagesSettings> => queryWorkPagesSettings(await getPayloadClient()),
  ['work-pages-settings'],
  { tags: [cacheTags.global('work-pages'), cacheTags.collection('media')] },
)
