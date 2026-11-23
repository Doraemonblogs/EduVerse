import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { readSearchParam, type SearchParamsInput } from '@/lib/search-params'
import { type ParsedSearchQuery, SEARCH_PARAM, SEARCH_QUERY_MAX } from '@/lib/search/query'

/**
 * 站内搜索页 /search 的纯函数（页面、元数据与单元测试共用）。
 */

const t = zh.search

export { SEARCH_PATH } from './search-input'

/**
 * 页面标题（套用站点标题模板）：关键词合法时为“搜索：{关键词}”，
 * 没有关键词、只有空白或超长时为“站内搜索”。
 */
export function searchPageTitle(parsed: ParsedSearchQuery): string {
  return parsed.status === 'ok'
    ? formatMessage(t.page.title, { query: parsed.query })
    : t.page.titleEmpty
}

/**
 * 收录规则：URL 里有 q 参数（不论取值是否合法）→ noindex, follow；canonical 一律为 /search。
 * 只有不带关键词的搜索页可以收录。
 */
export function searchPageNoindex(searchParams: SearchParamsInput): boolean {
  return readSearchParam(searchParams, SEARCH_PARAM) !== undefined
}

/**
 * 传给搜索框（客户端组件）的原始 q：用来判断是否发生了一次导航（同步输入框、结束“搜索中”状态）。
 * 截断到上限的两倍，避免把地址栏里任意长的参数整段写进页面数据。没有 q 时为 null。
 */
export function searchNavigationKey(searchParams: SearchParamsInput): string | null {
  const raw = readSearchParam(searchParams, SEARCH_PARAM)
  return raw === undefined ? null : raw.slice(0, SEARCH_QUERY_MAX * 2)
}

export type SearchFormMessage = { kind: 'hint' | 'error'; text: string }

/**
 * 搜索框下方的提示：q 存在但为空白 → 提示输入关键词；超长 → 错误（输入框 aria-invalid）；其余不显示。
 */
export function searchFormMessage(
  parsed: ParsedSearchQuery,
  navigationKey: string | null,
): SearchFormMessage | null {
  if (parsed.status === 'tooLong') {
    return { kind: 'error', text: formatMessage(t.form.tooLong, { max: SEARCH_QUERY_MAX }) }
  }
  if (parsed.status === 'empty' && navigationKey !== null) {
    return { kind: 'hint', text: t.form.emptyHint }
  }
  return null
}

/** 搜索框的初始值：合法时为规范化后的关键词，超长时为截断后的关键词，否则为空 */
export function searchInputValue(parsed: ParsedSearchQuery): string {
  if (parsed.status === 'ok') return parsed.query
  if (parsed.status === 'tooLong') return parsed.value
  return ''
}
