import Link from 'next/link'
import * as React from 'react'

import { Button } from '@/components/ui/button'

import { Container } from './container'
import { Section } from './section'

type StatusPageProps = {
  eyebrow: string
  title: string
  description: string
  /** 主操作，默认返回首页 */
  primaryAction?: React.ReactNode
  homeLabel: string
}

/** 404 / 错误等状态页的统一版式 */
export function StatusPage({
  eyebrow,
  title,
  description,
  primaryAction,
  homeLabel,
}: StatusPageProps) {
  return (
    <Section tone="dark" className="flex min-h-[70dvh] flex-1 items-center">
      <Container>
        <div className="flex max-w-2xl flex-col gap-5">
          <p className="eyebrow text-muted-foreground">{eyebrow}</p>
          <h1 className="text-h1">{title}</h1>
          <p className="text-lg text-muted-foreground">{description}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {primaryAction}
            <Button asChild variant={primaryAction ? 'outline' : 'primary'}>
              <Link href="/">{homeLabel}</Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  )
}
