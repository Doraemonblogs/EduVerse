/**
 * 搜索结果的高亮与摘要（纯函数）。
 *
 * 高亮只把文本拆成片段（{ text, match }），由组件把 match 为 true 的片段渲染成 <mark>：
 * 不拼接 HTML 字符串，不使用 dangerouslySetInnerHTML，React 会对文本做转义（XSS 字符串原样显示）。
 * 匹配大小写不敏感（与数据库 ILIKE 一致），检索词里的正则特殊字符按字面匹配。
 */

export type HighlightPart = { text: string; match: boolean }

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 匹配任一检索词的正则（长词优先，避免“ui”抢先匹配“ui设计”的开头）；没有有效检索词时返回 null */
function termsPattern(terms: readonly string[]): RegExp | null {
  const words = [...new Set(terms.map((term) => term.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  )
  if (words.length === 0) return null
  return new RegExp(words.map(escapeRegExp).join('|'), 'giu')
}

/**
 * 把文本拆成高亮片段：相邻片段 match 不同，空字符串不产生片段。
 * 没有检索词或没有匹配时返回整段（match: false）。
 */
export function splitHighlight(text: string, terms: readonly string[]): HighlightPart[] {
  if (!text) return []
  const pattern = termsPattern(terms)
  if (!pattern) return [{ text, match: false }]
  const parts: HighlightPart[] = []
  let last = 0
  for (const found of text.matchAll(pattern)) {
    const start = found.index
    const end = start + found[0].length
    if (start > last) parts.push({ text: text.slice(last, start), match: false })
    const previous = parts[parts.length - 1]
    if (previous?.match) previous.text += found[0]
    else parts.push({ text: found[0], match: true })
    last = end
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false })
  return parts
}

/** 文本中第一个匹配的位置；没有匹配时返回 -1 */
export function firstMatchIndex(text: string, terms: readonly string[]): number {
  const pattern = termsPattern(terms)
  if (!pattern) return -1
  return text.search(new RegExp(pattern.source, 'iu'))
}

/** 摘要默认长度（字符数，不含省略号） */
export const EXCERPT_LENGTH = 90

/** 匹配位置之前保留的字符数 */
const EXCERPT_LEAD = 24

const ELLIPSIS = '…'

/** 按码点截取，不把代理对（emoji 等）拆成半个字符 */
function sliceChars(chars: readonly string[], start: number, end: number): string {
  return chars.slice(start, end).join('')
}

/**
 * 摘要：把空白合并为一个空格后，截取第一个匹配附近的一段（匹配前保留少量上下文），
 * 被截断的一端加省略号；没有匹配时取开头。文本为空时返回 null。
 */
export function buildExcerpt(
  text: string | null | undefined,
  terms: readonly string[],
  length: number = EXCERPT_LENGTH,
): string | null {
  const clean = (text ?? '').replace(/\s+/gu, ' ').trim()
  if (!clean) return null
  const chars = Array.from(clean)
  if (chars.length <= length) return clean
  const matchAt = firstMatchIndex(clean, terms)
  // 匹配位置（UTF-16 下标）换算成码点下标
  const matchChar = matchAt > 0 ? Array.from(clean.slice(0, matchAt)).length : 0
  // 摘要较短时按比例减少匹配前的上下文，保证匹配本身落在摘要里
  const lead = Math.min(EXCERPT_LEAD, Math.floor(length / 3))
  const start = Math.max(0, Math.min(matchChar - lead, chars.length - length))
  const end = Math.min(chars.length, start + length)
  const body = sliceChars(chars, start, end).trim()
  return `${start > 0 ? ELLIPSIS : ''}${body}${end < chars.length ? ELLIPSIS : ''}`
}
