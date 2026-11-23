import 'server-only'

import type { Metadata } from 'next'

import { getSiteUrl, siteFallback } from '@/config/site'
import { zh } from '@/i18n/zh'
import { withBasePath } from '@/lib/base-path'
import { formatMessage } from '@/lib/course/format'
import { getSiteSettings } from '@/lib/data/site'
import { type ImageSource, imageSource } from '@/lib/media'

import defaultShareImageFile from './default-share-image.png'

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
  /**
   * 可收录的分页列表的页码：第 2 页起在描述后加页码，避免各页描述重复
   * （标题的页码由调用方加在 title / seo.title 上）
   */
  page?: number
}

/** Open Graph 分享图的尺寸：媒体集合的 og 裁切（src/collections/Media.ts） */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const

/**
 * 是否为 1200×630 的分享图。原图宽高都小于 og 尺寸时 Payload 不生成 og 裁切，
 * imageSource 会回退到原图（如 600×600 的讲师头像），这样的图不作为分享图，继续往下兜底。
 */
export function isOgSized(image: ImageSource | null | undefined): image is ImageSource {
  return image?.width === OG_IMAGE_SIZE.width && image.height === OG_IMAGE_SIZE.height
}

/**
 * 内置兜底分享图（1200×630，scripts/seo/generate-default-share-image.ts 生成）：
 * 内容与站点设置都没有可用分享图时使用（如全新部署的空库）。静态导入的图片带内容哈希，可长期缓存。
 */
function defaultShareImage(alt: string): ImageSource {
  return {
    src: withBasePath(defaultShareImageFile.src),
    alt,
    width: defaultShareImageFile.width,
    height: defaultShareImageFile.height,
  }
}

/** 分页列表第 2 页起的描述：加上页码 */
export function pagedDescription(description: string, page: number | undefined): string {
  return page !== undefined && Number.isInteger(page) && page > 1
    ? formatMessage(zh.seo.pagedDescription, { description, page })
    : description
}

/**
 * 统一生成页面元数据：内容 SEO 字段 → 内容兜底 → 站点默认 SEO。
 * 标题模板取自站点设置（%s 替换为页面标题）。
 * 分享图：内容 SEO 分享图 → 数据层的 shareImage → 封面 → 站点默认分享图 → 内置兜底图，只取 1200×630 的。
 */
export async function buildMetadata({
  seo,
  title,
  description,
  image,
  shareImage,
  path,
  absoluteTitle,
  page,
}: BuildMetadataArgs): Promise<Metadata> {
  const settings = await getSiteSettings()
  const defaults = settings.defaultSeo
  const brand = settings.brandName || siteFallback.name
  const template = settings.titleTemplate || `%s - ${brand}`

  const pageTitle = seo?.title || title || defaults?.title || brand
  // 用函数作替换值：页面标题可能含访客输入（如搜索词“$&”“$'”），字符串替换值会把 $ 模式展开
  const fullTitle =
    absoluteTitle || seo?.title ? pageTitle : template.replace('%s', () => pageTitle)
  const desc = pagedDescription(
    seo?.description || description || defaults?.description || siteFallback.description,
    page,
  )
  const keywords = seo?.keywords || defaults?.keywords || undefined
  const og =
    [
      imageSource(seo?.image, 'og'),
      shareImage,
      imageSource(image, 'og'),
      imageSource(defaults?.image, 'og'),
    ].find(isOgSized) ?? defaultShareImage(brand)
  const siteUrl = getSiteUrl()
  const url = `${siteUrl}${path === '/' ? '' : path}`
  // 分享图给完整地址：imageSource 已补 basePath，若交给 metadataBase 解析，
  // 子路径部署（站点地址含 /EduVerse）会再拼一次子路径。以 / 开头的地址会替换站点地址的路径部分。
  const ogImage = {
    url: new URL(og.src, siteUrl).href,
    width: og.width,
    height: og.height,
    alt: og.alt || brand,
  }

  return {
    title: { absolute: fullTitle },
    description: desc,
    keywords,
    alternates: { canonical: url },
    robots: seo?.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      locale: siteFallback.locale,
      siteName: brand,
      title: fullTitle,
      description: desc,
      url,
      images: [ogImage],
    },
  }
}
