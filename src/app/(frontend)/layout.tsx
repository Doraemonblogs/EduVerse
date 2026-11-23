import type { Metadata, Viewport } from 'next'
import type * as React from 'react'

import { SiteChrome } from '@/components/layout/site-chrome'
import { PreviewBanner } from '@/components/common/preview-banner'
import { SkipLink } from '@/components/common/skip-link'
import { getSiteUrl, siteFallback } from '@/config/site'
import { fontDisplay } from '@/fonts'
import { getSiteSettings, getThirdPartyConfig } from '@/lib/data/site'
import '@/styles/globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const [settings, thirdParty] = await Promise.all([getSiteSettings(), getThirdPartyConfig()])
  const brand = settings.brandName || siteFallback.name
  const template = settings.titleTemplate || `%s - ${brand}`

  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: settings.defaultSeo?.title || brand, template },
    description: settings.defaultSeo?.description || siteFallback.description,
    keywords: settings.defaultSeo?.keywords || undefined,
    // 页面里的电话号码统一由组件显式输出 tel: 链接，关闭浏览器自动识别
    formatDetection: { telephone: false, email: false, address: false },
    verification: thirdParty.baiduSiteVerification
      ? { other: { 'baidu-site-verification': thirdParty.baiduSiteVerification } }
      : undefined,
    other: {
      // 百度：声明同一 URL 同时适配 PC 与移动端
      'applicable-device': 'pc,mobile',
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 铺满刘海屏：iOS 不再自动留出左右安全区，由版心工具类（globals.css container-*）
  // 与固定元素（底部操作条、弹窗、抽屉、返回顶部）各自用 env(safe-area-inset-*) 避让
  viewportFit: 'cover',
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
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  )
}
