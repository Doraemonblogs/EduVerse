import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { LINKABLE_COLLECTIONS } from '@/components/common/rich-text'
import { TEACHER_PAGES_DEFAULTS } from '@/globals/teacher-pages-defaults'
import { cacheTags } from '@/hooks/revalidate'
import { toTeacherCard } from '@/lib/course/mappers'
import {
  DISCIPLINE_REF_SELECT,
  findCourseCards,
  guardCourseLinks,
  optionalText,
  queryDisciplineRefs,
} from '@/lib/data/courses'
import { findWorkCards } from '@/lib/data/works'
import { imageSource } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { isValidSlug } from '@/lib/search-params'
import {
  publishedDisciplines,
  toTeacherCampus,
  toTeacherExperience,
  toTeacherListItem,
} from '@/lib/teachers/mappers'
import type {
  TeacherDetail,
  TeacherListData,
  TeacherListItem,
  TeacherPagesSettings,
} from '@/lib/teachers/types'

/**
 * 师资的数据查询：讲师列表（含筛选项来源）、讲师详情、师资页面设置。
 *
 * 两层导出（同 src/lib/data/courses.ts）：`query*(payload, …)` 供集成测试直接调用；
 * `get*(…)` 是页面使用的缓存版本。
 *
 * 草稿与隐私：Local API 默认 overrideAccess=true——
 * - 讲师一律过滤 `_status: published`（草稿讲师不出现在列表，详情返回 null）；
 * - 填充进来的专业方向、校区按 `_status` 再过滤；
 * - 授课课程只含已发布、且所属专业方向已发布的课程（findCourseCards）；
 * - 学员作品只含已发布、且已确认授权的（findWorkCards）；
 * - 个人简介里指向不可访问课程的链接只渲染文字（guardCourseLinks）。
 * 只读取前台展示需要的字段，不涉及线索、用户等数据。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 讲师卡片用到的讲师字段（mappers 读取这些字段，增删时同步） */
const TEACHER_LIST_SELECT = {
  name: true,
  slug: true,
  title: true,
  avatar: true,
  disciplines: true,
  yearsOfExperience: true,
  specialties: true,
  order: true,
} as const

/**
 * 填充校区时取用到的字段。populate 对整次查询生效，个人简介里链接 / 关联到的校区也按它取字段：
 * 必须含 slug（富文本的 docHref 靠它生成 /campuses/<slug>，缺了链接只渲染文字、关联块不渲染）。
 */
const CAMPUS_POPULATE = { name: true, slug: true, city: true, _status: true } as const

/** 讲师详情页的作品数量上限 */
const TEACHER_WORKS_LIMIT = 8

/**
 * 已发布讲师的列表卡片（where 为附加条件，null 表示全部），后台排序 → ID。
 * 校区详情（src/lib/data/campuses.ts）也用它查询“本校区讲师”。
 */
export async function findTeacherListItems(
  payload: Payload,
  where: Where | null,
): Promise<TeacherListItem[]> {
  const { docs } = await payload.find({
    collection: 'teachers',
    where: where ? { and: [published, where] } : published,
    select: TEACHER_LIST_SELECT,
    populate: { disciplines: DISCIPLINE_REF_SELECT },
    depth: 1,
    sort: ['order', 'id'],
    pagination: false,
  })
  return docs.map(toTeacherListItem)
}

/** 查询：全部已发布的讲师卡片（后台排序 → ID） */
export function queryTeacherCards(payload: Payload): Promise<TeacherListItem[]> {
  return findTeacherListItems(payload, null)
}

/**
 * 查询：讲师列表 /teachers 的数据——全部已发布讲师（后台排序）+ 筛选项来源（已发布的专业方向，后台排序）。
 * 页面渲染时：parseTeacherFilters → filterTeachers；筛选栏用 buildTeacherFilterRows(teachers, filters, disciplines)。
 */
export async function queryTeacherList(payload: Payload): Promise<TeacherListData> {
  const [teachers, disciplines] = await Promise.all([
    queryTeacherCards(payload),
    queryDisciplineRefs(payload),
  ])
  return { teachers, disciplines }
}

