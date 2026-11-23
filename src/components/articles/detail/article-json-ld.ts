import { articlePath } from '@/lib/articles/paths'
import type { ArticleDetail } from '@/lib/articles/types'
import { homeJsonLdIds } from '@/lib/home/json-ld'
import { absoluteUrl, type JsonLdData } from '@/lib/seo/json-ld'

/**
 * 资讯详情的 Article 结构化数据（schema.org），配合 <JsonLd data={...} /> 输出；BreadcrumbList 由面包屑组件输出。
 * 纯函数：站点地址、品牌名与 Logo 由调用方传入，便于测试。
 */

export type ArticleJsonLdOptions = {
  /** 站点地址（getSiteUrl()，无末尾斜杠，子路径部署时含子路径） */
  siteUrl: string
  /** 品牌名（站点设置 brandName）：发布机构 publisher */
  brandName: string
  /** Logo 地址（imageSource() 的 src，已带 basePath）；后台未上传时为 null，不输出 logo */
  logoSrc: string | null
}

/**
 * 署名是机构 / 部门（“教研中心”“就业服务部”“北京海淀校区”）还是个人（讲师姓名）：
 * 以这些后缀结尾的按机构（Organization）输出，其余按个人（Person）。
 */
const ORGANIZATION_SUFFIX = /(中心|部|校区|学院|团队|小组|编辑部|工作室|委员会)$/

export function authorJsonLdType(name: string): 'Person' | 'Organization' {
  return ORGANIZATION_SUFFIX.test(name.trim()) ? 'Organization' : 'Person'
}

/**
 * 媒体地址转绝对地址。imageSource() 给出的地址已带 basePath（如 /EduVerse/api/media/…），
 * 用 URL 解析（以 / 开头的路径替换站点地址的路径部分），子路径部署时不会重复拼接子路径。
 */
function absoluteMediaUrl(src: string, siteUrl: string): string {
  return new URL(src, `${siteUrl}/`).href
}

/** 去掉值为 undefined 的键，输出更干净的 JSON */
function compact(data: Record<string, unknown>): JsonLdData {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}

/**
 * Article：标题、摘要、图片（首屏大图与 1200×630 分享图的绝对地址）、发布 / 修改时间（ISO 时间戳，含时区）、
 * 作者（署名；没有署名时为发布机构）、发布机构（Organization + Logo）、所属页面（mainEntityOfPage）、分类。
 * 阅读量不输出（缓存值，且会变化）。
 */
export function articleJsonLd(
  article: Pick<
    ArticleDetail,
    | 'slug'
    | 'title'
    | 'excerpt'
    | 'heroImage'
    | 'shareImage'
    | 'cover'
    | 'publishedAt'
    | 'updatedAt'
    | 'authorName'
    | 'category'
  >,
  { siteUrl, brandName, logoSrc }: ArticleJsonLdOptions,
): JsonLdData {
  const url = absoluteUrl(articlePath(article.slug), siteUrl)
  const publisher = compact({
    '@type': 'Organization',
    '@id': homeJsonLdIds(siteUrl).organization,
    name: brandName,
    url: absoluteUrl('/', siteUrl),
    logo: logoSrc ? { '@type': 'ImageObject', url: absoluteMediaUrl(logoSrc, siteUrl) } : undefined,
  })
  const images = [
    ...new Set(
      [article.heroImage ?? article.cover, article.shareImage]
        .filter((image) => image !== null)
        .map((image) => absoluteMediaUrl(image.src, siteUrl)),
    ),
  ]
  const author = article.authorName
    ? { '@type': authorJsonLdType(article.authorName), name: article.authorName }
    : publisher

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || undefined,
    image: images.length > 0 ? images : undefined,
    datePublished: validIso(article.publishedAt),
    dateModified: validIso(article.updatedAt) ?? validIso(article.publishedAt),
    author,
    publisher,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    articleSection: article.category?.name,
    inLanguage: 'zh-CN',
  })
}

/** 有效的时间戳原样输出（ISO 8601，含时区）；无效或缺失时不输出 */
function validIso(value: string | null | undefined): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined
  return new Date(value).toISOString()
}
