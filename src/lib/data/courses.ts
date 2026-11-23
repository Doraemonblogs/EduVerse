import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { LINKABLE_COLLECTIONS } from '@/components/common/rich-text'
import { COURSE_PAGES_DEFAULTS } from '@/globals/course-pages-defaults'
import { cacheTags } from '@/hooks/revalidate'
import {
  populated,
  publishedDoc,
  relationId,
  sortCohorts,
  toCareerDirections,
  toCohortItem,
  toCourseCard,
  toCourseProjects,
  toCourseStages,
  toDisciplineRef,
  toFaqItems,
  toSoftwareRefs,
  toTeacherCard,
  toTextList,
  toWorkThumb,
} from '@/lib/course/mappers'
import { collectLinkedCourseIds, hideUnreachableCourses } from '@/lib/course/rich-text-guard'
import { pickSalary } from '@/lib/course/salary'
import type {
  CohortItem,
  CourseCardData,
  CourseDetail,
  CoursePagesSettings,
  DisciplineDetail,
  TeacherCardData,
  WorkThumb,
} from '@/lib/course/types'
import { imageSource } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'

/**
 * 课程模块的数据查询：课程列表、课程详情、专业方向页、课程页面设置。
 *
 * 两层导出：
 * - `query*(payload, …)`：查询函数，接收 Payload 实例，集成测试直接调用；
 * - `get*(…)`：页面使用的缓存版本（unstable_cache + 与 Payload 钩子一致的缓存标签）。
 *
 * 草稿与隐私：Local API 默认 overrideAccess=true——
 * - 主查询一律过滤 `_status: published`；按 depth 填充进来的专业方向、校区再按 `_status` 过滤（见 mappers）；
 * - 讲师、作品单独查询并过滤已发布，作品还要求 `consentConfirmed = true`；
 * - 所属专业方向未发布的课程不出现在任何列表，详情返回 null，富文本里指向它的链接只渲染文字（guardCourseLinks）；
 * - 开班计划不含“已结束”，校区未发布的开班剔除。
 * 只读取前台展示需要的字段，不涉及线索、用户等数据。
 *
 * 时间：缓存里存全部未结束的开班，页面渲染时用 upcomingCohorts(cohorts, new Date()) 过滤。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 所属专业方向已发布：与 published 一起构成“可公开访问的课程” */
const disciplinePublished = {
  'discipline._status': { equals: 'published' },
} as const satisfies Where

/** 与后台 slug 字段一致的格式；不符合的路径直接判定不存在，不查库 */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** 填充专业方向时只取用到的字段（mappers 读取这些字段，增删时同步） */
const DISCIPLINE_POPULATE = {
  name: true,
  shortName: true,
  slug: true,
  order: true,
  salaryRef: true,
  careerDirections: true,
  _status: true,
} as const

/** 填充校区时只取用到的字段 */
const CAMPUS_POPULATE = {
  name: true,
  slug: true,
  city: true,
  citySlug: true,
  address: true,
  order: true,
  _status: true,
} as const

/** 课程卡片用到的课程字段（只有选中的关联字段会被填充：封面、专业方向、校区） */
const COURSE_CARD_SELECT = {
  title: true,
  slug: true,
  summary: true,
  cover: true,
  discipline: true,
  classType: true,
  deliveryModes: true,
  duration: true,
  schedule: true,
  campuses: true,
  stages: true,
  featured: true,
  order: true,
} as const

const TEACHER_SELECT = {
  name: true,
  slug: true,
  title: true,
  avatar: true,
  yearsOfExperience: true,
  specialties: true,
  order: true,
} as const

const WORK_SELECT = { title: true, author: true, cover: true } as const

/** 详情页“同专业其它课程”的数量 */
const RELATED_LIMIT = 3
/** 专业方向页的作品、讲师数量上限 */
const MAJOR_WORKS_LIMIT = 8
const MAJOR_TEACHERS_LIMIT = 8
/** 课程详情页的作品数量上限 */
const COURSE_WORKS_LIMIT = 12

/** 课程的未结束开班，按课程 ID 分组（每组按开班日期升序） */
async function findCohortsByCourse(
  payload: Payload,
  courseIds: number[],
): Promise<Map<number, CohortItem[]>> {
  const groups = new Map<number, CohortItem[]>()
  if (courseIds.length === 0) return groups
  const { docs } = await payload.find({
    collection: 'cohorts',
    where: { and: [{ course: { in: courseIds } }, { status: { not_equals: 'closed' } }] },
    select: {
      course: true,
      campus: true,
      mode: true,
      startDate: true,
      endDate: true,
      status: true,
      note: true,
    },
    // 课程只要 ID（不填充整份课程文档）；校区要判断是否已发布
    populate: { courses: {}, campuses: CAMPUS_POPULATE },
    depth: 1,
    sort: 'startDate',
    pagination: false,
  })
  for (const doc of docs) {
    const courseId = relationId(doc.course)
    const item = toCohortItem(doc)
    if (courseId === null || !item) continue
    const group = groups.get(courseId) ?? []
    group.push(item)
    groups.set(courseId, group)
  }
  for (const group of groups.values()) sortCohorts(group)
  return groups
}

