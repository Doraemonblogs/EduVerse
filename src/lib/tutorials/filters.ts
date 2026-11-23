import { z } from 'zod'

import type { FilterBarRow } from '@/components/common/filter-bar'
import { zh } from '@/i18n/zh'
import type { FilterOption } from '@/lib/course/types'
import { readSearchParam, slugParam, type SearchParamsInput } from '@/lib/search-params'

import { TUTORIAL_LEVELS, tutorialLevelLabel } from './format'
import { parseTutorialId, TUTORIAL_PLAY_PARAM, TUTORIALS_PATH } from './paths'
import type {
  TutorialCardData,
  TutorialFilterKey,
  TutorialFilters,
  TutorialListData,
} from './types'

/**
 * 免费教程列表 /tutorials 的筛选参数（纯函数）：解析 URL 参数、过滤教程、推导筛选项与数量、构造链接。
 * 两个维度都是单选：专业方向（slug）、难度（beginner / intermediate / advanced）。
 * URL 参数顺序固定为 discipline → level → play，同一组条件只有一个地址；改变筛选条件时去掉 play（关闭弹窗）。
 * 教程不多，不分页（全部渲染）。
 */

/** 筛选维度，也是 URL 参数名与筛选栏的行顺序 */
export const TUTORIAL_FILTER_KEYS = [
  'discipline',
  'level',
] as const satisfies readonly TutorialFilterKey[]

/** 每个参数单独校验：非法取值变成 undefined（按“全部”处理），不影响其它参数 */
const filtersSchema = z.object({
  discipline: slugParam.optional().catch(undefined),
  level: z.enum(TUTORIAL_LEVELS).optional().catch(undefined),
})

export type ParsedTutorialFilters = {
  filters: TutorialFilters
  /**
   * ?play= 解析出的教程 ID（parseTutorialId：不带前导 0 的正整数）；缺失或不合法时为 null。
   * 是否存在由页面在已发布教程里查找（findTutorial），找不到不打开弹窗。
   */
  playId: number | null
  /** URL 中出现了任一筛选参数（discipline / level，不论取值是否合法） */
  hasFilterParams: boolean
  /**
   * 页面应输出 `noindex, follow`、canonical 为 /tutorials：出现了任一筛选参数或 play 参数（不论取值是否合法）。
   */
  noindex: boolean
}

/**
 * 解析并校验 /tutorials 的查询参数（zod）：非法取值（格式不对、未知难度、空字符串）忽略。
 * 合法但不存在的专业方向（如 ?discipline=unknown）保留在 filters 里，结果为空，页面显示空状态。
 */
export function parseTutorialFilters(searchParams: SearchParamsInput): ParsedTutorialFilters {
  const raw: Partial<Record<TutorialFilterKey, string>> = {}
  for (const key of TUTORIAL_FILTER_KEYS) {
    const value = readSearchParam(searchParams, key)
    if (value !== undefined) raw[key] = value.trim()
  }
  const parsed = filtersSchema.parse(raw)
  const filters: TutorialFilters = {}
  if (parsed.discipline) filters.discipline = parsed.discipline
  if (parsed.level) filters.level = parsed.level
  const play = readSearchParam(searchParams, TUTORIAL_PLAY_PARAM)
  const hasFilterParams = Object.keys(raw).length > 0
  return {
    filters,
    playId: parseTutorialId(play),
    hasFilterParams,
    noindex: hasFilterParams || play !== undefined,
  }
}

/** 是否选择了任一筛选条件（用于显示“清除筛选”） */
export function hasActiveTutorialFilters(filters: TutorialFilters): boolean {
  return TUTORIAL_FILTER_KEYS.some((key) => filters[key] !== undefined)
}

function matches(tutorial: TutorialCardData, key: TutorialFilterKey, value: string): boolean {
  switch (key) {
    case 'discipline':
      return tutorial.discipline?.slug === value
    case 'level':
      return tutorial.level === value
  }
}

function filterByValues(
  tutorials: readonly TutorialCardData[],
  values: Partial<Record<TutorialFilterKey, string>>,
): TutorialCardData[] {
  return tutorials.filter((tutorial) =>
    TUTORIAL_FILTER_KEYS.every((key) => {
      const value = values[key]
      return value === undefined || matches(tutorial, key, value)
    }),
  )
}

/** 按筛选条件过滤教程（各维度同时满足），保持原有顺序 */
export function filterTutorials(
  tutorials: readonly TutorialCardData[],
  filters: TutorialFilters,
): TutorialCardData[] {
  return filterByValues(tutorials, filters)
}

