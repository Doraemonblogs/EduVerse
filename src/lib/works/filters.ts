import { z } from 'zod'

import type { FilterBarRow } from '@/components/common/filter-bar'
import { zh } from '@/i18n/zh'
import type { FilterOption } from '@/lib/course/types'
import { parsePageParam } from '@/lib/pagination'
import { readSearchParam, slugParam, type SearchParamsInput } from '@/lib/search-params'

import { WORKS_PATH } from './paths'
import type { WorkCardData, WorkFacets, WorkFilterKey, WorkFilters } from './types'

/**
 * 作品列表 /works 的筛选与分页参数（纯函数）：解析 URL 参数、过滤作品、推导筛选项与数量、构造链接。
 * 三个维度都是单选：专业方向（slug）、软件（slug）、只看精选（featured=1）。
 * URL 参数顺序固定为 discipline → software → featured → page，同一组条件只有一个地址；
 * 改变筛选条件时回到第 1 页（链接不带 page）。
 */

/** 筛选维度，也是 URL 参数名与筛选栏的行顺序 */
export const WORK_FILTER_KEYS = [
  'discipline',
  'software',
  'featured',
] as const satisfies readonly WorkFilterKey[]

/** 作品列表每页件数 */
export const WORKS_PER_PAGE = 24

/** “只看精选”在 URL 中的取值 */
export const FEATURED_PARAM_VALUE = '1'

/** 每个参数单独校验：非法取值变成 undefined（按“全部”处理），不影响其它参数 */
const filtersSchema = z.object({
  discipline: slugParam.optional().catch(undefined),
  software: slugParam.optional().catch(undefined),
  featured: z.literal(FEATURED_PARAM_VALUE).optional().catch(undefined),
})

export type ParsedWorkFilters = {
  filters: WorkFilters
  /** 页码（从 1 开始）；非法取值按第 1 页处理，超出总页数由 paginate().outOfRange 判断 */
  page: number
  /**
   * URL 中出现了任一筛选参数（discipline / software / featured，不论取值是否合法）：
   * 页面输出 `noindex, follow`，canonical 为 /works。只有 page 不算筛选（第 N 页可以收录）。
   */
  hasFilterParams: boolean
}

/**
 * 解析并校验 /works 的查询参数（zod）：非法取值（格式不对、featured 不是 1、空字符串）忽略。
 * 合法但不存在的取值（如 ?discipline=unknown）保留在 filters 里，结果为空，页面显示空状态。
 */
export function parseWorkFilters(searchParams: SearchParamsInput): ParsedWorkFilters {
  const raw: Partial<Record<WorkFilterKey, string>> = {}
  for (const key of WORK_FILTER_KEYS) {
    const value = readSearchParam(searchParams, key)
    if (value !== undefined) raw[key] = value.trim()
  }
  const parsed = filtersSchema.parse(raw)
  const filters: WorkFilters = {}
  if (parsed.discipline) filters.discipline = parsed.discipline
  if (parsed.software) filters.software = parsed.software
  if (parsed.featured) filters.featured = true
  return {
    filters,
    page: parsePageParam(readSearchParam(searchParams, 'page')),
    hasFilterParams: Object.keys(raw).length > 0,
  }
}

/** 是否选择了任一筛选条件（用于显示“清除筛选”） */
export function hasActiveWorkFilters(filters: WorkFilters): boolean {
  return WORK_FILTER_KEYS.some((key) => filters[key] !== undefined)
}

function matches(work: WorkCardData, key: WorkFilterKey, value: string): boolean {
  switch (key) {
    case 'discipline':
      return work.discipline?.slug === value
    case 'software':
      return work.software.includes(value)
    case 'featured':
      return value === FEATURED_PARAM_VALUE && work.featured
  }
}

/** 筛选条件 → { 维度: URL 取值 }（只含已选择的维度） */
function filterValues(filters: WorkFilters): Partial<Record<WorkFilterKey, string>> {
  const values: Partial<Record<WorkFilterKey, string>> = {}
  if (filters.discipline !== undefined) values.discipline = filters.discipline
  if (filters.software !== undefined) values.software = filters.software
  if (filters.featured) values.featured = FEATURED_PARAM_VALUE
  return values
}

function filterByValues(
  works: readonly WorkCardData[],
  values: Partial<Record<WorkFilterKey, string>>,
): WorkCardData[] {
  return works.filter((work) =>
    WORK_FILTER_KEYS.every((key) => {
      const value = values[key]
      return value === undefined || matches(work, key, value)
    }),
  )
}

