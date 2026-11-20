import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Button } from '@/components/ui/button'
import { siteFallback } from '@/config/site'

/**
 * 临时首页（M0）。正式首页在 M5 实现，届时所有区块内容来自后台「首页」配置。
 * 在此之前不允许搜索引擎收录。
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function HomePage() {
  const isDev = process.env.NODE_ENV !== 'production'
  // 与 /styleguide 页面的开放条件一致；预览站构建时开启
  const showStyleguide = isDev || process.env.ENABLE_STYLEGUIDE === 'true'

  return (
    <Section tone="dark" className="flex min-h-dvh items-center">
      <Container className="flex flex-col gap-6">
        <p className="eyebrow text-muted-foreground">{siteFallback.shortName}</p>
        <h1 className="text-display">{siteFallback.name}</h1>
        <p className="max-w-xl text-lg text-muted-foreground">官网建设中。</p>
        {showStyleguide || isDev ? (
          <div className="flex flex-wrap gap-3">
            {showStyleguide ? (
              <Button asChild>
                <Link href="/styleguide">
                  查看设计规范 <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : null}
            {isDev ? (
              <Button asChild variant="outline">
                <Link href="/admin" prefetch={false}>
                  进入后台
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </Container>
    </Section>
  )
}
