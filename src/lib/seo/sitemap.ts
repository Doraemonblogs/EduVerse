import type { MetadataRoute } from 'next'

import { absoluteUrl } from './json-ld'

/**
 * sitemap.xml 的纯函数（无数据访问，便于单元测试）。数据来源见 src/lib/data/sitemap.ts，
 * 路由见 src/app/sitemap.ts。
 */

/** 单个 sitemap 文件的地址数上限（sitemaps.org 协议与百度、Google 的限制） */
export const SITEMAP_URL_LIMIT = 50_000

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

/** sitemap 中的一个页面（数据层产出，路径不含 basePath） */
export type SitemapItem = {
  /** 站内路径（以 / 开头，不含 basePath 与查询串） */
  path: string
  /** 最后修改时间（ISO 字符串，通常是文档的 updatedAt）；未知时为 null */
  lastModified: string | null
  changeFrequency: ChangeFrequency
  /** 0–1 */
  priority: number
}

/** 取一组时间中最新的一个（ISO 字符串）；无法解析的值忽略，全部无效时返回 null */
export function latestDate(values: readonly (string | null | undefined)[]): string | null {
  let latest: number | null = null
  for (const value of values) {
    if (!value) continue
    const time = Date.parse(value)
    if (Number.isNaN(time)) continue
    if (latest === null || time > latest) latest = time
  }
  return latest === null ? null : new Date(latest).toISOString()
}

/**
 * 组装 sitemap：站内路径转为站点绝对地址（站点地址含子路径时一并带上），同一地址只保留第一次出现的条目；
 * 无效的修改时间不输出 lastmod。超过单文件上限时截断并返回 truncated，由调用方记录告警——
 * 内容量接近上限时改用 generateSitemaps 分片（扩展点见 src/app/sitemap.ts）。
 */
export function buildSitemap(
  items: readonly SitemapItem[],
  siteUrl: string,
  limit: number = SITEMAP_URL_LIMIT,
): { entries: MetadataRoute.Sitemap; truncated: number } {
  const seen = new Set<string>()
  const entries: MetadataRoute.Sitemap = []
  for (const item of items) {
    if (!item.path.startsWith('/') || item.path.includes('?') || item.path.includes('#')) continue
    const url = absoluteUrl(item.path, siteUrl)
    if (seen.has(url)) continue
    seen.add(url)
    const lastModified = latestDate([item.lastModified])
    entries.push({
      url,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    })
  }
  return { entries: entries.slice(0, limit), truncated: Math.max(0, entries.length - limit) }
}