/** 按筛选条件过滤作品（各维度同时满足），保持原有顺序 */
export function filterWorks(works: readonly WorkCardData[], filters: WorkFilters): WorkCardData[] {
  return filterByValues(works, filterValues(filters))
}

/** 某个维度的全部候选取值（按后台排序），标签：专业方向用简称、软件用名称 */
function candidates(key: WorkFilterKey, facets: WorkFacets): { value: string; label: string }[] {
  switch (key) {
    case 'discipline':
      return facets.disciplines.map((d) => ({ value: d.slug, label: d.shortName }))
    case 'software':
      return facets.software.map((s) => ({ value: s.slug, label: s.name }))
    case 'featured':
      return [{ value: FEATURED_PARAM_VALUE, label: zh.works.filters.featuredOnly }]
  }
}

/**
 * 推导筛选栏每一行的可选项与数量：
 * - 某一维度的数量 = 其它维度保持当前选择、该维度选中此项时的作品数；
 * - 只列出至少有一件作品的取值（顺序按 facets：专业方向、软件都按后台排序）；
 *   例外：当前选中的取值即使数量为 0 也保留，让访客看得到并能取消（不在 facets 里的取值不显示）；
 * - “精选”一行只有“只看精选”一项。
 * “全部”项不在返回值里（见 buildWorkFilterRows / workFilterHref(filters, key, undefined)）。
 */
export function buildWorkFilterOptions(
  works: readonly WorkCardData[],
  filters: WorkFilters,
  facets: WorkFacets,
): Record<WorkFilterKey, FilterOption[]> {
  const values = filterValues(filters)
  const result = {} as Record<WorkFilterKey, FilterOption[]>
  for (const key of WORK_FILTER_KEYS) {
    const others = filterByValues(works, { ...values, [key]: undefined })
    const selected = values[key]
    result[key] = candidates(key, facets)
      .map((c) => ({
        value: c.value,
        label: c.label,
        count: others.filter((work) => matches(work, key, c.value)).length,
        selected: c.value === selected,
      }))
      .filter((option) => option.count > 0 || option.selected)
  }
  return result
}

/** 按固定参数顺序拼出 /works 的地址；page ≤ 1 时不带 page */
export function workListHref(filters: WorkFilters, page = 1): string {
  const params = new URLSearchParams()
  const values = filterValues(filters)
  for (const key of WORK_FILTER_KEYS) {
    const value = values[key]
    if (value) params.set(key, value)
  }
  if (Number.isInteger(page) && page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `${WORKS_PATH}?${query}` : WORKS_PATH
}

/**
 * 筛选链接：在当前条件上切换某一维度，并回到第 1 页（不带 page）。
 * - value 为 undefined：该维度改为“全部”；
 * - value 与当前选择相同：取消该维度（再点一次即取消）；
 * - 否则：该维度改为 value（单选，替换原值）。精选的取值是 FEATURED_PARAM_VALUE（'1'）。
 * 交给 next/link 使用（会自动补 basePath）。
 */
export function workFilterHref(
  filters: WorkFilters,
  key: WorkFilterKey,
  value: string | undefined,
): string {
  const values = filterValues(filters)
  const current = values[key]
  const nextValue = value !== undefined && current === value ? undefined : value
  const next: WorkFilters = { ...filters }
  if (key === 'featured') {
    if (nextValue === FEATURED_PARAM_VALUE) next.featured = true
    else delete next.featured
  } else if (nextValue === undefined) {
    delete next[key]
  } else {
    next[key] = nextValue
  }
  return workListHref(next)
}

/**
 * 通用筛选栏（<FilterBar rows>）的三行：专业方向 / 软件 / 精选。
 * 每行的“全部”数量 = 其它维度保持当前选择时的作品数；链接都回到第 1 页。
 */
export function buildWorkFilterRows(
  works: readonly WorkCardData[],
  filters: WorkFilters,
  facets: WorkFacets,
): FilterBarRow[] {
  const options = buildWorkFilterOptions(works, filters, facets)
  const t = zh.works.filters
  return WORK_FILTER_KEYS.map((key) => ({
    key,
    label: t[key],
    options: options[key].map((option) => ({
      label: option.label,
      count: option.count,
      href: workFilterHref(filters, key, option.value),
      selected: option.selected,
    })),
    allHref: workFilterHref(filters, key, undefined),
    allCount: filterWorks(works, { ...filters, [key]: undefined }).length,
    allSelected: filters[key] === undefined,
  }))
}
