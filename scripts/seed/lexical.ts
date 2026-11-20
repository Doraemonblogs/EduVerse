import type { RichBlock } from './types'

/**
 * 把简化的富文本块转换为 Payload Lexical 编辑器的 JSON 结构（种子数据专用）。
 */

type LexicalNode = { type: string; version: number; [key: string]: unknown }

const base = { direction: 'ltr' as const, format: '', indent: 0, version: 1 }

function text(value: string): LexicalNode {
  return { type: 'text', text: value, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }
}

function paragraph(value: string): LexicalNode {
  return { ...base, type: 'paragraph', textFormat: 0, textStyle: '', children: [text(value)] }
}

function heading(tag: 'h2' | 'h3', value: string): LexicalNode {
  return { ...base, type: 'heading', tag, children: [text(value)] }
}

function list(kind: 'bullet' | 'number', items: string[]): LexicalNode {
  return {
    ...base,
    type: 'list',
    listType: kind,
    tag: kind === 'bullet' ? 'ul' : 'ol',
    start: 1,
    children: items.map((item, i) => ({
      ...base,
      type: 'listitem',
      value: i + 1,
      children: [text(item)],
    })),
  }
}

function quote(value: string): LexicalNode {
  return { ...base, type: 'quote', children: [text(value)] }
}

function toNode(block: RichBlock): LexicalNode {
  if ('h2' in block) return heading('h2', block.h2)
  if ('h3' in block) return heading('h3', block.h3)
  if ('p' in block) return paragraph(block.p)
  if ('ul' in block) return list('bullet', block.ul)
  if ('ol' in block) return list('number', block.ol)
  return quote(block.quote)
}

export type LexicalState = {
  root: {
    type: string
    children: LexicalNode[]
    direction: 'ltr' | 'rtl' | null
    format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify'
    indent: number
    version: number
  }
}

export function toLexical(blocks: RichBlock[]): LexicalState {
  return {
    root: { ...base, type: 'root', format: '', indent: 0, children: blocks.map(toNode) },
  }
}
