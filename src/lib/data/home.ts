import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { siteFallback } from '@/config/site'
import { HOME_PAGE_DEFAULTS } from '@/globals/home-page-defaults'
import { cacheTags } from '@/hooks/revalidate'
import { relationId } from '@/lib/course/mappers'
import type { CourseCardData } from '@/lib/course/types'
import { queryCourseCards } from '@/lib/data/courses'
import { queryTeacherCards } from '@/lib/data/teachers'
import { findWorkCards } from '@/lib/data/works'
import {
  articleCategoryOf,
  toHomeArticle,
  toHomeBanner,
  toHomeCampus,
  toHomeDiscipline,
  toHomePartner,
  toHomeStory,
  toQuickEntry,
} from '@/lib/home/mappers'
import {
  clampSetting,
  collectArticleCategories,
  countCoursesByDiscipline,
  HOME_LIMITS,
  liveBanners,
  pickByIds,
  pickCareerCourses,
  pickHomeTeachers,
  toSectionHeading,
} from '@/lib/home/rules'
import type {
  HomeArticlesSection,
  HomeBanner,
  HomeCampus,
  HomeDiscipline,
  HomeHeroData,
  HomeListSection,
  HomePageData,
  HomePartner,
  HomeQuickEntry,
  HomeSectionHeading,
  HomeStory,
} from '@/lib/home/types'
import { getPayloadClient } from '@/lib/payload'
import type { TeacherListItem } from '@/lib/teachers/types'
import type { WorkCardData } from '@/lib/works/types'
import type { HomePage } from '@/payload-types'

/**
 * 首页的数据查询：按后台「首页」配置（全局 home-page）组装各区块的视图模型。
 *
 * 两层导出（同 src/lib/data/courses.ts）：
 * - `queryHomePageData(payload)`：查询函数，接收 Payload 实例，集成测试直接调用；
 *   主视觉里是**全部**已启用的首页轮播图（不按时间过滤），配合 `withLiveBanners(data, now)` 使用；
 * - `getHomePageData(now?)`：页面使用的版本——缓存（unstable_cache）+ 渲染时按当前时间过滤轮播图时间窗
 *   （缓存里存全部已启用的轮播图；首页 `revalidate` 保证时间窗到点后重新渲染）。
 *
 * 草稿、授权与隐私：Local API 默认 overrideAccess=true——
 * - 专业方向、校区、文章、学员故事一律过滤 `_status: published`；
 * - 课程复用 queryCourseCards（课程与所属专业方向都已发布，校区按发布状态过滤）；
 * - 作品复用 findWorkCards（已发布且 consentConfirmed）；讲师复用 queryTeacherCards（已发布）；
 * - 学员故事还要求 consentConfirmed，站点设置 showStories 关闭时不查询、不输出；不输出正文与薪资；
 * - 合作企业不输出官网地址；后台“指定”的关联只取 ID，再按上面的条件重新查询，未发布 / 未授权的被剔除。
 * 只读取前台展示需要的字段，不涉及线索、用户等数据。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

const D = HOME_PAGE_DEFAULTS
const S = D.sections

/** 后台“指定”的关联只取 ID（populate 为空对象时不填充文档，避免读出草稿内容） */
const ID_ONLY = {} as const

/** 关联字段数组 → ID 列表（已填充或未填充都可以），跳过空值 */
function relationIds(
  values: readonly (number | { id: number } | null | undefined)[] | null | undefined,
) {
  return (values ?? []).map(relationId).filter((id): id is number => id !== null)
}

type SectionOf<K extends keyof HomePage> = HomePage[K]

async function findHomePageGlobal(payload: Payload) {
  return payload.findGlobal({
    slug: 'home-page',
    // depth 1：快速了解的配图；各“指定”关联只要 ID（见 ID_ONLY）
    depth: 1,
    populate: {
      disciplines: ID_ONLY,
      courses: ID_ONLY,
      works: ID_ONLY,
      stories: ID_ONLY,
      teachers: ID_ONLY,
    },
  })
}

async function findSiteBasics(payload: Payload) {
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    select: { brandName: true, showStories: true },
    depth: 0,
  })
  return {
    brandName: settings.brandName?.trim() || siteFallback.name,
    // 从未保存过时按后台默认值（展示）处理
    showStories: settings.showStories !== false,
  }
}

/**
 * 全部已启用的首页主视觉轮播图（按排序；不按时间过滤，也不限数量——
 * 数量上限在渲染时按时间窗过滤之后再截取，见 liveBanners）
 */
