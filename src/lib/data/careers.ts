import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { LINKABLE_COLLECTIONS } from '@/components/common/rich-text'
import { CAREERS_PAGE_DEFAULTS } from '@/globals/careers-page-defaults'
import { cacheTags } from '@/hooks/revalidate'
import { toCareerEvent, toCareerProcessSteps, toCareersHeroBanner } from '@/lib/careers/mappers'
import type {
  CareerEvent,
  CareerPartner,
  CareersHeroBanner,
  CareersPageData,
  CareersSection,
  CareerStory,
} from '@/lib/careers/types'
import { beijingDayStart } from '@/lib/course/cohorts'
import { guardCourseLinks, optionalText, queryCourseCards } from '@/lib/data/courses'
import { toHomePartner, toHomeStory } from '@/lib/home/mappers'
import { toSectionHeading } from '@/lib/home/rules'
import type { HomeSectionHeading } from '@/lib/home/types'
import { getPayloadClient } from '@/lib/payload'

/**
 * 就业服务页（/careers）的数据查询：按后台「就业服务页」（全局 careers-page）组装各区块的视图模型，
 * 首屏背景图取自后台「轮播图」（投放位置 = 就业服务页顶部）。
 *
 * 两层导出（同 src/lib/data/courses.ts）：
 * - `queryCareersPageData(payload, now?)`：查询函数，集成测试直接调用；
 * - `getCareersPageData()`：页面使用的缓存版本。招聘活动缓存的是查询时尚未过去的活动，
 *   页面渲染时再用 upcomingCareerEvents(items, new Date()) 过滤；首屏背景图缓存的是全部已启用的候选，
 *   渲染时再用 liveCareersHeroBanner(heroBanners, new Date()) 按投放时间窗挑选（页面 revalidate 保证按时更新）。
 *
 * 草稿、授权与隐私：Local API 默认 overrideAccess=true——
 * - 学员故事过滤 `_status: published` 且 `consentConfirmed = true`；站点设置 showStories 关闭时不查询、不输出；
 *   所属课程只在可公开访问时给出；不输出任何薪资（故事集合本身没有薪资字段）；正文经 guardCourseLinks；
 * - 合作企业不输出官网地址，没有 Logo 的不展示；
 * - 招聘活动的举办校区只在已发布时给出（可链接）。
 * 只读取前台展示需要的字段，不涉及线索、用户等数据。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

const D = CAREERS_PAGE_DEFAULTS
const S = D.sections

/** 学员故事、合作企业的数量上限（页面一次展示完，不分页；故事上限写在后台「就业服务页」学员故事标签页的说明里，改动时同步） */
export const CAREERS_LIMITS = { stories: 12, partners: 48 } as const

/** 学员故事：已发布、且已确认学员授权 */
const visibleStory = {
  and: [published, { consentConfirmed: { equals: true } }],
} as const satisfies Where

async function findShowStories(payload: Payload): Promise<boolean> {
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    select: { showStories: true },
    depth: 0,
  })
  // 从未保存过时按后台默认值（展示）处理
  return settings.showStories !== false
}

/** 学员故事：精选在前，其后按后台排序 → ID；所属课程只在可公开访问时给出 */
async function findCareerStories(payload: Payload): Promise<CareerStory[]> {
  const [{ docs }, courses] = await Promise.all([
    payload.find({
      collection: 'stories',
      where: visibleStory,
      select: {
        displayName: true,
        background: true,
        avatar: true,
        course: true,
        currentRole: true,
        companyName: true,
        partner: true,
        quote: true,
        story: true,
        featured: true,
        order: true,
      },
      // depth 1：头像、合作企业名称、正文里的站内链接 / 关联 / 图片。
      // populate 对整次查询生效：课程必须含 title、slug、_status（正文链接要用），
      // 所属课程是否可访问按 queryCourseCards 判断
      populate: {
        courses: { title: true, slug: true, _status: true },
        partners: { name: true },
      },
      depth: 1,
      sort: ['-featured', 'order', 'id'],
      limit: CAREERS_LIMITS.stories,
      pagination: false,
    }),
    queryCourseCards(payload),
  ])
  const reachable = new Map(courses.map((course) => [course.id, course]))
  return Promise.all(
    docs.map(async (doc) => ({
      ...toHomeStory(doc, reachable),
      story: doc.story ? await guardCourseLinks(payload, doc.story) : null,
    })),
  )
}

/** 合作企业 Logo（按排序；没有 Logo 的不展示） */
async function findCareerPartners(payload: Payload): Promise<CareerPartner[]> {
  const { docs } = await payload.find({
    collection: 'partners',
    select: { name: true, industry: true, logo: true },
    depth: 1,
    sort: ['order', 'id'],
    limit: CAREERS_LIMITS.partners,
    pagination: false,
  })
  return docs.map(toHomePartner).filter((partner): partner is CareerPartner => partner !== null)
}

