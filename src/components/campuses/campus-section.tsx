import type * as React from 'react'

import { Container } from '@/components/common/container'
import { Section, type SectionTone } from '@/components/common/section'
import { SectionHeading } from '@/components/common/section-heading'

type CampusSectionProps = {
  /** 区块 id（页内唯一）；标题 id 为 `${id}-title`，区块用 aria-labelledby 关联 */
  id: string
  title: string
  description?: string
  /** 标题右侧的操作区（如“查看全部课程”） */
  actions?: React.ReactNode
  tone: SectionTone
  children: React.ReactNode
}

/** 校区详情页的内容区块（通栏）：区块标题（h2）+ 内容，标题用 aria-labelledby 关联 */
export function CampusSection({
  id,
  title,
  description,
  actions,
  tone,
  children,
}: CampusSectionProps) {
  const titleId = `${id}-title`
  return (
    <Section id={id} tone={tone} aria-labelledby={titleId}>
      {/* 贴右缘的“预约试听”、卡片按钮在 1024–1439px 会滚到桌面端悬浮操作栏下面：给它让出位置 */}
      <Container className="flex flex-col gap-8 md:gap-12 lg:avoid-floating-actions">
        <SectionHeading id={titleId} title={title} description={description} actions={actions} />
        <div className="min-w-0">{children}</div>
      </Container>
    </Section>
  )
}
