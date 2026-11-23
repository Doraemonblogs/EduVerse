import { imageSource } from '@/lib/media'
import type {
  Campus,
  Cohort,
  Course,
  Discipline,
  Faq,
  Software,
  Teacher,
  Work,
} from '@/payload-types'

import type {
  CampusRef,
  CareerDirection,
  CohortItem,
  CourseCardData,
  CourseProject,
  CourseStage,
  DisciplineRef,
  FaqItem,
  SoftwareRef,
  TeacherCardData,
  WorkThumb,
} from './types'

/**
 * Payload 文档 → 课程模块视图模型（纯函数，供 src/lib/data/courses.ts 使用，可单测）。
 *
 * 草稿处理：按 depth 填充进来的关联文档，即使是从未发布过的草稿也会被填充出来（Local API 默认
 * overrideAccess=true），所以这里对专业方向、校区再按 `_status === 'published'` 过滤一遍。
 * 软件、FAQ、开班计划没有草稿。
 */

type Relation<T> = number | T | null | undefined

/** 关联字段已填充时返回文档；只有 ID 或为空时返回 null */
export function populated<T extends object>(value: Relation<T>): T | null {
  return value !== null && typeof value === 'object' ? value : null
}

/** 关联字段的 ID（已填充或未填充都可以）；为空时返回 null */
export function relationId(value: Relation<{ id: number }>): number | null {
  if (typeof value === 'number') return value
  return value && typeof value === 'object' ? value.id : null
}

/** 已填充、且是已发布状态的文档 */
export function publishedDoc<T extends { _status?: 'draft' | 'published' | null }>(
  value: Relation<T>,
): T | null {
  const doc = populated(value)
  return doc && doc._status === 'published' ? doc : null
}

const textOrNull = (value: string | null | undefined) => value?.trim() || null

const texts = (items: readonly { text: string }[] | null | undefined): string[] =>
  (items ?? []).map((item) => item.text.trim()).filter(Boolean)

export type DisciplineSource = Pick<Discipline, 'id' | 'name' | 'shortName' | 'slug'>

export function toDisciplineRef(discipline: DisciplineSource): DisciplineRef {
  return {
    id: discipline.id,
    name: discipline.name,
    shortName: textOrNull(discipline.shortName) ?? discipline.name,
    slug: discipline.slug,
  }
}

export type CampusSource = Pick<
  Campus,
  'id' | 'name' | 'slug' | 'city' | 'citySlug' | 'address' | 'order' | '_status'
>

export function toCampusRef(campus: CampusSource): CampusRef {
  return {
    id: campus.id,
    name: campus.name,
    slug: campus.slug,
    city: campus.city,
    citySlug: campus.citySlug,
    address: campus.address,
    order: campus.order ?? 0,
  }
}

/** 课程的开设校区：只保留已填充且已发布的，按校区排序 */
export function publishedCampuses(values: readonly Relation<CampusSource>[] | null | undefined) {
  return (values ?? [])
    .map((value) => publishedDoc(value))
    .filter((campus): campus is CampusSource => campus !== null)
    .map(toCampusRef)
    .sort((a, b) => a.order - b.order)
}

export type CohortSource = Pick<
  Cohort,
  'id' | 'mode' | 'startDate' | 'endDate' | 'status' | 'note'
> & {
  campus?: Relation<CampusSource>
}

/**
 * 开班计划 → 前台条目；以下情况返回 null（不展示）：
 * - 状态为已结束（closed）；
 * - 开班校区未发布（草稿 / 已下线校区的开班直接剔除，不显示“校区待定”）；
 * - 线下面授 / 双师课堂却没有校区（校区已删除）：无法告诉访客去哪上课。
 */
export function toCohortItem(cohort: CohortSource): CohortItem | null {
  if (cohort.status === 'closed') return null
  let campus: CohortItem['campus'] = null
  if (cohort.campus !== null && cohort.campus !== undefined) {
    const doc = publishedDoc(cohort.campus)
    if (!doc) return null
    campus = { name: doc.name, city: doc.city, address: doc.address }
  } else if (cohort.mode !== 'online') {
    return null
  }
  return {
    id: cohort.id,
    startDate: cohort.startDate,
    endDate: cohort.endDate ?? null,
    mode: cohort.mode,
    status: cohort.status,
    campus,
    note: textOrNull(cohort.note),
  }
}