/** 尚未过去的招聘活动：活动时间 ≥ now 所在北京日期的 0 点，按时间升序 */
async function findCareerEvents(payload: Payload, now: Date): Promise<CareerEvent[]> {
  const { docs } = await payload.find({
    collection: 'career-events',
    where: { date: { greater_than_equal: new Date(beijingDayStart(now)).toISOString() } },
    select: {
      title: true,
      date: true,
      location: true,
      campus: true,
      image: true,
      description: true,
      registrationNote: true,
    },
    populate: { campuses: { name: true, slug: true, city: true, address: true, _status: true } },
    depth: 1,
    sort: ['date', 'id'],
    pagination: false,
  })
  return docs.map(toCareerEvent)
}

/**
 * 首屏背景图的候选：全部已启用的“就业服务页顶部”轮播图（按排序 → ID；没有桌面图的剔除）。
 * 不按时间过滤（缓存里存全部候选，渲染时再按投放时间窗挑选，见 liveCareersHeroBanner）。
 * 只读取图片与时间窗：轮播图的标题、按钮在就业服务页不展示。
 */
async function findCareersHeroBanners(payload: Payload): Promise<CareersHeroBanner[]> {
  const { docs } = await payload.find({
    collection: 'banners',
    where: { and: [{ placement: { equals: 'careers_hero' } }, { active: { equals: true } }] },
    select: { image: true, mobileImage: true, startAt: true, endAt: true },
    depth: 1,
    sort: ['order', 'id'],
    pagination: false,
  })
  return docs
    .map(toCareersHeroBanner)
    .filter((banner): banner is CareersHeroBanner => banner !== null)
}

const section = <T>(heading: HomeSectionHeading | null, items: T[]): CareersSection<T> | null =>
  heading && items.length > 0 ? { heading, items } : null

/**
 * 查询：就业服务页全部区块的数据（区块关闭或没有内容时为 null；招聘活动开启时总是存在）。
 * now 决定招聘活动的起始日期（默认查询时间）。
 */
export async function queryCareersPageData(
  payload: Payload,
  now: Date = new Date(),
): Promise<CareersPageData> {
  const [page, showStories, heroBanners] = await Promise.all([
    payload.findGlobal({ slug: 'careers-page', depth: 1 }),
    findShowStories(payload),
    findCareersHeroBanners(payload),
  ])

  const headings = {
    process: toSectionHeading(page.process, S.process),
    stories: showStories ? toSectionHeading(page.stories, S.stories) : null,
    partners: toSectionHeading(page.partners, S.partners),
    events: toSectionHeading(page.events, S.events),
  }

  const [stories, partners, events] = await Promise.all([
    headings.stories ? findCareerStories(payload) : [],
    headings.partners ? findCareerPartners(payload) : [],
    headings.events ? findCareerEvents(payload, now) : [],
  ])

  const intro = page.intro
  const eyebrow = intro?.eyebrow === undefined ? D.intro.eyebrow : intro.eyebrow
  return {
    intro: {
      eyebrow: eyebrow?.trim() || null,
      title: intro?.title?.trim() || D.intro.title,
      description: intro?.description?.trim() || null,
    },
    heroBanners,
    process: section(headings.process, toCareerProcessSteps(page.process?.steps)),
    stories: section(headings.stories, stories),
    partners: section(headings.partners, partners),
    events: headings.events ? { heading: headings.events, items: events } : null,
    cta: {
      title: page.cta?.title?.trim() || D.cta.title,
      description: optionalText(page.cta?.description, D.cta.description),
    },
    seo: page.seo ?? null,
  }
}

// ───────────────────────── 缓存版本（页面使用） ─────────────────────────

/**
 * 就业服务页依赖：就业服务页与站点设置（学员故事总开关）两个全局，首屏背景图（轮播图）、学员故事、合作企业、
 * 招聘活动、校区、课程卡片（所属课程是否可访问）、媒体，另加故事正文（富文本）里可链接的全部集合
 */
const CAREERS_TAGS = [
  ...new Set([
    cacheTags.global('careers-page'),
    cacheTags.global('site-settings'),
    ...[
      'banners',
      'stories',
      'partners',
      'career-events',
      'campuses',
      'courses',
      'disciplines',
      'cohorts',
      'media',
      ...LINKABLE_COLLECTIONS,
    ].map(cacheTags.collection),
  ]),
]

/**
 * 就业服务页数据（缓存）。渲染时还要用 upcomingCareerEvents(events.items, new Date()) 过滤招聘活动、
 * 用 liveCareersHeroBanner(heroBanners, new Date()) 挑选首屏背景图；
 * 页面须设置 `export const revalidate = 3600`，让过期的活动按时消失、背景图按投放时间窗切换。
 * 缓存本身也每小时过期一次：查询时的“今天”会随之更新。
 */
export const getCareersPageData = unstable_cache(
  async (): Promise<CareersPageData> => queryCareersPageData(await getPayloadClient()),
  ['careers-page-data'],
  { tags: CAREERS_TAGS, revalidate: 3600 },
)
