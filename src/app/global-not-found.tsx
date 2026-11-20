import type { Metadata } from 'next'

import { PreviewBanner } from '@/components/common/preview-banner'
import { SkipLink } from '@/components/common/skip-link'
import { StatusPage } from '@/components/common/status-page'
import { siteFallback } from '@/config/site'
import { fontDisplay } from '@/fonts'
import { zh } from '@/i18n/zh'
import '@/styles/globals.css'

/**
 * 未匹配任何路由时的 404（前台与后台是两个根布局，无法共用 not-found.tsx）。
 * 路由内主动调用 notFound() 时使用 (frontend)/not-found.tsx。
 */
export const metadata: Metadata = {
  title: `${zh.notFound.title} - ${siteFallback.name}`,
  robots: { index: false, follow: true },
}

export default function GlobalNotFound() {
  return (
    <html lang="zh-CN" className={fontDisplay.variable}>
      <body className="flex flex-col">
        <SkipLink />
        <PreviewBanner />
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          <StatusPage
            eyebrow={zh.notFound.eyebrow}
            title={zh.notFound.title}
            description={zh.notFound.description}
            homeLabel={zh.notFound.backHome}
          />
        </main>
      </body>
    </html>
  )
}
