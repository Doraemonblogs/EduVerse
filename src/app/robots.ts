import type { MetadataRoute } from 'next'

import { getSiteUrl, isStaticPreview } from '@/config/site'
import { BASE_PATH } from '@/lib/base-path'
import { buildRobots } from '@/lib/seo/robots'

/**
 * /robots.txt：正式站允许抓取前台，禁止后台、接口、站内搜索与设计规范，声明 sitemap 绝对地址；
 * 静态预览站构建（NEXT_PUBLIC_STATIC_PREVIEW=true）时禁止全部抓取。规则见 src/lib/seo/robots.ts。
 */
export default function robots(): MetadataRoute.Robots {
  return buildRobots({ siteUrl: getSiteUrl(), basePath: BASE_PATH, preview: isStaticPreview })
}
