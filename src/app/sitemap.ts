import type { MetadataRoute } from 'next'

import { getSiteUrl } from '@/config/site'
import { getSitemapItems } from '@/lib/data/sitemap'
import { buildSitemap, SITEMAP_URL_LIMIT } from '@/lib/seo/sitemap'

/**
 * /sitemap.xml：全部可收录页面的绝对地址（站点地址含子路径时一并带上）与最后修改时间。
 * 收录范围见 src/lib/data/sitemap.ts。数据走缓存（标签同各集合 / 全局，内容变更即失效），
 * 另外每小时重新生成一次。
 *
 * 分片扩展点：条目超过 SITEMAP_URL_LIMIT（5 万）时目前只输出前 5 万条并记录告警。
 * 内容量接近上限时，改为导出 generateSitemaps()（按 SITEMAP_URL_LIMIT 切片，地址变为 /sitemap/[id].xml），
 * 并在 src/lib/seo/robots.ts 的 sitemap 中列出全部分片。
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { entries, truncated } = buildSitemap(await getSitemapItems(), getSiteUrl())
  if (truncated > 0) {
    console.warn(
      `sitemap 条目超过 ${SITEMAP_URL_LIMIT} 条，已省略 ${truncated} 条；请改用 generateSitemaps 分片`,
    )
  }
  return entries
}
