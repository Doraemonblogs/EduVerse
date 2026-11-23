import type { BreadcrumbItem } from '@/lib/seo/json-ld'

import { Breadcrumbs } from './breadcrumbs'
import { Container } from './container'
import { Section } from './section'

type PageHeaderProps = {
  /** 页面主标题（h1），来自 CMS */
  title: string
  /** 首页之后的面包屑（最后一项为当前页） */
  breadcrumbs: BreadcrumbItem[]
  /** 标题下的简介（可选，来自 CMS） */
  description?: string | null
  /** 与正文版心对齐：正文窄版（prose）时标题区也用窄版 */
  size?: 'site' | 'prose'
}

/** 页面标题区：米色区块，面包屑在上，h1 在下 */
export function PageHeader({ title, breadcrumbs, description, size = 'site' }: PageHeaderProps) {
  return (
    <Section tone="paper" spacing="sm">
      <Container size={size} className="flex flex-col gap-5 md:gap-6">
        <Breadcrumbs items={breadcrumbs} />
        <div className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-h1 text-foreground">{title}</h1>
          {description ? (
            <p className="text-base text-muted-foreground md:text-lg">{description}</p>
          ) : null}
        </div>
      </Container>
    </Section>
  )
}
