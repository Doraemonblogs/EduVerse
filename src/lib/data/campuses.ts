import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { CAMPUS_PAGES_DEFAULTS } from '@/globals/campus-pages-defaults'
import { cacheTags } from '@/hooks/revalidate'
import { toCampusCard, toCampusDetailBase } from '@/lib/campuses/mappers'
import type {
  CampusCardData,
  CampusCohortItem,
  CampusDetail,
  CampusPagesSettings,
} from '@/lib/campuses/types'
import { relationId, sortCohorts, toCohortItem } from '@/lib/course/mappers'
import type { CohortCourseRef } from '@/lib/course/types'
import { findCourseCards, optionalText } from '@/lib/data/courses'
import { findTeacherListItems } from '@/lib/data/teachers'
import { getPayloadClient } from '@/lib/payload'
import { isValidSlug } from '@/lib/search-params'

import { loadIfKnown } from './known-key'

/**
 * 校区的数据查询：校区列表、校区详情、校区页面设置。
 *
 * 两层导出（同 src/lib/data/courses.ts）：`query*(payload, …)` 供集成测试直接调用；
 * `get*(…)` 是页面使用的缓存版本。
 *
 * 草稿与隐私：Local API 默认 overrideAccess=true——
 * - 校区一律过滤 `_status: published`（草稿校区不出现在列表，详情返回 null）；
 * - 在此开课的课程只含可公开访问的课程（已发布、且所属专业方向已发布，findCourseCards）；
 * - 开班计划不含“已结束”，只保留可公开访问课程的开班（课程未发布 / 专业方向未发布的剔除）；
 * - 讲师只含已发布的（findTeacherListItems）。
 * 只读取前台展示需要的字段，不涉及线索、用户等数据。
 *
 * 时间：缓存里存全部未结束的开班，页面渲染时用 upcomingCohorts(cohorts, new Date()) 过滤。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 校区卡片用到的校区字段（mappers 读取这些字段，增删时同步） */
const CAMPUS_CARD_SELECT = {
  name: true,
  slug: true,
  city: true,
  address: true,
  phone: true,
  openingHours: true,
  cover: true,
  location: true,
} as const

/** 开班计划填充校区时取用到的字段（toCohortItem 判断发布状态并输出名称 / slug / 城市 / 地址） */
const COHORT_CAMPUS_POPULATE = {
  name: true,
  slug: true,
  city: true,
  citySlug: true,
  address: true,
  order: true,
  _status: true,
} as const

/** 查询：全部已发布的校区卡片（后台排序 → ID） */
export async function queryCampusCards(payload: Payload): Promise<CampusCardData[]> {
  const { docs } = await payload.find({
    collection: 'campuses',
    where: published,
    select: CAMPUS_CARD_SELECT,
    depth: 1,
    sort: ['order', 'id'],
    pagination: false,
  })
  return docs.map(toCampusCard)
}

/**
 * 校区的未结束开班（按开班日期升序），只保留可公开访问课程的开班，并带上课程名称 / slug / 专业方向 ID
 */
async function findCampusCohorts(payload: Payload, campusId: number): Promise<CampusCohortItem[]> {
  const { docs } = await payload.find({
    collection: 'cohorts',
    where: { and: [{ campus: { equals: campusId } }, { status: { not_equals: 'closed' } }] },
    select: {
      course: true,
      campus: true,
      mode: true,
      startDate: true,
      endDate: true,
      status: true,
      note: true,
    },
    // 课程只要 ID（是否可访问下面单独查询）；校区要判断是否已发布
    populate: { courses: {}, campuses: COHORT_CAMPUS_POPULATE },
    depth: 1,
    sort: 'startDate',
    pagination: false,
  })
  const courseIds = [
    ...new Set(docs.map((doc) => relationId(doc.course)).filter((id): id is number => id !== null)),
  ]
  if (courseIds.length === 0) return []

  const courses = await payload.find({
    collection: 'courses',
    where: {
      and: [
        { id: { in: courseIds } },
        published,
        { 'discipline._status': { equals: 'published' } },
      ],
    },
    select: { title: true, slug: true, discipline: true },
    depth: 0,
    pagination: false,
  })
  const reachable = new Map<number, CohortCourseRef>()
  for (const course of courses.docs) {
    const disciplineId = relationId(course.discipline)
    if (disciplineId === null) continue
    reachable.set(course.id, {
      id: course.id,
      slug: course.slug,
      title: course.title,
      disciplineId,
    })
  }

  const items: CampusCohortItem[] = []
  for (const doc of docs) {
    const courseId = relationId(doc.course)
    const course = courseId === null ? undefined : reachable.get(courseId)
    const item = toCohortItem(doc)
    if (course && item) items.push({ ...item, course })
  }
  return sortCohorts(items)
}

