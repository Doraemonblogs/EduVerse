import type { Metadata, Viewport } from 'next'
import type * as React from 'react'

import { PreviewBanner } from '@/components/common/preview-banner'
import { SkipLink } from '@/components/common/skip-link'
import { getSiteUrl, siteFallback } from '@/config/site'
import { fontDisplay } from '@/fonts'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteFallback.name,
    template: `%s - ${siteFallback.name}`,
  },
  description: siteFallback.description,
  // 页面里的电话号码统一由组件显式输出 tel: 链接，关闭浏览器自动识别
  formatDetection: { telephone: false, email: false, address: false },
  other: {
    // 百度：声明同一 URL 同时适配 PC 与移动端
    'applicable-device': 'pc,mobile',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: siteFallback.themeColor,
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={fontDisplay.variable}>
      <head>
        {/* 百度：禁止转码与生成 Siteapp */}
        <meta httpEquiv="Cache-Control" content="no-transform" />
        <meta httpEquiv="Cache-Control" content="no-siteapp" />
      </head>
      <body className="flex flex-col">
        <SkipLink />
        <PreviewBanner />
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </main>
      </body>
    </html>
  )
}