/**
 * 已发布、且所属专业方向已发布的课程卡片。
 * 排序：专业方向排序 → 课程排序 → ID（与导航大菜单一致）。
 */
async function findCourseCards(
  payload: Payload,
  where: Where | null,
  limit?: number,
): Promise<CourseCardData[]> {
  const { docs } = await payload.find({
    collection: 'courses',
    where: {
      and: [published, disciplinePublished, ...(where ? [where] : [])],
    },
    select: COURSE_CARD_SELECT,
    populate: { disciplines: DISCIPLINE_POPULATE, campuses: CAMPUS_POPULATE },
    depth: 1,
    sort: ['order', 'id'],
    pagination: false,
    ...(limit ? { limit } : {}),
  })
  const disciplineOrder = (course: (typeof docs)[number]) =>
    populated(course.discipline)?.order ?? 0
  const sorted = [...docs].sort(
    (a, b) =>
      disciplineOrder(a) - disciplineOrder(b) || (a.order ?? 0) - (b.order ?? 0) || a.id - b.id,
  )
  const cohorts = await findCohortsByCourse(
    payload,
    sorted.map((course) => course.id),
  )
  return sorted
    .map((course) => toCourseCard(course, cohorts.get(course.id) ?? []))
    .filter((card): card is CourseCardData => card !== null)
}

/** 已发布的讲师卡片 */
async function findTeachers(
  payload: Payload,
  where: Where,
  limit?: number,
): Promise<TeacherCardData[]> {
  const { docs } = await payload.find({
    collection: 'teachers',
    where: { and: [published, where] },
    select: TEACHER_SELECT,
    depth: 1,
    sort: ['order', 'id'],
    pagination: false,
    ...(limit ? { limit } : {}),
  })
  return docs.map(toTeacherCard)
}

/** 已发布、且已确认学员授权的作品（精选在前，其后按排序与发布时间） */
async function findWorks(payload: Payload, where: Where, limit: number): Promise<WorkThumb[]> {
  const { docs } = await payload.find({
    collection: 'works',
    where: { and: [published, { consentConfirmed: { equals: true } }, where] },
    select: WORK_SELECT,
    depth: 1,
    sort: ['-featured', 'order', '-publishedAt'],
    limit,
    pagination: false,
  })
  return docs.map(toWorkThumb)
}

/** 站点设置中的薪资免责声明（必填项） */
async function findSalaryDisclaimer(payload: Payload): Promise<string | null> {
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    select: { salaryDisclaimer: true },
    depth: 0,
  })
  return settings.salaryDisclaimer ?? null
}

/**
 * 富文本里的课程链接守卫：收集 value 中全部富文本引用（站内链接 / 关联节点）的已填充课程，
 * 一次查出其中可公开访问的（已发布且所属专业方向已发布），其余标记为草稿——
 * 渲染时链接只输出文字、关联节点不输出，避免指向 404 的课程详情。
 * value 可以是单个富文本，也可以是含富文本的结构（如页面区块数组）；不修改传入的值。
 * 调用方的缓存标签需包含 courses 与 disciplines（LINKABLE_COLLECTIONS 已覆盖）。
 */
export async function guardCourseLinks<T>(payload: Payload, value: T): Promise<T> {
  const ids = collectLinkedCourseIds(value)
  if (ids.length === 0) return value
  const { docs } = await payload.find({
    collection: 'courses',
    where: { and: [{ id: { in: ids } }, published, disciplinePublished] },
    select: {},
    depth: 0,
    pagination: false,
  })
  return hideUnreachableCourses(value, new Set(docs.map((doc) => doc.id)))
}

/**
 * 查询：课程列表的全部课程卡片（已发布、且所属专业方向已发布），按专业方向排序、课程排序。
 * cohorts 含全部未结束的开班（渲染时再按日期过滤）。
 */
export function queryCourseCards(payload: Payload): Promise<CourseCardData[]> {
  return findCourseCards(payload, null)
}