async function findHeroBanners(payload: Payload): Promise<HomeBanner[]> {
  const { docs } = await payload.find({
    collection: 'banners',
    where: { and: [{ placement: { equals: 'home_hero' } }, { active: { equals: true } }] },
    select: {
      title: true,
      subtitle: true,
      ctaLabel: true,
      href: true,
      image: true,
      mobileImage: true,
      startAt: true,
      endAt: true,
    },
    depth: 1,
    sort: ['order', 'id'],
    pagination: false,
  })
  return docs.map(toHomeBanner).filter((banner): banner is HomeBanner => banner !== null)
}

function heroData(section: SectionOf<'hero'> | undefined, banners: HomeBanner[]): HomeHeroData {
  const seconds = clampSetting(section?.interval, {
    fallback: D.hero.interval,
    min: D.hero.minInterval,
    max: 60,
  })
  return {
    autoplay: section?.autoplay ?? D.hero.autoplay,
    intervalMs: seconds * 1000,
    banners,
  }
}

const listSection = <T>(heading: HomeSectionHeading | null, items: T[]) =>
  heading && items.length > 0 ? { heading, items } : null

function quickEntriesSection(
  section: SectionOf<'quickEntries'> | undefined,
): HomeListSection<HomeQuickEntry> | null {
  const heading = toSectionHeading(section, S.quickEntries)
  const items = (section?.items ?? [])
    .map(toQuickEntry)
    .filter((item): item is HomeQuickEntry => item !== null)
  return listSection(heading, items)
}

const DISCIPLINE_SELECT = {
  name: true,
  shortName: true,
  slug: true,
  tagline: true,
  cover: true,
} as const

/** 热门专业：指定专业（按所选顺序）→ 否则已发布且在导航中显示的专业（按排序，最多 8 个） */
async function findHotDisciplines(
  payload: Payload,
  ids: number[],
  courses: readonly CourseCardData[],
): Promise<HomeDiscipline[]> {
  const counts = countCoursesByDiscipline(courses)
  const find = async (where: Where, limit?: number) => {
    const { docs } = await payload.find({
      collection: 'disciplines',
      where: { and: [published, where] },
      select: DISCIPLINE_SELECT,
      depth: 1,
      sort: ['order', 'id'],
      pagination: false,
      ...(limit ? { limit } : {}),
    })
    return docs.map((doc) => toHomeDiscipline(doc, counts.get(doc.id) ?? 0))
  }
  if (ids.length > 0) {
    const chosen = pickByIds(await find({ id: { in: ids } }), ids)
    if (chosen.length > 0) return chosen
  }
  return find({ showInNav: { equals: true } }, HOME_LIMITS.disciplines)
}

/** 精选课程：指定课程（按所选顺序）→ 否则每个专业方向排序最靠前的长期就业班 */
function pickHomeCourses(ids: number[], courses: readonly CourseCardData[]): CourseCardData[] {
  const chosen = pickByIds(courses, ids, HOME_LIMITS.courses)
  return chosen.length > 0 ? chosen : pickCareerCourses(courses, HOME_LIMITS.courses)
}

/**
 * 学员作品：manual 时指定作品（按所选顺序）；auto（或指定的全部不可用）时只取精选作品
 * （发布时间降序，最多 limit 件）。精选作品不足 limit 件时有多少展示多少，不用非精选作品补足——
 * 后台选项就是“自动取精选作品”，编辑没有挑选过的作品不上首页；一件精选都没有时区块不渲染。
 */
async function findHomeWorks(
  payload: Payload,
  section: SectionOf<'featuredWorks'> | undefined,
): Promise<WorkCardData[]> {
  const limit = clampSetting(section?.limit, {
    fallback: D.featuredWorks.limit,
    min: D.featuredWorks.min,
    max: D.featuredWorks.max,
  })
  if (section?.mode === 'manual') {
    const ids = relationIds(section.works)
    if (ids.length > 0) {
      const chosen = pickByIds(await findWorkCards(payload, { id: { in: ids } }), ids, limit)
      if (chosen.length > 0) return chosen
    }
  }
  return findWorkCards(payload, { featured: { equals: true } }, limit)
}

/** 学员故事：已发布、且已确认学员授权 */
const visibleStory = {
  and: [published, { consentConfirmed: { equals: true } }],
} as const satisfies Where

