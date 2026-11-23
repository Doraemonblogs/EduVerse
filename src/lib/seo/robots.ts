import type { MetadataRoute } from 'next'

import { withBasePath } from '@/lib/base-path'

/**
 * robots.txt 的纯函数（路由见 src/app/robots.ts）。
 *
 * 禁止抓取：后台、接口、站内搜索（结果页本身 noindex，再禁止抓取，避免任意关键词组合消耗抓取配额）、设计规范。
 * 每个路由写成“精确路径 / 子路径 / 带查询串”三条（`$` 为行尾，百度、Google、必应都支持），
 * 不用前缀匹配：通用页面的 slug 可能以这些词开头（如 /search-guide），前缀规则会误伤。
 * 接口只有子路径（/api/...），直接写前缀。
 *
 * 允许：只写例外（后台上传的媒体文件，在 /api/ 下），不写 `Allow: /`——未禁止的路径本来就允许抓取，
 * 而百度按“第一条匹配的 Allow / Disallow”判断（Next 把 Allow 行输出在 Disallow 之前），
 * 排在最前的 `Allow: /` 会让百度忽略全部 Disallow。媒体文件是页面图片与分享图（og:image）的地址，
 * 禁止抓取会让图片搜索与分享卡片取不到图；Google / 必应按最长匹配，结果相同。
 */
export const DISALLOWED_ROUTES = ['/admin', '/search', '/styleguide'] as const
export const DISALLOWED_PREFIXES = ['/api/'] as const
export const ALLOWED_PREFIXES = ['/api/media/file/'] as const

type RobotsOptions = {
  /** 站点地址（含子路径，无末尾斜杠），用于 Sitemap 与 Host */
  siteUrl: string
  /** Next basePath（子路径部署时如 /EduVerse，正式站为空） */
  basePath: string
  /** 静态预览站构建：全部禁止抓取 */
  preview: boolean
}

/** 一个路由的三条禁止规则：/x、/x/…、/x?… */
export function routeDisallowRules(route: string, basePath: string): string[] {
  const path = withBasePath(route, basePath)
  return [`${path}$`, `${path}/`, `${path}?`]
}

export function buildRobots({ siteUrl, basePath, preview }: RobotsOptions): MetadataRoute.Robots {
  // 预览站（GitHub Pages）只用于查看效果，与正式站内容重复：一律禁止抓取，也不声明 sitemap
  if (preview) return { rules: { userAgent: '*', disallow: '/' } }

  return {
    rules: {
      userAgent: '*',
      allow: ALLOWED_PREFIXES.map((prefix) => withBasePath(prefix, basePath)),
      disallow: [
        ...DISALLOWED_ROUTES.flatMap((route) => routeDisallowRules(route, basePath)),
        ...DISALLOWED_PREFIXES.map((prefix) => withBasePath(prefix, basePath)),
      ],
    },
    sitemap: `${siteUrl.replace(/\/+$/, '')}/sitemap.xml`,
    host: new URL(siteUrl).origin,
  }
}
