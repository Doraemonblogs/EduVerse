import { z } from 'zod'

import { readSearchParam, type SearchParamsInput } from '@/lib/search-params'
import { truncateText } from '@/lib/validation/lead'

/**
 * 站内搜索关键词（/search?q=）的校验与规范化（纯函数，页面、数据层与测试共用）。
 *
 * 规范化：Unicode NFKC（全角字母数字、全角空格转半角）→ 控制字符换成空格 → 连续空白合并为一个空格 → 去掉首尾空白。
 * 规范化后长度须为 1–50（UTF-16 码元，与 <input maxLength> 的计数方式一致）。
 * 关键词按空格拆成检索词：每个检索词都要在某个被搜索的字段里出现（AND），大小写不敏感，中文不分词。
 */

/** 关键词最大长度 */
export const SEARCH_QUERY_MAX = 50

/** 最多使用的检索词数（多出的忽略），避免一次查询拼出过多条件 */
export const SEARCH_TERMS_MAX = 5

/** 查询参数名 */
export const SEARCH_PARAM = 'q'

/** 关键词规范化（不校验长度） */
export function normalizeSearchQuery(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

/** 关键词校验规则：规范化后 1–50 个字 */
export const searchQuerySchema = z
  .string()
  .transform(normalizeSearchQuery)
  .pipe(z.string().min(1).max(SEARCH_QUERY_MAX))

/**
 * 拆分检索词：按空格拆分，忽略大小写去重；被其它检索词包含的检索词去掉（AND 语义下它是多余的，
 * 如“ui ui设计”只需“ui设计”）；最多 SEARCH_TERMS_MAX 个，保持原顺序。
 */
export function searchTerms(query: string): string[] {
  const words = normalizeSearchQuery(query).split(' ').filter(Boolean)
  const unique: string[] = []
  const seen = new Set<string>()
  for (const word of words) {
    const key = word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(word)
  }
  // 已忽略大小写去重：被另一个检索词包含，说明那个词更长，这个词是多余的
  const lowered = unique.map((word) => word.toLowerCase())
  return unique
    .filter((_, i) => !lowered.some((other, j) => j !== i && other.includes(lowered[i])))
    .slice(0, SEARCH_TERMS_MAX)
}

/** 缓存键：规范化 + 小写（搜索大小写不敏感，“Blender”与“blender”共用一份缓存） */
export function searchCacheKey(query: string): string {
  return normalizeSearchQuery(query).toLowerCase()
}

export type ParsedSearchQuery =
  /** 没有 q 参数，或只有空白：显示搜索框与热门入口，不查库 */
  | { status: 'empty' }
  /** 超过 50 个字：显示提示与搜索框（value 为截断到上限的关键词，用于回填输入框），不查库 */
  | { status: 'tooLong'; value: string }
  /** 合法：query 为规范化后的关键词，terms 为检索词 */
  | { status: 'ok'; query: string; terms: string[] }

/**
 * 解析页面的 searchParams：读取 q（重复出现时取第一个），规范化并校验长度。
 * 用法：`const parsed = parseSearchQuery(await searchParams)`。
 */
export function parseSearchQuery(input: SearchParamsInput): ParsedSearchQuery {
  const raw = readSearchParam(input, SEARCH_PARAM)
  if (raw === undefined) return { status: 'empty' }
  const normalized = normalizeSearchQuery(raw)
  if (!normalized) return { status: 'empty' }
  const parsed = searchQuerySchema.safeParse(normalized)
  if (!parsed.success) {
    return { status: 'tooLong', value: truncateText(normalized, SEARCH_QUERY_MAX).trim() }
  }
  return { status: 'ok', query: parsed.data, terms: searchTerms(parsed.data) }
}

/**
 * 检索词 → 数据库模糊匹配（Payload `contains`，即 PostgreSQL ILIKE '%…%'）的值：
 * 转义 LIKE 通配符 % 与 _ 以及转义符 \，让它们按字面匹配（搜“100%”不会匹配所有含“100”的内容）。
 */
export function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&')
}
