import * as React from 'react'

import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  /** 英文眉标（可选），如 COURSES */
  eyebrow?: string
  title: string
  description?: string
  /** 标题层级，默认 h2；页面主标题用 h1 */
  as?: 'h1' | 'h2' | 'h3'
  align?: 'start' | 'center'
  /** 右侧操作区（如“查看全部”链接），桌面端与标题底部对齐 */
  actions?: React.ReactNode
  id?: string
  className?: string
}

const titleSize = {
  h1: 'text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
} as const

/** 区块标题：眉标 + 标题 + 描述 + 操作区 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Tag = 'h2',
  align = 'start',
  actions,
  id,
  className,
}: SectionHeadingProps) {
  const centered = align === 'center'

  return (
    <div
      className={cn(
        'flex flex-col gap-6 md:flex-row md:items-end md:justify-between',
        centered && 'md:flex-col md:items-center md:text-center',
        className,
      )}
    >
      <div className={cn('flex max-w-3xl flex-col gap-3', centered && 'items-center')}>
        {eyebrow ? (
          <p className="eyebrow flex items-center gap-3 text-muted-foreground">
            <span aria-hidden className="h-px w-6 bg-current" />
            {eyebrow}
          </p>
        ) : null}
        <Tag id={id} className={cn(titleSize[Tag], 'text-foreground')}>
          {title}
        </Tag>
        {description ? (
          <p className="text-base text-muted-foreground md:text-lg">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  )
}
