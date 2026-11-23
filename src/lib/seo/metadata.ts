import 'server-only'

import type { Metadata } from 'next'

import { getSiteUrl, siteFallback } from '@/config/site'
import { getSiteSettings } from '@/lib/data/site'
import { type ImageSource, imageSource } from '@/lib/media'

type SeoInput =
  | {
      title?: string | null
      description?: string | null
      keywords?: string | null
      image?: unknown
      noindex?: boolean | null
    }
  | null
  | undefined

type BuildMetadataArgs = {
  /** 内容自带的 SEO 字段组（seo tab） */
  seo?: SeoInput
  /** SEO 标题为空时使用的标题（如内容标题） */
  title?: string
  /** SEO 描述为空时使用的描述（如摘要） */
  description?: string | null
  /** 封面等兜底分享图（媒体文档，取 og 尺寸） */
  image?: unknown
  /**
   * 数据层已按 og 尺寸处理好的兜底分享图（如课程视图模型的 shareImage），优先于 image。
   * 地址已带 basePath，不会重复添加
   */
  shareImage?: ImageSource | null
  /** 站内路径（不含 basePath），用于 canonical 与 og:url */
  path: string
  /** 首页等不需要套用标题模板的页面 */
  absoluteTitle?: boolean
}

/**
 * 统一生成页面元数据：内容 SEO 字段 → 内容兜底 → 站点默认 SEO。
 * 标题模板取自站点设置（%s 替换为页面标题）。
 */
export async function buildMetadata({
  seo,
  title,
  description,
  image,
  shareImage,
  path,
  absoluteTitle,
}: BuildMetadataArgs): Promise<Metadata> {
  const settings = await getSiteSettings()
  const defaults = settings.defaultSeo
  const template = settings.titleTemplate || `%s - ${settings.brandName || siteFallback.name}`

  const pageTitle =
    seo?.title || title || defaults?.title || settings.brandName || siteFallback.name
  const fullTitle = absoluteTitle || seo?.title ? pageTitle : template.replace('%s', pageTitle)
  const desc = seo?.description || description || defaults?.description || siteFallback.description
  const keywords = seo?.keywords || defaults?.keywords || undefined
  const og =
    imageSource(seo?.image, 'og') ??
    shareImage ??
    imageSource(image, 'og') ??
    imageSource(defaults?.image, 'og')
  const siteUrl = getSiteUrl()
  const url = `${siteUrl}${path === '/' ? '' : path}`
  // 分享图给完整地址：imageSource 已补 basePath，若交给 metadataBase 解析，
  // 子路径部署（站点地址含 /EduVerse）会再拼一次子路径。以 / 开头的地址会替换站点地址的路径部分。
  const ogImage = og
    ? { url: new URL(og.src, siteUrl).href, width: og.width, height: og.height, alt: og.alt }
    : undefined

  return {
    title: { absolute: fullTitle },
    description: desc,
    keywords,
    alternates: { canonical: url },
    robots: seo?.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      locale: siteFallback.locale,
      siteName: settings.brandName || siteFallback.name,
      title: fullTitle,
      description: desc,
      url,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}