/** 学员故事：指定故事（按所选顺序）→ 否则精选故事（按排序），最多 8 个 */
async function findHomeStories(
  payload: Payload,
  ids: number[],
  courses: readonly CourseCardData[],
): Promise<HomeStory[]> {
  const reachable = new Map(courses.map((course) => [course.id, course]))
  const find = async (where: Where, limit?: number) => {
    const { docs } = await payload.find({
      collection: 'stories',
      where: { and: [visibleStory, where] },
      select: {
        displayName: true,
        background: true,
        avatar: true,
        course: true,
        currentRole: true,
        companyName: true,
        partner: true,
        quote: true,
      },
      // 课程只要 ID（是否可访问按 reachable 判断）；合作企业只取名称
      populate: { courses: ID_ONLY, partners: { name: true } },
      depth: 1,
      sort: ['order', 'id'],
      pagination: false,
      ...(limit ? { limit } : {}),
    })
    return docs.map((doc) => toHomeStory(doc, reachable))
  }
  if (ids.length > 0) {
    const chosen = pickByIds(await find({ id: { in: ids } }), ids, HOME_LIMITS.stories)
    if (chosen.length > 0) return chosen
  }
  return find({ featured: { equals: true } }, HOME_LIMITS.stories)
}

/** 师资：指定讲师（按所选顺序，最多 8 位）→ 否则精选讲师在前、按排序补足（pickHomeTeachers） */
async function findHomeTeachers(payload: Payload, ids: number[]): Promise<TeacherListItem[]> {
  const all = await queryTeacherCards(payload)
  if (ids.length > 0) {
    const chosen = pickByIds(all, ids, HOME_LIMITS.teachers.max)
    if (chosen.length > 0) return chosen
  }
  const { docs } = await payload.find({
    collection: 'teachers',
    where: { and: [published, { featured: { equals: true } }] },
    select: {},
    depth: 0,
    pagination: false,
  })
  const featuredIds = new Set(docs.map((doc) => doc.id))
  return pickHomeTeachers(
    all.filter((teacher) => featuredIds.has(teacher.id)),
    all.filter((teacher) => !featuredIds.has(teacher.id)),
  )
}

/** 已发布的校区（按排序） */
async function findHomeCampuses(payload: Payload): Promise<HomeCampus[]> {
  const { docs } = await payload.find({
    collection: 'campuses',
    where: published,
    select: {
      name: true,
      slug: true,
      city: true,
      address: true,
      phone: true,
      openingHours: true,
      cover: true,
      location: true,
    },
    depth: 1,
    sort: ['order', 'id'],
    limit: HOME_LIMITS.campuses,
    pagination: false,
  })
  return docs.map(toHomeCampus)
}

/** 合作企业 Logo（按排序；没有 Logo 的不展示） */
async function findHomePartners(payload: Payload): Promise<HomePartner[]> {
  const { docs } = await payload.find({
    collection: 'partners',
    select: { name: true, industry: true, logo: true },
    depth: 1,
    sort: ['order', 'id'],
    limit: HOME_LIMITS.partners,
    pagination: false,
  })
  return docs.map(toHomePartner).filter((partner): partner is HomePartner => partner !== null)
}

/** 最新资讯：已发布文章按发布时间降序取 limit 篇，附带出现过的分类（按分类排序） */
async function findHomeArticles(
  payload: Payload,
  heading: HomeSectionHeading,
  section: SectionOf<'articles'> | undefined,
): Promise<HomeArticlesSection | null> {
  const limit = clampSetting(section?.limit, {
    fallback: D.articles.limit,
    min: D.articles.min,
    max: D.articles.max,
  })
  const { docs } = await payload.find({
    collection: 'articles',
    where: published,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
      category: true,
      cover: true,
    },
    populate: { 'article-categories': { name: true, slug: true, order: true } },
    depth: 1,
    sort: ['-publishedAt', '-id'],
    limit,
    pagination: false,
  })
  if (docs.length === 0) return null
  return {
    heading,
    items: docs.map(toHomeArticle),
    categories: collectArticleCategories(docs.map((doc) => articleCategoryOf(doc.category))),
  }
}

/** 区块关闭时不查询，直接给 null */
const when = <T>(
  heading: HomeSectionHeading | null,
  load: (heading: HomeSectionHeading) => Promise<T | null>,
): Promise<T | null> => (heading ? load(heading) : Promise.resolve(null))

/**
 * 查询：首页全部区块的数据（区块关闭或没有内容时为 null）。
 * hero.banners 是全部已启用的首页轮播图（不按时间过滤）；页面用 getHomePageData()，
 * 集成测试用 withLiveBanners(data, now) 得到渲染时的结果。
 */
