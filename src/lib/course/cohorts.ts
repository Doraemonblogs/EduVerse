import type { CohortItem, CohortStatus } from './types'

/**
 * 开班计划的时间过滤（纯函数）。
 * 数据层缓存的是全部未结束的开班；“近期开班”与日期有关，必须在**渲染时**用当前时间过滤，
 * 否则缓存命中期间已开班的计划会一直显示。
 */

const DAY_MS = 24 * 60 * 60 * 1000
/** 北京时间 UTC+8，无夏令时 */
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

const VISIBLE_STATUSES: ReadonlySet<string> = new Set<CohortStatus>([
  'enrolling',
  'upcoming',
  'full',
])

/** now 所在北京日期的 0 点（UTC 毫秒） */
export function beijingDayStart(now: Date): number {
  return Math.floor((now.getTime() + BEIJING_OFFSET_MS) / DAY_MS) * DAY_MS - BEIJING_OFFSET_MS
}

type CohortLike = Pick<CohortItem, 'startDate'> & { status: string }

/**
 * 未开班的开班计划：开班日期 ≥ 北京时间今天 0 点（今天开班的仍显示），
 * 状态为报名中 / 即将开班 / 已满班，按开班日期升序。不修改传入的数组。
 *
 * 用法（服务端组件渲染时）：`upcomingCohorts(course.cohorts, new Date())`
 */
export function upcomingCohorts<T extends CohortLike>(cohorts: readonly T[], now: Date): T[] {
  const from = beijingDayStart(now)
  return cohorts
    .filter((c) => VISIBLE_STATUSES.has(c.status) && Date.parse(c.startDate) >= from)
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate))
}

/** 最近的一期开班（课程卡片、首屏关键信息的“近期开班”）；没有时为 null */
export function nextCohort<T extends CohortLike>(cohorts: readonly T[], now: Date): T | null {
  return upcomingCohorts(cohorts, now)[0] ?? null
}