/** 在全部已发布教程里查找 ?play= 指向的教程（不受当前筛选影响）；找不到返回 null */
export function findTutorial(
  tutorials: readonly TutorialCardData[],
  id: number | null,
): TutorialCardData | null {
  return id === null ? null : (tutorials.find((tutorial) => tutorial.id === id) ?? null)
}

/** 某个维度的全部候选取值（按后台排序），标签：专业方向用简称、难度用显示文字 */
function candidates(
  key: TutorialFilterKey,
  facets: TutorialListData['facets'],
): { value: string; label: string }[] {
  switch (key) {
    case 'discipline':
      return facets.disciplines.map((d) => ({ value: d.slug, label: d.shortName }))
    case 'level':
      return TUTORIAL_LEVELS.map((level) => ({ value: level, label: tutorialLevelLabel(level) }))
  }
}

/**
 * 推导筛选栏每一行的可选项与数量：
 * - 某一维度的数量 = 其它维度保持当前选择、该维度选中此项时的教程数；
 * - 只列出至少有一个教程的取值（专业方向按后台排序，难度按入门 → 进阶 → 高阶）；
 *   例外：当前选中的取值即使数量为 0 也保留，让访客看得到并能取消（不在候选里的取值不显示）。
 */
export function buildTutorialFilterOptions(
  tutorials: readonly TutorialCardData[],
  filters: TutorialFilters,
  facets: TutorialListData['facets'],
): Record<TutorialFilterKey, FilterOption[]> {
  const result = {} as Record<TutorialFilterKey, FilterOption[]>
  for (const key of TUTORIAL_FILTER_KEYS) {
    const others = filterByValues(tutorials, { ...filters, [key]: undefined })
    const selected = filters[key]
    result[key] = candidates(key, facets)
      .map((c) => ({
        value: c.value,
        label: c.label,
        count: others.filter((tutorial) => matches(tutorial, key, c.value)).length,
        selected: c.value === selected,
      }))
      .filter((option) => option.count > 0 || option.selected)
  }
  return result
}

/**
 * 按固定参数顺序拼出 /tutorials 的地址：discipline → level → play。
 * playId 给出时带上 play（打开该教程的播放弹窗，同时保留筛选）。交给 next/link 或 router 使用。
 */
export function tutorialListHref(filters: TutorialFilters, playId?: number | null): string {
  const params = new URLSearchParams()
  for (const key of TUTORIAL_FILTER_KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  if (playId) params.set(TUTORIAL_PLAY_PARAM, String(playId))
  const query = params.toString()
  return query ? `${TUTORIALS_PATH}?${query}` : TUTORIALS_PATH
}

/**
 * 筛选链接：在当前条件上切换某一维度（不带 play）。
 * - value 为 undefined：该维度改为“全部”；
 * - value 与当前选择相同：取消该维度（再点一次即取消）；
 * - 否则：该维度改为 value（单选，替换原值）。
 */
export function tutorialFilterHref(
  filters: TutorialFilters,
  key: TutorialFilterKey,
  value: string | undefined,
): string {
  const nextValue = value !== undefined && filters[key] === value ? undefined : value
  const next: Partial<Record<TutorialFilterKey, string>> = { ...filters }
  if (nextValue === undefined) delete next[key]
  else next[key] = nextValue
  return tutorialListHref(next as TutorialFilters)
}

/**
 * 通用筛选栏（<FilterBar rows>）的两行：专业方向 / 难度。
 * 每行的“全部”数量 = 其它维度保持当前选择时的教程数。
 */
export function buildTutorialFilterRows(
  tutorials: readonly TutorialCardData[],
  filters: TutorialFilters,
  facets: TutorialListData['facets'],
): FilterBarRow[] {
  const options = buildTutorialFilterOptions(tutorials, filters, facets)
  const t = zh.tutorials.filters
  return TUTORIAL_FILTER_KEYS.map((key) => ({
    key,
    label: t[key],
    options: options[key].map((option) => ({
      label: option.label,
      count: option.count,
      href: tutorialFilterHref(filters, key, option.value),
      selected: option.selected,
    })),
    allHref: tutorialFilterHref(filters, key, undefined),
    allCount: filterTutorials(tutorials, { ...filters, [key]: undefined }).length,
    allSelected: filters[key] === undefined,
  }))
}
