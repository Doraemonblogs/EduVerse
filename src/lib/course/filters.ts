import { z } from 'zod'

import { zh } from '@/i18n/zh'
import { readSearchParam, slugParam, type SearchParamsInput } from '@/lib/search-params'

import { COURSES_PATH } from './paths'
import type {
  ClassType,
  CourseCardData,
  CourseFilterKey,
  CourseFilters,
  DeliveryMode,
  FilterOption,
} from './types'

/**
 * 课程列表 /courses 的筛选（纯函数）：解析 URL 参数、过滤课程、推导筛选项与数量、构造筛选链接。
 * 四个维度都是单选；URL 参数顺序固定为 discipline → type → mode → city，同一组条件只有一个地址。
 */

/** 筛选维度，也是 URL 参数名与筛选栏的行顺序 */
export const COURSE_FILTER_KEYS = [
  'discipline',
  'type',
  'mode',
  'city',
] as const satisfies readonly CourseFilterKey[]

const CLASS_TYPES = ['long_term', 'short_term'] as const satisfies readonly ClassType[]
const DELIVERY_MODES = ['offline', 'online', 'dual'] as const satisfies readonly DeliveryMode[]

/** 每个参数单独校验：非法取值变成 undefined（按“全部”处理），不影响其它参数 */
const filtersSchema = z.object({
  discipline: slugParam.optional().catch(undefined),
  type: z.enum(CLASS_TYPES).optional().catch(undefined),
  mode: z.enum(DELIVERY_MODES).optional().catch(undefined),
  city: slugParam.optional().catch(undefined),
})

/**
 * 解析并校验筛选参数（zod）：非法取值（格式不对、不在枚举内、空字符串）忽略，按“全部”处理。
 * `hasParams`：URL 中出现了任一筛选参数（不论取值是否合法）——此时页面输出 `noindex, follow`，
 * 防止无限组合的筛选页被收录（PRD §7）；规范地址始终是 /courses。
 *
 * 合法但不存在的取值（如 ?discipline=unknown）保留在 filters 里，结果为空，页面显示空状态。
 */
export function parseCourseFilters(searchParams: SearchParamsInput): {
  filters: CourseFilters
  hasParams: boolean
} {
  const raw: Partial<Record<CourseFilterKey, string>> = {}
  for (const key of COURSE_FILTER_KEYS) {
    const value = readSearchParam(searchParams, key)
    if (value !== undefined) raw[key] = value.trim()
  }
  const parsed = filtersSchema.parse(raw)
  const filters: CourseFilters = {}
  if (parsed.discipline) filters.discipline = parsed.discipline
  if (parsed.type) filters.type = parsed.type
  if (parsed.mode) filters.mode = parsed.mode
  if (parsed.city) filters.city = parsed.city
  return { filters, hasParams: Object.keys(raw).length > 0 }
}

/** 是否选择了任一筛选条件（用于显示“清除筛选”） */
export function hasActiveFilters(filters: CourseFilters): boolean {
  return COURSE_FILTER_KEYS.some((key) => filters[key] !== undefined)
}

function matches(card: CourseCardData, key: CourseFilterKey, value: string): boolean {
  switch (key) {
    case 'discipline':
      return card.discipline.slug === value
    case 'type':
      return card.classType === value
    case 'mode':
      return (card.deliveryModes as readonly string[]).includes(value)
    case 'city':
      return card.campuses.some((campus) => campus.citySlug === value)
  }
}

/**
 * 按筛选条件过滤课程（各维度同时满足），保持原有顺序。
 * 城市按课程开设校区的 citySlug 匹配：纯线上课程没有校区，选择任一城市时不出现。
 */
export function filterCourses(
  cards: readonly CourseCardData[],
  filters: CourseFilters,
): CourseCardData[] {
  return cards.filter((card) =>
    COURSE_FILTER_KEYS.every((key) => {
      const value = filters[key]
      return value === undefined || matches(card, key, value)
    }),
  )
}

type Candidate = { value: string; label: string; rank: number }