/** 开班计划按开班日期升序（相同日期按 ID，结果稳定） */
export function sortCohorts(cohorts: CohortItem[]): CohortItem[] {
  return cohorts.sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate) || a.id - b.id)
}

export type CourseCardSource = Pick<
  Course,
  | 'id'
  | 'slug'
  | 'title'
  | 'summary'
  | 'classType'
  | 'deliveryModes'
  | 'duration'
  | 'schedule'
  | 'stages'
  | 'featured'
  | 'cover'
> & {
  discipline: Relation<DisciplineSource & Pick<Discipline, '_status'>>
  campuses?: readonly Relation<CampusSource>[] | null
}

/**
 * 课程 → 课程卡片。所属专业方向未填充或未发布时返回 null（课程不出现在任何列表）。
 * cohorts 传该课程未结束的开班（已经过 toCohortItem 与排序）。
 */
export function toCourseCard(
  course: CourseCardSource,
  cohorts: CohortItem[],
): CourseCardData | null {
  const discipline = publishedDoc(course.discipline)
  if (!discipline) return null
  const duration = course.duration?.value
    ? { value: course.duration.value, unit: course.duration.unit }
    : null
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    cover: imageSource(course.cover, 'card'),
    discipline: toDisciplineRef(discipline),
    classType: course.classType,
    deliveryModes: [...(course.deliveryModes ?? [])],
    duration,
    schedule: textOrNull(course.schedule),
    campuses: publishedCampuses(course.campuses),
    stageTitles: (course.stages ?? []).map((stage) => stage.title.trim()).filter(Boolean),
    cohorts,
    featured: Boolean(course.featured),
  }
}

export function toCourseStages(stages: Course['stages']): CourseStage[] {
  return (stages ?? []).map((stage) => ({
    title: stage.title,
    duration: textOrNull(stage.duration),
    goals: textOrNull(stage.goals),
    topics: texts(stage.topics),
  }))
}

export function toCourseProjects(projects: Course['projects']): CourseProject[] {
  return (projects ?? []).map((project) => ({
    title: project.title,
    description: textOrNull(project.description),
    image: imageSource(project.image, 'card'),
  }))
}

export function toCareerDirections(
  items: readonly { title: string; description?: string | null }[] | null | undefined,
): CareerDirection[] {
  return (items ?? [])
    .filter((item) => item.title.trim())
    .map((item) => ({ title: item.title.trim(), description: textOrNull(item.description) }))
}

export function toTextList(items: readonly { text: string }[] | null | undefined): string[] {
  return texts(items)
}

/** 课程关联的软件（已填充的文档），保持后台关联顺序 */
export function toSoftwareRefs(values: Course['software']): SoftwareRef[] {
  return (values ?? [])
    .map((value) => populated<Software>(value))
    .filter((doc): doc is Software => doc !== null)
    .map((doc) => ({ id: doc.id, name: doc.name, category: doc.category }))
}

/** 课程关联的常见问题（已填充的文档），保持后台关联顺序 */
export function toFaqItems(values: Course['faqs']): FaqItem[] {
  return (values ?? [])
    .map((value) => populated<Faq>(value))
    .filter((doc): doc is Faq => doc !== null && Boolean(doc.question && doc.answer))
    .map((doc) => ({ id: doc.id, question: doc.question, answer: doc.answer }))
}

export type TeacherSource = Pick<
  Teacher,
  'id' | 'slug' | 'name' | 'title' | 'avatar' | 'yearsOfExperience' | 'specialties'
>

export function toTeacherCard(teacher: TeacherSource): TeacherCardData {
  return {
    id: teacher.id,
    slug: teacher.slug,
    name: teacher.name,
    title: teacher.title,
    avatar: imageSource(teacher.avatar, 'thumbnail'),
    yearsOfExperience:
      typeof teacher.yearsOfExperience === 'number' ? teacher.yearsOfExperience : null,
    specialties: texts(teacher.specialties),
  }
}

export type WorkSource = Pick<Work, 'id' | 'title' | 'author' | 'cover'>

export function toWorkThumb(work: WorkSource): WorkThumb {
  return {
    id: work.id,
    title: work.title,
    cover: imageSource(work.cover, 'card'),
    authorName: textOrNull(work.author?.displayName),
    cohortLabel: textOrNull(work.author?.cohortLabel),
  }
}
