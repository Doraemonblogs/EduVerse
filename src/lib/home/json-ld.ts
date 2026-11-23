import { absoluteUrl, type JsonLdData } from '@/lib/seo/json-ld'

/**
 * 首页的结构化数据（schema.org）：Organization + WebSite，配合 <JsonLd data={...} /> 输出。
 * 纯函数：站点地址、品牌信息都由调用方传入，便于测试。
 */

/** 站内搜索的路径（M7 实现）与查询参数占位（schema.org SearchAction 约定的写法） */
export const SEARCH_PATH = '/search'
const SEARCH_TERM = 'search_term_string'

export type HomeJsonLdOptions = {
  /** 站点地址（getSiteUrl()，无末尾斜杠，子路径部署时含子路径） */
  siteUrl: string
  /** 品牌名（站点设置 brandName） */
  brandName: string
  /** 品牌简介（站点设置 brandDescription），为空不输出 */
  description?: string | null
  /** Logo 地址（imageSource() 的 src，已带 basePath）；后台未上传时为 null，不输出 logo */
  logoSrc?: string | null
  /** 咨询热线（站点设置 hotline），为空不输出 contactPoint */
  hotline?: string | null
  /** contactPoint.contactType（系统文案 zh.home.page.contactType） */
  contactType: string
}

/**
 * 媒体地址转绝对地址。imageSource() 给出的地址已带 basePath（如 /EduVerse/api/media/…），
 * 用 URL 解析（以 / 开头的路径替换站点地址的路径部分），子路径部署时不会重复拼接子路径。
 */
function absoluteMediaUrl(src: string, siteUrl: string): string {
  return new URL(src, `${siteUrl}/`).href
}

/** 站点内各节点的 @id（同一页面里互相引用） */
export function homeJsonLdIds(siteUrl: string) {
  const base = siteUrl.replace(/\/+$/, '')
  return { organization: `${base}/#organization`, website: `${base}/#website` }
}

/**
 * Organization：名称、首页地址、Logo（绝对地址）、简介、咨询热线（contactPoint）。
 * 电话保留后台填写的原样（如 400-000-0000），读屏与搜索引擎都能识别。
 */
export function organizationJsonLd({
  siteUrl,
  brandName,
  description,
  logoSrc,
  hotline,
  contactType,
}: HomeJsonLdOptions): JsonLdData {
  const data: JsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': homeJsonLdIds(siteUrl).organization,
    name: brandName,
    url: absoluteUrl('/', siteUrl),
  }
  if (logoSrc) data.logo = absoluteMediaUrl(logoSrc, siteUrl)
  const about = description?.trim()
  if (about) data.description = about
  const telephone = hotline?.trim()
  if (telephone) {
    data.contactPoint = [
      {
        '@type': 'ContactPoint',
        telephone,
        contactType,
        areaServed: 'CN',
        availableLanguage: 'zh-CN',
      },
    ]
  }
  return data
}

/**
 * WebSite：名称、首页地址、发布机构，以及站内搜索（SearchAction → /search?q={search_term_string}）。
 */
export function websiteJsonLd({
  siteUrl,
  brandName,
}: Pick<HomeJsonLdOptions, 'siteUrl' | 'brandName'>): JsonLdData {
  const ids = homeJsonLdIds(siteUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': ids.website,
    name: brandName,
    url: absoluteUrl('/', siteUrl),
    inLanguage: 'zh-CN',
    publisher: { '@id': ids.organization },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl(SEARCH_PATH, siteUrl)}?q={${SEARCH_TERM}}`,
      },
      'query-input': `required name=${SEARCH_TERM}`,
    },
  }
}

/** 首页输出的全部结构化数据（Organization 在前） */
export function homeJsonLd(options: HomeJsonLdOptions): JsonLdData[] {
  return [organizationJsonLd(options), websiteJsonLd(options)]
}