/** 查询：校区详情；校区不存在或未发布时返回 null */
export async function queryCampusDetail(
  payload: Payload,
  slug: string,
): Promise<CampusDetail | null> {
  const { docs } = await payload.find({
    collection: 'campuses',
    where: { and: [published, { slug: { equals: slug } }] },
    // depth 1：封面、环境照片、分享图；“开设课程”是 join 字段，下面单独查询（要按发布状态过滤）
    depth: 1,
    joins: false,
    limit: 1,
    pagination: false,
  })
  const campus = docs[0]
  if (!campus) return null

  const [courses, cohorts, teachers] = await Promise.all([
    findCourseCards(payload, { campuses: { in: [campus.id] } }),
    findCampusCohorts(payload, campus.id),
    findTeacherListItems(payload, { campus: { equals: campus.id } }),
  ])

  return {
    ...toCampusDetailBase(campus),
    courses,
    cohorts,
    teachers,
    seo: campus.seo,
  }
}

/** 查询：已发布校区的 slug（后台排序），用于 /campuses/[slug] 的 generateStaticParams */
export async function queryPublishedCampusSlugs(payload: Payload): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'campuses',
    where: published,
    select: { slug: true },
    depth: 0,
    sort: ['order', 'id'],
    pagination: false,
  })
  return docs.map((doc) => doc.slug).filter(isValidSlug)
}

/** 查询：校区页面设置（全局 campus-pages），缺省值见 src/globals/campus-pages-defaults.ts */
export async function queryCampusPagesSettings(payload: Payload): Promise<CampusPagesSettings> {
  const doc = await payload.findGlobal({ slug: 'campus-pages', depth: 1 })
  const D = CAMPUS_PAGES_DEFAULTS
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

/** 校区列表：校区、封面 */
const CAMPUS_LIST_TAGS = tags('campuses', 'media')

/**
 * 校区详情：校区、在此开课的课程（课程卡片依赖课程 / 专业方向 / 校区 / 开班）、开班计划、
 * 讲师（含专业方向）、媒体
 */
const CAMPUS_DETAIL_TAGS = tags(
  'campuses',
  'courses',
  'disciplines',
  'cohorts',
  'teachers',
  'media',
)

/** 校区列表的数据（缓存）：全部已发布校区卡片 */
export const getCampusCards = unstable_cache(
  async (): Promise<CampusCardData[]> => queryCampusCards(await getPayloadClient()),
  ['campus-cards'],
  { tags: CAMPUS_LIST_TAGS },
)

const cachedCampusDetail = unstable_cache(
  async (slug: string): Promise<CampusDetail | null> =>
    queryCampusDetail(await getPayloadClient(), slug),
  ['campus-detail'],
  { tags: CAMPUS_DETAIL_TAGS },
)

/** 校区详情（缓存）；slug 不合法、校区不存在或未发布时返回 null → 页面 notFound() */
export async function getCampusDetail(slug: string): Promise<CampusDetail | null> {
  if (!isValidSlug(slug)) return null
  // 不在已发布清单中的 slug 不进入按 slug 的缓存（见 ./known-key.ts）
  return loadIfKnown(slug, getPublishedCampusSlugs, cachedCampusDetail)
}

/** 已发布校区的 slug（缓存），用于 /campuses/[slug] 的 generateStaticParams */
export const getPublishedCampusSlugs = unstable_cache(
  async (): Promise<string[]> => queryPublishedCampusSlugs(await getPayloadClient()),
  ['published-campus-slugs'],
  { tags: tags('campuses') },
)

/** 校区页面设置（缓存）：列表页标题 / 简介 / SEO、详情页结尾行动号召 */
export const getCampusPagesSettings = unstable_cache(
  async (): Promise<CampusPagesSettings> => queryCampusPagesSettings(await getPayloadClient()),
  ['campus-pages-settings'],
  { tags: [cacheTags.global('campus-pages'), cacheTags.collection('media')] },
)