export async function queryHomePageData(payload: Payload): Promise<HomePageData> {
  const [home, site, banners] = await Promise.all([
    findHomePageGlobal(payload),
    findSiteBasics(payload),
    findHeroBanners(payload),
  ])

  const headings = {
    hotDisciplines: toSectionHeading(home.hotDisciplines, S.hotDisciplines),
    courses: toSectionHeading(home.courses, S.courses),
    works: toSectionHeading(home.featuredWorks, S.featuredWorks),
    stories: site.showStories ? toSectionHeading(home.stories, S.stories) : null,
    partners: toSectionHeading(home.partners, S.partners),
    teachers: toSectionHeading(home.teachers, S.teachers),
    campuses: toSectionHeading(home.campuses, S.campuses),
    articles: toSectionHeading(home.articles, S.articles),
    leadForm: toSectionHeading(home.leadForm, S.leadForm),
  }

  // 课程卡片（可公开访问的全部课程）：精选课程、热门专业的课程数、学员故事的所学课程共用
  const needsCourses = headings.hotDisciplines || headings.courses || headings.stories
  const courses = needsCourses ? await queryCourseCards(payload) : []

  const [hotDisciplines, works, stories, partners, teachers, campuses, articles] =
    await Promise.all([
      when(headings.hotDisciplines, async (heading) =>
        listSection(
          heading,
          await findHotDisciplines(payload, relationIds(home.hotDisciplines?.disciplines), courses),
        ),
      ),
      when(headings.works, async (heading) =>
        listSection(heading, await findHomeWorks(payload, home.featuredWorks)),
      ),
      when(headings.stories, async (heading) =>
        listSection(
          heading,
          await findHomeStories(payload, relationIds(home.stories?.stories), courses),
        ),
      ),
      when(headings.partners, async (heading) =>
        listSection(heading, await findHomePartners(payload)),
      ),
      when(headings.teachers, async (heading) =>
        listSection(heading, await findHomeTeachers(payload, relationIds(home.teachers?.teachers))),
      ),
      when(headings.campuses, async (heading) =>
        listSection(heading, await findHomeCampuses(payload)),
      ),
      when(headings.articles, (heading) => findHomeArticles(payload, heading, home.articles)),
    ])

  return {
    brandName: site.brandName,
    hero: heroData(home.hero, banners),
    quickEntries: quickEntriesSection(home.quickEntries),
    hotDisciplines,
    courses: headings.courses
      ? listSection(headings.courses, pickHomeCourses(relationIds(home.courses?.courses), courses))
      : null,
    works,
    stories,
    partners,
    teachers,
    campuses,
    articles,
    leadForm: headings.leadForm
      ? {
          heading: headings.leadForm,
          submitLabel: home.leadForm?.submitLabel?.trim() || D.leadForm.submitLabel,
        }
      : null,
    seo: home.seo ?? null,
  }
}

/**
 * 渲染时的首页数据：主视觉只保留 now 时刻在投放时间窗内的轮播图（最多 HOME_LIMITS.banners 张），
 * 其余区块原样返回
 */
export function withLiveBanners(data: HomePageData, now: Date): HomePageData {
  return { ...data, hero: { ...data.hero, banners: liveBanners(data.hero.banners, now) } }
}

// ───────────────────────── 缓存版本（页面使用） ─────────────────────────

/**
 * 首页依赖：首页与站点设置两个全局，以及各区块用到的集合
 * （课程卡片依赖课程 / 专业方向 / 校区 / 开班；作品卡片依赖软件；全部图片依赖媒体）
 */
const HOME_TAGS = [
  cacheTags.global('home-page'),
  cacheTags.global('site-settings'),
  ...[
    'banners',
    'disciplines',
    'courses',
    'cohorts',
    'campuses',
    'works',
    'software',
    'stories',
    'partners',
    'teachers',
    'articles',
    'article-categories',
    'media',
  ].map(cacheTags.collection),
]

const cachedHomePageData = unstable_cache(
  async (): Promise<HomePageData> => queryHomePageData(await getPayloadClient()),
  ['home-page-data'],
  { tags: HOME_TAGS },
)

/**
 * 首页数据（缓存）。now 默认为渲染时间：主视觉只含此刻在投放时间窗内的轮播图。
 * 首页须设置 `export const revalidate = 3600`，让时间窗到点后重新渲染。
 */
export async function getHomePageData(now: Date = new Date()): Promise<HomePageData> {
  return withLiveBanners(await cachedHomePageData(), now)
}