/** 查询：课程详情；课程不存在 / 未发布 / 所属专业方向未发布时返回 null */
export async function queryCourseDetail(
  payload: Payload,
  slug: string,
): Promise<CourseDetail | null> {
  const { docs } = await payload.find({
    collection: 'courses',
    where: { and: [published, { slug: { equals: slug } }] },
    // 讲师只取 ID，下面单独查询已发布的讲师（头像需要再填充一层）
    populate: { disciplines: DISCIPLINE_POPULATE, campuses: CAMPUS_POPULATE, teachers: {} },
    depth: 1,
    joins: false,
    limit: 1,
    pagination: false,
  })
  const course = docs[0]
  const discipline = course ? publishedDoc(course.discipline) : null
  if (!course || !discipline) return null

  const teacherIds = (course.teachers ?? [])
    .map(relationId)
    .filter((id): id is number => id !== null)

  const [cohorts, teachers, works, related, disclaimer] = await Promise.all([
    findCohortsByCourse(payload, [course.id]),
    teacherIds.length > 0 ? findTeachers(payload, { id: { in: teacherIds } }) : [],
    findWorks(payload, { course: { equals: course.id } }, COURSE_WORKS_LIMIT),
    findCourseCards(
      payload,
      { and: [{ discipline: { equals: discipline.id } }, { id: { not_equals: course.id } }] },
      RELATED_LIMIT,
    ),
    findSalaryDisclaimer(payload),
  ])

  const card = toCourseCard(course, cohorts.get(course.id) ?? [])
  if (!card) return null

  // 讲师按课程中的关联顺序排列
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]))
  const courseDirections = toCareerDirections(course.careerDirections)

  return {
    ...card,
    heroImage: imageSource(course.cover, 'hero'),
    shareImage: imageSource(course.cover, 'og'),
    highlights: toTextList(course.highlights),
    audience: toTextList(course.audience),
    stages: toCourseStages(course.stages),
    software: toSoftwareRefs(course.software),
    projects: toCourseProjects(course.projects),
    teachers: teacherIds
      .map((id) => teacherById.get(id))
      .filter((teacher): teacher is TeacherCardData => teacher !== undefined),
    works,
    careerDirections:
      courseDirections.length > 0
        ? courseDirections
        : toCareerDirections(discipline.careerDirections),
    salary: pickSalary(course.salaryRef, discipline.salaryRef, disclaimer),
    faqs: toFaqItems(course.faqs),
    related: related.filter((item) => item.id !== course.id).slice(0, RELATED_LIMIT),
    seo: course.seo,
  }
}

/** 查询：可公开访问的课程 slug（课程已发布且所属专业方向已发布），用于 generateStaticParams */
export async function queryPublishedCourseSlugs(payload: Payload): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'courses',
    where: { and: [published, disciplinePublished] },
    select: { slug: true },
    depth: 0,
    sort: 'order',
    pagination: false,
  })
  return docs.map((doc) => doc.slug).filter((slug) => SLUG_PATTERN.test(slug))
}

/** 查询：专业方向落地页；不存在或未发布时返回 null */
export async function queryDisciplineDetail(
  payload: Payload,
  slug: string,
): Promise<DisciplineDetail | null> {
  const { docs } = await payload.find({
    collection: 'disciplines',
    where: { and: [published, { slug: { equals: slug } }] },
    // depth 1：封面、分享图与专业介绍里的站内链接 / 图片
    depth: 1,
    joins: false,
    limit: 1,
    pagination: false,
  })
  const discipline = docs[0]
  if (!discipline) return null

  const [courses, works, teachers, disclaimer, intro] = await Promise.all([
    findCourseCards(payload, { discipline: { equals: discipline.id } }),
    findWorks(payload, { discipline: { equals: discipline.id } }, MAJOR_WORKS_LIMIT),
    findTeachers(payload, { disciplines: { in: [discipline.id] } }, MAJOR_TEACHERS_LIMIT),
    findSalaryDisclaimer(payload),
    guardCourseLinks(payload, discipline.intro ?? null),
  ])

  return {
    ...toDisciplineRef(discipline),
    tagline: discipline.tagline?.trim() || null,
    heroImage: imageSource(discipline.cover, 'hero'),
    shareImage: imageSource(discipline.cover, 'og'),
    intro,
    careerDirections: toCareerDirections(discipline.careerDirections),
    salary: pickSalary(null, discipline.salaryRef, disclaimer),
    courses,
    works,
    teachers,
    seo: discipline.seo,
  }
}

/** 查询：已发布专业方向的 slug，用于 generateStaticParams */
export async function queryPublishedDisciplineSlugs(payload: Payload): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'disciplines',
    where: published,
    select: { slug: true },
    depth: 0,
    sort: 'order',
    pagination: false,
  })
  return docs.map((doc) => doc.slug).filter((slug) => SLUG_PATTERN.test(slug))
}

/** 可选文本：从未保存过（undefined）用默认值；后台清空（null / 空字符串）则不显示 */
function optionalText(value: string | null | undefined, fallback: string): string | null {
  if (value === undefined) return fallback
  return value?.trim() || null
}

