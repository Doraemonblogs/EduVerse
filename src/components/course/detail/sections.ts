import { zh } from '@/i18n/zh'
import type { CourseDetail } from '@/lib/course/types'

/**
 * 课程详情页的内容区块：页内导航与区块渲染共用同一份“哪些区块有内容”的判断，
 * 保证导航里的每个锚点都指向页面上实际存在的区块（纯函数，可单测）。
 */

/** 区块顺序即页面顺序；值同时是区块的 id（URL 锚点 #syllabus 等） */
export const COURSE_DETAIL_SECTIONS = [
  'overview',
  'syllabus',
  'projects',
  'works',
  'teachers',
  'cohorts',
  'careers',
  'faqs',
] as const

export type CourseDetailSectionId = (typeof COURSE_DETAIL_SECTIONS)[number]

export type CourseDetailNavItem = { id: CourseDetailSectionId; label: string }

type SectionSource = Pick<
  CourseDetail,
  | 'highlights'
  | 'audience'
  | 'stages'
  | 'software'
  | 'projects'
  | 'works'
  | 'teachers'
  | 'careerDirections'
  | 'salary'
  | 'faqs'
>

/**
 * 某个区块是否有内容。没有内容的区块整块不渲染，也不出现在页内导航里。
 * 开班计划例外：始终保留——没有近期开班时显示空状态，引导访客预约试听、由顾问告知开班安排。
 */
export function hasSectionContent(course: SectionSource, id: CourseDetailSectionId): boolean {
  switch (id) {
    case 'overview':
      return course.highlights.length > 0 || course.audience.length > 0
    case 'syllabus':
      return course.stages.length > 0 || course.software.length > 0
    case 'projects':
      return course.projects.length > 0
    case 'works':
      return course.works.length > 0
    case 'teachers':
      return course.teachers.length > 0
    case 'cohorts':
      return true
    case 'careers':
      return course.careerDirections.length > 0 || course.salary !== null
    case 'faqs':
      return course.faqs.length > 0
  }
}

/** 页内导航：按页面顺序列出有内容的区块 */
export function courseDetailNav(course: SectionSource): CourseDetailNavItem[] {
  return COURSE_DETAIL_SECTIONS.filter((id) => hasSectionContent(course, id)).map((id) => ({
    id,
    label: zh.course.detail.nav[id],
  }))
}

/** 区块标题的 id（区块用 aria-labelledby 关联） */
export function sectionTitleId(id: string): string {
  return `${id}-title`
}
