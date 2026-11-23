import type * as React from 'react'

import { Container } from '@/components/common/container'
import { Section, type SectionTone } from '@/components/common/section'
import { SectionHeading } from '@/components/common/section-heading'
import type { HomeSectionHeading } from '@/lib/home/types'
import { cn } from '@/lib/utils'

import { CAREERS_CONTAINER_CLASS } from './careers-layout'

type CareersSectionProps = {
  /** 区块 id（页内锚点）；标题 id 为 `${id}-title`，区块用 aria-labelledby 关联 */
  id: string
  /** 眉标 / 标题 / 描述：运营文案，来自后台「就业服务页」对应标签页 */
  heading: HomeSectionHeading
  /** 后台没有填写描述时显示的系统说明（可选） */
  fallbackDescription?: string
  tone: SectionTone
  className?: string
  children: React.ReactNode
}

/** 就业服务页的内容区块：通栏底色 + 版心 + 区块标题（h2）+ 内容 */
export function CareersSection({
  id,
  heading,
  fallbackDescription,
  tone,
  className,
  children,
}: CareersSectionProps) {
  const titleId = `${id}-title`
  return (
    <Section id={id} tone={tone} aria-labelledby={titleId} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', CAREERS_CONTAINER_CLASS)}>
        <SectionHeading
          id={titleId}
          eyebrow={heading.eyebrow ?? undefined}
          title={heading.title}
          description={heading.description ?? fallbackDescription}
        />
        <div className="min-w-0">{children}</div>
      </Container>
    </Section>
  )
}
