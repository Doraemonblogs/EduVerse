import { zh } from '@/i18n/zh'

import type {
  CampusRef,
  ClassType,
  CohortItem,
  CohortStatus,
  CourseDuration,
  DeliveryMode,
} from './types'

/**
 * 课程模块的格式化工具（纯函数，服务端与客户端组件都能用）。
 * 标签文案来自 zh.course，与后台选项标签一致（tests/unit/course-format.test.ts 校验）。
 */

const t = zh.course

/**
 * 替换文案中的 {name} 占位：formatMessage('共 {count} 门课程', { count: 3 }) → '共 3 门课程'。
 * 用替换函数而不是替换字符串，值里的 `$&` 等不会被当作特殊模式。缺少的占位保持原样。
 */
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}

export function classTypeLabel(value: ClassType): string {
  return t.classType[value]
}

export function deliveryModeLabel(value: DeliveryMode): string {
  return t.deliveryMode[value]
}

/**
 * 展示用的列表分隔符：“/”前的空格换成不换行空格，换行时“/”留在上一行行尾、不会出现在行首。
 * 配合 `break-keep`（中文词内不断行）使用，只在“/”后面换行。
 */
export const LIST_SEPARATOR = t.listSeparator.replace(/^ /, '\u00a0')

/** 多个取值拼成一行展示：“北京 / 上海 / 广州”（分隔符见 LIST_SEPARATOR） */
export function joinList(values: readonly string[]): string {
  return values.join(LIST_SEPARATOR)
}

/** 多个授课方式：“线下面授 / 双师课堂”（按后台选项顺序，去重） */
export function deliveryModesLabel(values: readonly DeliveryMode[]): string {
  const order: DeliveryMode[] = ['offline', 'online', 'dual']
  return joinList(order.filter((mode) => values.includes(mode)).map(deliveryModeLabel))
}

export function cohortStatusLabel(value: CohortStatus): string {
  return t.cohortStatus[value]
}

/** 课程时长：“7 个月”“8 周”；没有时长返回空字符串 */
export function formatDuration(duration: CourseDuration | null | undefined): string {
  if (!duration || !Number.isFinite(duration.value) || duration.value <= 0) return ''
  return `${duration.value} ${t.durationUnit[duration.unit]}`
}

/** 按北京时间取年月日（开班日期与后台、开班标题一致，不受服务器 / 访客时区影响） */
const beijingDay = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

function beijingParts(value: string | Date): { year: number; month: number; day: number } | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = Object.fromEntries(beijingDay.formatToParts(date).map((p) => [p.type, p.value]))
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) }
}

/** 开班日期（北京时间）：“2026年12月14日”；无效日期返回空字符串 */
export function formatCohortDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  const parts = beijingParts(value)
  return parts ? `${parts.year}年${parts.month}月${parts.day}日` : ''
}

/** 北京时间的 ISO 日期“2026-12-14”（结构化数据 startDate / endDate 用）；无效日期返回空字符串 */
export function toBeijingIsoDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  const parts = beijingParts(value)
  if (!parts) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

/**
 * 校区展示名：校区名已以城市开头（“北京海淀校区”）时原样显示，避免“北京·北京海淀校区”重复城市；
 * 否则在前面补上城市：“北京·中关村校区”。
 */
export function campusLabel(campus: Pick<CampusRef, 'city' | 'name'>): string {
  const name = campus.name.trim()
  const city = campus.city.trim()
  if (!city || name.startsWith(city)) return name
  return name ? `${city}${t.campusSeparator}${name}` : city
}

/** 开设城市（按校区顺序去重）：['北京', '上海']；纯线上课程为空数组 */
export function courseCities(campuses: readonly Pick<CampusRef, 'city'>[]): string[] {
  return [...new Set(campuses.map((c) => c.city).filter(Boolean))]
}

/** 授课方式只有“线上直播”（不需要校区）。没有填授课方式时不算纯线上 */
export function isOnlineOnly(modes: readonly DeliveryMode[]): boolean {
  return modes.length > 0 && modes.every((mode) => mode === 'online')
}

/**
 * 没有可展示校区时的说明：纯线上课程为“线上”；
 * 线下 / 双师课程的校区还没发布（草稿）或没填时为“待定”，不能说成线上。
 */
export function noCampusLabel(modes: readonly DeliveryMode[]): string {
  return isOnlineOnly(modes) ? t.online : t.campusPending
}

/** 开设城市的展示文字：“北京 / 上海”；没有校区时按授课方式显示“线上”或“待定”（见 noCampusLabel） */
export function courseCitiesLabel(
  campuses: readonly Pick<CampusRef, 'city'>[],
  modes: readonly DeliveryMode[],
): string {
  const cities = courseCities(campuses)
  return cities.length > 0 ? joinList(cities) : noCampusLabel(modes)
}

/** 开班地点：“北京海淀校区”（见 campusLabel）；没有校区的线上开班为“线上” */
export function cohortPlaceLabel(cohort: Pick<CohortItem, 'campus'>): string {
  return cohort.campus ? campusLabel(cohort.campus) : t.online
}