/** 某个维度在一组课程中出现过的全部取值（去重，按 rank 排序） */
function candidates(cards: readonly CourseCardData[], key: CourseFilterKey): Candidate[] {
  const found = new Map<string, Candidate>()
  const add = (value: string, label: string, rank: number) => {
    const existing = found.get(value)
    if (!existing) found.set(value, { value, label, rank })
    else if (rank < existing.rank) existing.rank = rank
  }
  cards.forEach((card, index) => {
    switch (key) {
      case 'discipline':
        // 课程已按专业方向排序，首次出现的位置即专业方向的顺序
        add(card.discipline.slug, card.discipline.shortName, index)
        break
      case 'type':
        add(
          card.classType,
          zh.course.classType[card.classType],
          CLASS_TYPES.indexOf(card.classType),
        )
        break
      case 'mode':
        for (const mode of card.deliveryModes) {
          add(mode, zh.course.deliveryMode[mode], DELIVERY_MODES.indexOf(mode))
        }
        break
      case 'city':
        // 同城多个校区：取排序最靠前的校区决定城市的位置
        for (const campus of card.campuses) add(campus.citySlug, campus.city, campus.order)
        break
    }
  })
  return [...found.values()].sort((a, b) => a.rank - b.rank)
}

/**
 * 推导筛选栏每一行的可选项与数量：
 * - 某一维度的数量 = 其它维度保持当前选择、该维度选中此项时的课程数；
 * - 只列出至少有一门课程的取值（取值来自课程数据：专业方向用简称，城市来自开设校区）；
 *   例外：当前选中的取值即使数量为 0 也保留，让访客看得到并能取消；
 * - 顺序：专业方向按后台排序，班型 / 授课方式按后台选项顺序，城市按校区排序。
 * “全部”项不在返回值里，由筛选栏自行渲染（链接 courseFilterHref(filters, key, undefined)，
 * 数量 = filterCourses(cards, { ...filters, [key]: undefined }).length）。
 */
export function buildFilterOptions(
  cards: readonly CourseCardData[],
  filters: CourseFilters,
): Record<CourseFilterKey, FilterOption[]> {
  const result = {} as Record<CourseFilterKey, FilterOption[]>
  for (const key of COURSE_FILTER_KEYS) {
    const others = filterCourses(cards, { ...filters, [key]: undefined })
    const selected = filters[key]
    const options: FilterOption[] = candidates(others, key).map((c) => ({
      value: c.value,
      label: c.label,
      count: others.filter((card) => matches(card, key, c.value)).length,
      selected: c.value === selected,
    }))
    if (selected !== undefined && !options.some((o) => o.selected)) {
      // 当前选择在其它条件下没有课程：从全部课程里找标签，找不到（不存在的取值）就不显示
      const all = candidates(cards, key)
      const known = all.find((c) => c.value === selected)
      if (known) {
        const position = new Map(all.map((c, index) => [c.value, index]))
        options.push({ value: known.value, label: known.label, count: 0, selected: true })
        options.sort((a, b) => (position.get(a.value) ?? 0) - (position.get(b.value) ?? 0))
      }
    }
    result[key] = options
  }
  return result
}

/**
 * 筛选链接：在当前条件上切换某一维度。
 * - value 为 undefined：该维度改为“全部”；
 * - value 与当前选择相同：取消该维度（再点一次即取消）；
 * - 否则：该维度改为 value（单选，替换原值）。
 * 返回 `/courses` 或 `/courses?discipline=…&type=…&mode=…&city=…`（参数顺序固定，没有选择的维度不出现）。
 * 交给 next/link 使用（会自动补 basePath）。
 */
export function courseFilterHref(
  filters: CourseFilters,
  key: CourseFilterKey,
  value: string | undefined,
): string {
  const next: Partial<Record<CourseFilterKey, string>> = { ...filters, [key]: value }
  if (value !== undefined && filters[key] === value) next[key] = undefined
  return coursesHref(next)
}

/** 按固定参数顺序拼出 /courses 的地址 */
function coursesHref(filters: Partial<Record<CourseFilterKey, string>>): string {
  const params = new URLSearchParams()
  for (const key of COURSE_FILTER_KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `${COURSES_PATH}?${query}` : COURSES_PATH
}
