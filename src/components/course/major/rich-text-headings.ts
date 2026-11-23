/**
 * 把富文本（Payload Lexical）里的标题整体降级，使最高一级标题落在 `topLevel`（默认 h3）。
 *
 * 专业介绍放在 h2 区块标题“专业介绍”之下，而后台录入的正文习惯从 h2 写起；
 * 原样输出会让正文小标题与区块标题同级。这里按相对层级整体下移（h2→h3、h3→h4…，最多到 h6），
 * 保持标题层级不跳级。正文没有标题、或最高一级已不高于 `topLevel` 时原样返回。
 *
 * 只沿 root / children 遍历节点（不进入链接、上传等节点里填充的文档），不修改传入的数据。
 */

const MAX_LEVEL = 6

type NodeRecord = Record<string, unknown>

function isRecord(value: unknown): value is NodeRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 标题节点的级别（1–6）；不是标题节点返回 null */
function headingLevel(node: NodeRecord): number | null {
  if (node.type !== 'heading' || typeof node.tag !== 'string') return null
  const match = /^h([1-6])$/.exec(node.tag)
  return match ? Number(match[1]) : null
}

function collectHeadings(value: unknown, into: NodeRecord[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectHeadings(item, into)
    return
  }
  if (!isRecord(value)) return
  if (headingLevel(value) !== null) into.push(value)
  collectHeadings(value.root, into)
  collectHeadings(value.children, into)
}

export function shiftRichTextHeadings<T extends object>(data: T, topLevel = 3): T {
  const copy = structuredClone(data)
  const headings: NodeRecord[] = []
  collectHeadings(copy, headings)

  const levels = headings.map(headingLevel).filter((level) => level !== null)
  if (levels.length === 0) return data
  const offset = topLevel - Math.min(...levels)
  if (offset <= 0) return data

  for (const heading of headings) {
    const level = headingLevel(heading)
    if (level !== null) heading.tag = `h${Math.min(MAX_LEVEL, level + offset)}`
  }
  return copy
}
