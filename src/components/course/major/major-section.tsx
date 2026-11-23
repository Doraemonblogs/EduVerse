import type * as React from 'react'

import { Container } from '@/components/common/container'
import { Section, type SectionTone } from '@/components/common/section'
import { SectionHeading } from '@/components/common/section-heading'
import { cn } from '@/lib/utils'

type MajorSectionProps = {
  /** 区块 id（页内唯一）；标题 id 为 `${id}-title`，区块用 aria-labelledby 关联 */
  id: string
  tone: SectionTone
  title: string
  description?: string
  /** 标题右侧的操作区 */
  actions?: React.ReactNode
  /**
   * 版式：stacked 标题在上、内容在下；
   * split 桌面端标题在左（滚动时吸顶）、内容在右，适合长篇正文。
   */
  layout?: 'stacked' | 'split'
  className?: string
  children: React.ReactNode
}

/** 专业方向页的内容区块：<Section> + 版心 + 区块标题（h2） */
export function MajorSection({
  id,
  tone,
  title,
  description,
  actions,
  layout = 'stacked',
  className,
  children,
}: MajorSectionProps) {
  const titleId = `${id}-title`
  const split = layout === 'split'

  return (
    <Section id={id} tone={tone} aria-labelledby={titleId} className={className}>
      <Container
        className={cn(
          'flex flex-col gap-8 md:gap-12',
          split && 'lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16',
        )}
      >
        <SectionHeading
          id={titleId}
          title={title}
          description={description}
          actions={actions}
          className={cn(split && 'lg:sticky lg:top-24 lg:self-start')}
        />
        <div className="min-w-0">{children}</div>
      </Container>
    </Section>
  )
}
