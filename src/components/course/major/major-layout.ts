import type { SectionTone } from '@/components/common/section'
import type { CampusRef, ClassType, CourseCardData, DeliveryMode } from '@/lib/course/types'

/**
 * 专业方向页的纯函数：首屏概况（由该方向的课程汇总）与各区块底色。
 */

const CLASS_TYPE_ORDER: readonly ClassType[] = ['long_term', 'short_term']
const DELIVERY_MODE_ORDER: readonly DeliveryMode[] = ['offline', 'online', 'dual']

export type MajorSummary = {
  courseCount: number
  /** 该方向开设的班型（长期在前） */
  classTypes: ClassType[]
  /** 该方向用到的授课方式（线下 / 线上 / 双师 的固定顺序） */
  deliveryModes: DeliveryMode[]
  /** 开设校区（去重，按校区排序）；全部课程都是纯线上时为空 */
  campuses: CampusRef[]
}

/** 汇总该方向全部课程的班型、授课方式与开设校区，用于首屏概况 */
export function summarizeMajor(courses: readonly CourseCardData[]): MajorSummary {
  const classTypes = new Set(courses.map((course) => course.classType))
  const modes = new Set(courses.flatMap((course) => course.deliveryModes))
  const campuses = new Map<number, CampusRef>()
  for (const course of courses) {
    for (const campus of course.campuses) campuses.set(campus.id, campus)
  }
  return {
    courseCount: courses.length,
    classTypes: CLASS_TYPE_ORDER.filter((type) => classTypes.has(type)),
    deliveryModes: DELIVERY_MODE_ORDER.filter((mode) => modes.has(mode)),
    campuses: [...campuses.values()].sort((a, b) => a.order - b.order || a.id - b.id),
  }
}

/** 首屏之后可能出现的内容区块（按页面顺序）；没有内容的区块不渲染 */
export type MajorSectionKey = 'intro' | 'careers' | 'courses' | 'works' | 'teachers'

/** 固定用深色衬托的区块（学员作品） */
const DARK_SECTIONS: ReadonlySet<MajorSectionKey> = new Set(['works'])

/**
 * 给实际渲染的区块分配底色：作品区块固定深色，其余在白底 / 米色之间交替，
 * 保证相邻两个浅色区块底色不同（中间缺了某个区块也一样），首屏（深色）之后从白底开始。
 */
export function assignSectionTones(
  keys: readonly MajorSectionKey[],
): Map<MajorSectionKey, SectionTone> {
  const tones = new Map<MajorSectionKey, SectionTone>()
  let previous: SectionTone = 'dark'
  for (const key of keys) {
    const tone: SectionTone = DARK_SECTIONS.has(key)
      ? 'dark'
      : previous === 'light'
        ? 'paper'
        : 'light'
    tones.set(key, tone)
    previous = tone
  }
  return tones
}
