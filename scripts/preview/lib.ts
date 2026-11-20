/**
 * 静态预览站导出的纯函数（无 I/O，便于单元测试）。
 * 预览站 = 抓取 `next start` 渲染出的 HTML + `.next/static` 构建产物，托管到 GitHub Pages。
 */

export type SiteConfig = {
  /** 生产服务地址，如 http://localhost:3000 */
  origin: string
  /** Next.js basePath，如 /EduVerse；部署在根路径时为空字符串 */
  basePath: string
}

/** 不导出为静态页面的站内路径前缀：后台、接口、构建产物 */
const NON_PAGE_PREFIXES = ['/admin', '/api', '/_next']

/** 页面 URL：basePath + 站内路径（根路径不带末尾斜杠，与 Next.js 的 basePath 行为一致） */
export function pageUrl(config: SiteConfig, sitePath: string): string {
  const suffix = sitePath === '/' ? (config.basePath ? '' : '/') : sitePath
  return `${config.origin}${config.basePath}${suffix}`
}

/**
 * 把页面中的引用（href / src）解析为站内路径（相对 basePath，以 / 开头，不含查询串与锚点）。
 * 外站链接、basePath 之外的路径、非 http(s) 协议返回 null。
 */
export function toSitePath(ref: string, fromUrl: string, config: SiteConfig): string | null {
  const trimmed = decodeHtmlEntities(ref.trim())
  if (!trimmed || /^(mailto|tel|javascript|data|blob):/i.test(trimmed) || trimmed.startsWith('#')) {
    return null
  }
  let url: URL
  try {
    url = new URL(trimmed, fromUrl)
  } catch {
    return null
  }
  if (url.origin !== new URL(config.origin).origin) return null

  const { pathname } = url
  let sitePath: string
  if (!config.basePath) sitePath = pathname
  else if (pathname === config.basePath) sitePath = '/'
  else if (pathname.startsWith(`${config.basePath}/`))
    sitePath = pathname.slice(config.basePath.length)
  else return null
  // 与 Next.js（trailingSlash: false）的规范形式一致：/foo/ → /foo
  return sitePath.length > 1 ? sitePath.replace(/\/+$/, '') || '/' : sitePath
}

/**
 * 同源但缺少 basePath 的引用（如 basePath 为 /EduVerse 时的 /logo.png）。
 * 子路径部署后会指向 github.io 根域名而 404，是最常见的预览站断链原因。
 */
export function isMissingBasePath(ref: string, fromUrl: string, config: SiteConfig): boolean {
  if (!config.basePath) return false
  const trimmed = decodeHtmlEntities(ref.trim())
  if (!trimmed || /^(mailto|tel|javascript|data|blob):/i.test(trimmed) || trimmed.startsWith('#')) {
    return false
  }
  try {
    const url = new URL(trimmed, fromUrl)
    if (url.origin !== new URL(config.origin).origin) return false
    return url.pathname !== config.basePath && !url.pathname.startsWith(`${config.basePath}/`)
  } catch {
    return false
  }
}

/** 响应内容随查询串变化的路径（静态托管无法提供），如 Next.js 图片优化接口 */
export function isQueryDependentPath(sitePath: string): boolean {
  return sitePath === '/_next/image' || sitePath.startsWith('/api/') || isPagePath(sitePath)
}

/** 引用是否带查询串（静态托管无法按查询串区分文件） */
export function hasQuery(ref: string, fromUrl: string): boolean {
  try {
    return new URL(decodeHtmlEntities(ref.trim()), fromUrl).search !== ''
  } catch {
    return false
  }
}

/** 是否为需要导出的页面路径：不在后台 / 接口 / 构建产物下，且最后一段没有扩展名 */
export function isPagePath(sitePath: string): boolean {
  if (
    NON_PAGE_PREFIXES.some((prefix) => sitePath === prefix || sitePath.startsWith(`${prefix}/`))
  ) {
    return false
  }
  const last = sitePath.split('/').pop() ?? ''
  return !/\.[a-z0-9]+$/i.test(last)
}

/**
 * 页面对应的输出文件。GitHub Pages 对 /a 会依次尝试 a.html 与 a/index.html，
 * 两份都写，避免同名目录存在时出现重定向或 404。
 */
export function pageOutputFiles(sitePath: string): string[] {
  if (sitePath === '/') return ['index.html']
  const rel = decodeURIComponent(sitePath.replace(/^\/+|\/+$/g, ''))
  return [`${rel}.html`, `${rel}/index.html`]
}

/** 资源对应的输出文件（相对输出目录） */
export function assetOutputFile(sitePath: string): string {
  return decodeURIComponent(sitePath.replace(/^\/+/, ''))
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function attrValues(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)].map((m) => m[2] ?? '').filter(Boolean)
}

function splitSrcset(srcset: string): string[] {
  return srcset
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean)
}

/** 从 CSS（或内联 style）中提取 url(...) 引用 */
export function extractCssUrls(css: string): string[] {
  return [...css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)]
    .map((m) => m[2]!.trim())
    .filter((ref) => !ref.startsWith('data:') && !ref.startsWith('#'))
}

/** 从 HTML 中提取页面链接与静态资源引用 */
export function extractRefs(html: string): { links: string[]; assets: string[] } {
  const links = attrValues(html, /<a\b[^>]*?\shref=(["'])(.*?)\1/gi)
  const assets = [
    ...attrValues(
      html,
      /<(?:img|script|source|video|audio|iframe|track|input)\b[^>]*?\ssrc=(["'])(.*?)\1/gi,
    ),
    ...attrValues(html, /<link\b[^>]*?\shref=(["'])(.*?)\1/gi),
    ...attrValues(html, /\sposter=(["'])(.*?)\1/gi),
    ...attrValues(html, /\s(?:srcset|imagesrcset)=(["'])(.*?)\1/gi).flatMap(splitSrcset),
    ...extractCssUrls(html),
  ]
  return { links: [...new Set(links)], assets: [...new Set(assets)] }
}

const NOINDEX_META = '<meta name="robots" content="noindex, nofollow"/>'

/** 预览站一律禁止搜索引擎收录，避免与正式站形成重复内容 */
export function applyNoindex(html: string): string {
  const withoutRobots = html.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '')
  if (!/<head(\s[^>]*)?>/i.test(withoutRobots)) {
    throw new Error('HTML 缺少 <head>，无法注入 noindex')
  }
  return withoutRobots.replace(/<head(\s[^>]*)?>/i, (head) => `${head}${NOINDEX_META}`)
}
