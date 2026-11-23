import type { Metadata } from 'next'

import { PreviewBanner } from '@/components/common/preview-banner'
import { SkipLink } from '@/components/common/skip-link'
import { StatusPage } from '@/components/common/status-page'
import { SiteChrome } from '@/components/layout/site-chrome'
import { siteFallback } from '@/config/site'
import { fontDisplay } from '@/fonts'
import { zh } from '@/i18n/zh'
import '@/styles/globals.css'

/**
 * 未匹配任何路由时的 404（前台与后台是两个根布局，无法共用 not-found.tsx）。
 * 与正常页面一样带导航和页脚，方便访客继续浏览。
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
        <SiteChrome>
          <StatusPage
            eyebrow={zh.notFound.eyebrow}
            title={zh.notFound.title}
            description={zh.notFound.description}
            homeLabel={zh.notFound.backHome}
          />
        </SiteChrome>
      </body>
    </html>
  )
}
