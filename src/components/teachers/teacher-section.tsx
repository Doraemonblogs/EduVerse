import type * as React from 'react'

import { Container } from '@/components/common/container'
import { Section, type SectionTone } from '@/components/common/section'
import { SectionHeading } from '@/components/common/section-heading'
import { cn } from '@/lib/utils'

type TeacherSectionProps = {
  /** 区块 id（页内唯一）；标题 id 为 `${id}-title`，区块用 aria-labelledby 关联 */
  id: string
  title: string
  description?: string
  /** 标题右侧的操作区 */
  actions?: React.ReactNode
  /**
   * 给出底色时渲染为通栏区块（<Section> + 版心）；
   * 不给时只是一个带标题的 <section>，放在外层区块里（如个人简介与从业经历并排）
   */
  tone?: SectionTone
  className?: string
  children: React.ReactNode
}

/** 讲师详情页的内容区块：区块标题（h2）+ 内容，标题用 aria-labelledby 关联 */
export function TeacherSection({
  id,
  title,
  description,
  actions,
  tone,
  className,
  children,
}: TeacherSectionProps) {
  const titleId = `${id}-title`
  const heading = (
    <SectionHeading id={titleId} title={title} description={description} actions={actions} />
  )

  if (tone) {
    return (
      <Section id={id} tone={tone} aria-labelledby={titleId} className={className}>
        <Container className="flex flex-col gap-8 md:gap-12">
          {heading}
          <div className="min-w-0">{children}</div>
        </Container>
      </Section>
    )
  }

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn('flex min-w-0 flex-col gap-6 md:gap-8', className)}
    >
      {heading}
      {children}
    </section>
  )
}