/** 查询：课程页面设置（全局 course-pages），缺省值见 src/globals/course-pages-defaults.ts */
export async function queryCoursePagesSettings(payload: Payload): Promise<CoursePagesSettings> {
  const doc = await payload.findGlobal({ slug: 'course-pages', depth: 1 })
  const D = COURSE_PAGES_DEFAULTS
  return {
    list: {
      title: doc.list?.title?.trim() || D.list.title,
      description: optionalText(doc.list?.description, D.list.description),
      seo: doc.list?.seo ?? null,
    },
    detail: {
      sidebarTitle: doc.detail?.sidebarTitle?.trim() || D.detail.sidebarTitle,
      sidebarDescription: optionalText(doc.detail?.sidebarDescription, D.detail.sidebarDescription),
    },
    major: {
      ctaTitle: doc.major?.ctaTitle?.trim() || D.major.ctaTitle,
      ctaDescription: optionalText(doc.major?.ctaDescription, D.major.ctaDescription),
    },
  }
}

// ───────────────────────── 缓存版本（页面使用） ─────────────────────────

const tags = (...slugs: string[]) => [...new Set(slugs.map(cacheTags.collection))]

/** 课程卡片依赖：课程、专业方向（名称 / 发布状态 / 排序）、校区、开班计划、封面 */
const COURSE_CARD_TAGS = tags('courses', 'disciplines', 'campuses', 'cohorts', 'media')

/** 课程详情额外依赖：讲师、软件、FAQ、作品，以及站点设置里的薪资免责声明 */
const COURSE_DETAIL_TAGS = [
  ...tags(
    'courses',
    'disciplines',
    'campuses',
    'cohorts',
    'teachers',
    'software',
    'faqs',
    'works',
    'media',
  ),
  cacheTags.global('site-settings'),
]

/** 专业方向页：同课程详情，另加专业介绍（富文本）里可链接的全部集合 */
const DISCIPLINE_DETAIL_TAGS = [
  ...new Set([...COURSE_DETAIL_TAGS, ...LINKABLE_COLLECTIONS.map(cacheTags.collection)]),
]

/**
 * 课程列表的全部课程卡片（缓存）。页面渲染时：
 * `filterCourses(cards, filters)` 过滤；卡片的近期开班用 `upcomingCohorts(card.cohorts, now)`。
 */
export const getCourseCards = unstable_cache(
  async (): Promise<CourseCardData[]> => queryCourseCards(await getPayloadClient()),
  ['course-cards'],
  { tags: COURSE_CARD_TAGS },
)

const cachedCourseDetail = unstable_cache(
  async (slug: string): Promise<CourseDetail | null> =>
    queryCourseDetail(await getPayloadClient(), slug),
  ['course-detail'],
  { tags: COURSE_DETAIL_TAGS },
)

/** 课程详情（缓存）；slug 不合法、课程不存在 / 未发布 / 所属专业方向未发布时返回 null → 页面 notFound() */
export async function getCourseDetail(slug: string): Promise<CourseDetail | null> {
  if (!SLUG_PATTERN.test(slug)) return null
  return cachedCourseDetail(slug)
}

/** 可公开访问的课程 slug（缓存），用于 /courses/[slug] 的 generateStaticParams */
export const getPublishedCourseSlugs = unstable_cache(
  async (): Promise<string[]> => queryPublishedCourseSlugs(await getPayloadClient()),
  ['published-course-slugs'],
  { tags: tags('courses', 'disciplines') },
)

const cachedDisciplineDetail = unstable_cache(
  async (slug: string): Promise<DisciplineDetail | null> =>
    queryDisciplineDetail(await getPayloadClient(), slug),
  ['discipline-detail'],
  { tags: DISCIPLINE_DETAIL_TAGS },
)

/** 专业方向落地页数据（缓存）；slug 不合法、不存在或未发布时返回 null → 页面 notFound() */
export async function getDisciplineDetail(slug: string): Promise<DisciplineDetail | null> {
  if (!SLUG_PATTERN.test(slug)) return null
  return cachedDisciplineDetail(slug)
}

/** 已发布专业方向的 slug（缓存），用于 /majors/[slug] 的 generateStaticParams */
export const getPublishedDisciplineSlugs = unstable_cache(
  async (): Promise<string[]> => queryPublishedDisciplineSlugs(await getPayloadClient()),
  ['published-discipline-slugs'],
  { tags: tags('disciplines') },
)

/** 课程页面设置（缓存）：列表页标题 / 简介 / SEO、详情页侧栏、专业页结尾行动号召 */
export const getCoursePagesSettings = unstable_cache(
  async (): Promise<CoursePagesSettings> => queryCoursePagesSettings(await getPayloadClient()),
  ['course-pages-settings'],
  { tags: [cacheTags.global('course-pages'), cacheTags.collection('media')] },
)