/** 查询：讲师详情；讲师不存在或未发布时返回 null */
export async function queryTeacherDetail(
  payload: Payload,
  slug: string,
): Promise<TeacherDetail | null> {
  const { docs } = await payload.find({
    collection: 'teachers',
    where: { and: [published, { slug: { equals: slug } }] },
    // depth 1：头像、分享图、专业方向、校区，以及个人简介里的站内链接 / 图片
    populate: { disciplines: DISCIPLINE_REF_SELECT, campuses: CAMPUS_POPULATE },
    depth: 1,
    // “授课课程”是 join 字段，下面单独查询（要按课程与专业方向的发布状态过滤）
    joins: false,
    limit: 1,
    pagination: false,
  })
  const teacher = docs[0]
  if (!teacher) return null

  const [courses, bio] = await Promise.all([
    findCourseCards(payload, { teachers: { in: [teacher.id] } }),
    guardCourseLinks(payload, teacher.bio ?? null),
  ])
  const courseIds = courses.map((course) => course.id)
  const works =
    courseIds.length > 0
      ? await findWorkCards(payload, { course: { in: courseIds } }, TEACHER_WORKS_LIMIT)
      : []

  const card = toTeacherCard(teacher)
  return {
    id: card.id,
    slug: card.slug,
    name: card.name,
    title: card.title,
    avatar: imageSource(teacher.avatar, 'card'),
    shareImage: imageSource(teacher.avatar, 'og'),
    yearsOfExperience: card.yearsOfExperience,
    campus: toTeacherCampus(teacher.campus),
    disciplines: publishedDisciplines(teacher.disciplines),
    specialties: card.specialties,
    bio,
    experience: toTeacherExperience(teacher.experience),
    courses,
    works,
    seo: teacher.seo,
  }
}

/** 查询：已发布讲师的 slug，用于 /teachers/[slug] 的 generateStaticParams */
export async function queryPublishedTeacherSlugs(payload: Payload): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'teachers',
    where: published,
    select: { slug: true },
    depth: 0,
    sort: ['order', 'id'],
    pagination: false,
  })
  return docs.map((doc) => doc.slug).filter(isValidSlug)
}

/** 查询：师资页面设置（全局 teacher-pages），缺省值见 src/globals/teacher-pages-defaults.ts */
export async function queryTeacherPagesSettings(payload: Payload): Promise<TeacherPagesSettings> {
  const doc = await payload.findGlobal({ slug: 'teacher-pages', depth: 1 })
  const D = TEACHER_PAGES_DEFAULTS
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

/** 讲师列表：讲师、专业方向（名称 / 发布状态 / 排序）、头像 */
const TEACHER_LIST_TAGS = tags('teachers', 'disciplines', 'media')

/**
 * 讲师详情：讲师、专业方向、校区、授课课程（课程卡片依赖课程 / 开班 / 校区）、作品、软件、媒体、
 * 站点设置，另加个人简介（富文本）里可链接的全部集合
 */
const TEACHER_DETAIL_TAGS = [
  ...new Set([
    ...tags(
      'teachers',
      'disciplines',
      'courses',
      'cohorts',
      'campuses',
      'software',
      'works',
      'media',
    ),
    ...LINKABLE_COLLECTIONS.map(cacheTags.collection),
    cacheTags.global('site-settings'),
  ]),
]

/** 讲师列表的数据（缓存）：全部讲师 + 筛选项来源。页面渲染时按 searchParams 过滤 */
export const getTeacherList = unstable_cache(
  async (): Promise<TeacherListData> => queryTeacherList(await getPayloadClient()),
  ['teacher-list'],
  { tags: TEACHER_LIST_TAGS },
)

const cachedTeacherDetail = unstable_cache(
  async (slug: string): Promise<TeacherDetail | null> =>
    queryTeacherDetail(await getPayloadClient(), slug),
  ['teacher-detail'],
  { tags: TEACHER_DETAIL_TAGS },
)

/** 讲师详情（缓存）；slug 不合法、讲师不存在或未发布时返回 null → 页面 notFound() */
export async function getTeacherDetail(slug: string): Promise<TeacherDetail | null> {
  if (!isValidSlug(slug)) return null
  return cachedTeacherDetail(slug)
}

/** 已发布讲师的 slug（缓存），用于 /teachers/[slug] 的 generateStaticParams */
export const getPublishedTeacherSlugs = unstable_cache(
  async (): Promise<string[]> => queryPublishedTeacherSlugs(await getPayloadClient()),
  ['published-teacher-slugs'],
  { tags: tags('teachers') },
)

/** 师资页面设置（缓存）：列表页标题 / 简介 / SEO、详情页结尾行动号召 */
export const getTeacherPagesSettings = unstable_cache(
  async (): Promise<TeacherPagesSettings> => queryTeacherPagesSettings(await getPayloadClient()),
  ['teacher-pages-settings'],
  { tags: [cacheTags.global('teacher-pages'), cacheTags.collection('media')] },
)
