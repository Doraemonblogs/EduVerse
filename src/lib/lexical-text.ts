/**
 * 从 Lexical 富文本（Payload richText 字段存储的 JSON）中提取纯文本，
 * 用于站内搜索索引（articles.searchText）、摘要兜底等场景。
 */

/** 块级节点：前后各换一行，避免相邻段落的文字粘连 */
const BLOCK_NODE_TYPES = new Set(['paragraph', 'heading', 'quote', 'list', 'listitem', 'tablecell'])

/** 防御异常数据：超过该深度的节点直接忽略，避免栈溢出 */
const MAX_DEPTH = 64

type LexicalNode = {
  type?: unknown
  text?: unknown
  children?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 按字符（码点）截断，不会把 emoji 等代理对截成半个 */
export function truncateText(text: string, maxLength: number): string {
  if (!Number.isFinite(maxLength) || maxLength <= 0) return ''
  const limit = Math.floor(maxLength)
  if (text.length <= limit) return text
  const chars = Array.from(text)
  return chars.length <= limit ? text : chars.slice(0, limit).join('').trimEnd()
}

function collect(node: unknown, parts: string[], depth: number, seen: WeakSet<object>): void {
  if (!isRecord(node) || depth > MAX_DEPTH || seen.has(node)) return
  seen.add(node)

  const { type, text, children } = node as LexicalNode

  if (type === 'text') {
    if (typeof text === 'string') parts.push(text)
    return
  }
  if (type === 'linebreak') {
    parts.push('\n')
    return
  }
  if (type === 'tab') {
    parts.push(' ')
    return
  }

  const isBlock = typeof type === 'string' && BLOCK_NODE_TYPES.has(type)
  if (isBlock) parts.push('\n')
  if (Array.isArray(children)) {
    for (const child of children) collect(child, parts, depth + 1, seen)
  }
  if (isBlock) parts.push('\n')
}

/**
 * 把 Lexical 编辑器状态（`{ root: { children: [...] } }`）转换为纯文本：
 * 拼接所有文本节点，块级节点（段落、标题、列表项、引用）之间换行，
 * 合并多余空白与空行，最后截断到 maxLength 个字符。无法识别的输入返回空字符串。
 */
export function lexicalToPlainText(value: unknown, maxLength = 5000): string {
  if (!isRecord(value) || !isRecord(value.root)) return ''

  const parts: string[] = []
  collect(value.root, parts, 0, new WeakSet())

  const text = parts
    .join('')
    .split('\n')
    // \s 已包含不换行空格与全角空格（U+3000）
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')

  return truncateText(text, maxLength)
}
