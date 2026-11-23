import { Fragment } from 'react'

import { splitHighlight } from '@/lib/search/highlight'
import { cn } from '@/lib/utils'

type HighlightTextProps = {
  /** 纯文本（标题、摘要）；可能含任意字符（包括 HTML / 脚本字符串），一律按文字渲染 */
  text: string
  /** 检索词（parseSearchQuery 给出的 terms） */
  terms: readonly string[]
  className?: string
}

/**
 * 搜索结果高亮：把文本拆成片段（splitHighlight），匹配片段用 <mark> 包裹。
 * 只渲染文本节点，由 React 转义；不拼接 HTML、不使用 dangerouslySetInnerHTML。
 * 样式：强调色 + 加粗（不只靠颜色；标题本身已加粗时靠颜色与 <mark> 语义），不加底色以免像选中文字。
 */
export function HighlightText({ text, terms, className }: HighlightTextProps) {
  return splitHighlight(text, terms).map((part, index) =>
    part.match ? (
      <mark key={index} className={cn('bg-transparent font-semibold text-emphasis', className)}>
        {part.text}
      </mark>
    ) : (
      <Fragment key={index}>{part.text}</Fragment>
    ),
  )
}

/**
 * 把文案模板（如““{query}”共找到 {count} 条结果”）里的占位符替换为 React 节点（加粗数字等）。
 * 模板来自 zh.ts；替换值作为文本节点渲染，值里的“{…}”不会被再次替换。
 */
export function TemplateText({
  template,
  values,
}: {
  template: string
  values: Record<string, React.ReactNode>
}) {
  return template.split(/(\{\w+\})/).map((piece, index) => {
    const key = /^\{(\w+)\}$/.exec(piece)?.[1]
    if (key && key in values) return <Fragment key={index}>{values[key]}</Fragment>
    return piece ? <Fragment key={index}>{piece}</Fragment> : null
  })
}
