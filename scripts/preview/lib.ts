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

/** Payload 媒体文件的站内路径前缀（不含 basePath） */
export const MEDIA_FILE_PREFIX = '/api/media/file/'

/**
 * 媒体文件引用。Payload 用 encodeURIComponent 生成媒体地址，文件名只含
 * 字母数字、- _ . ! ~ * ' ( ) 与 %XX，遇到引号（含 RSC 数据里转义的 \"）、空白、? # & , 等即结束。
 */
const MEDIA_FILE_REF = /\/api\/media\/file\/([\w.!~*'()%-]+)/g

const countOf = (value: string, char: string) => value.split(char).length - 1

/** 去掉文件名末尾误匹配的字符：CSS url('…') 的引号，以及不成对的右括号 */
function trimMediaFileName(name: string): string {
  let result = name
  for (;;) {
    if (result.endsWith("'")) result = result.slice(0, -1)
    else if (result.endsWith(')') && countOf(result, ')') > countOf(result, '(')) {
      result = result.slice(0, -1)
    } else return result
  }
}

export type MediaRefs = {
  /** 媒体文件的站内路径（相对 basePath，如 /api/media/file/a.webp），已去重 */
  paths: string[]
  /** 缺少 basePath 的媒体引用（站内路径），子路径部署后会 404 */
  missingBasePath: string[]
}

/**
 * 按文本扫描整页 HTML 中的 Payload 媒体文件引用，补上 extractRefs（只看属性与 CSS url()）看不到的：
 * - 只在客户端渲染的图片，如作品灯箱的大图：只出现在 RSC 数据里
 *   （`<script>self.__next_f.push([1,"…"])</script>` 中的 JSON 字符串，引号转义为 \"）；
 * - 只出现在 `<meta content>` 里的分享图（og:image / twitter:image）与 JSON-LD 里的图片。
 * 只按路径识别：完整地址的域名不参与判断（分享图用站点正式地址，域名与抓取地址不同）。
 * 部署在子路径时，路径前面必须紧接 basePath，否则记入 missingBasePath。
 * 先解码 HTML 实体：文件名可以含 '，React 输出属性时转义为 &#x27;，不解码会在 & 处截断成不存在的文件。
 */
export function extractMediaRefs(html: string, basePath: string): MediaRefs {
  const text = decodeHtmlEntities(html)
  const paths = new Set<string>()
  const missingBasePath = new Set<string>()
  for (const match of text.matchAll(MEDIA_FILE_REF)) {
    const name = trimMediaFileName(match[1] ?? '')
    if (!name) continue
    const sitePath = `${MEDIA_FILE_PREFIX}${name}`
    const before = text.slice(Math.max(0, match.index - basePath.length), match.index)
    if (before === basePath) paths.add(sitePath)
    else missingBasePath.add(sitePath)
  }
  return { paths: [...paths], missingBasePath: [...missingBasePath] }
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

/**
 * sitemap.xml 中的页面地址 → 站内路径。sitemap 用站点正式地址（如 https://user.github.io/EduVerse/...），
 * 域名与抓取地址不同，只按路径识别；路径不在 basePath 下、或不是 http(s) 地址的记入 invalid。
 */
export function sitemapPaths(
  xml: string,
  basePath: string,
): { paths: string[]; invalid: string[] } {
  const paths = new Set<string>()
  const invalid: string[] = []
  for (const match of xml.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/gi)) {
    const loc = decodeHtmlEntities(match[1] ?? '')
    let url: URL
    try {
      url = new URL(loc)
    } catch {
      invalid.push(loc)
      continue
    }
    const { pathname } = url
    if (!/^https?:$/.test(url.protocol) || url.search || url.hash) {
      invalid.push(loc)
      continue
    }
    let sitePath: string | null
    if (!basePath) sitePath = pathname
    else if (pathname === basePath || pathname === `${basePath}/`) sitePath = '/'
    else if (pathname.startsWith(`${basePath}/`)) sitePath = pathname.slice(basePath.length)
    else sitePath = null
    if (!sitePath || !isPagePath(sitePath)) {
      invalid.push(loc)
      continue
    }
    paths.add(sitePath.length > 1 ? sitePath.replace(/\/+$/, '') : sitePath)
  }
  return { paths: [...paths], invalid }
}

/**
 * robots.txt 是否对所有爬虫（User-agent: *）禁止全部抓取（Disallow: /）。
 * 预览站与正式站内容重复，导出时必须确认是预览构建输出的“全部禁止”版本。
 */
export function disallowsAll(robotsTxt: string): boolean {
  let inWildcardGroup = false
  let lastWasAgent = false
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const [key = '', ...rest] = line.split(':')
    const field = key.trim().toLowerCase()
    const value = rest.join(':').trim()
    if (field === 'user-agent') {
      // 连续的 User-agent 行属于同一组
      inWildcardGroup = (lastWasAgent && inWildcardGroup) || value === '*'
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (inWildcardGroup && field === 'disallow' && value === '/') return true
  }
  return false
}

/**
 * 分享图（og:image / twitter:image 的 <meta content>）里引用的构建产物，如内置兜底分享图
 * /_next/static/media/default-share-image.*.png。分享图用站点正式地址，只按路径识别。
 * 构建产物整体复制，这里只用于校验：路径必须带 basePath（否则记入 missingBasePath），且文件存在。
 * Payload 媒体文件由 extractMediaRefs 处理；外站图片不处理。
 */
export function extractStaticShareImageRefs(html: string, basePath: string): MediaRefs {
  const paths = new Set<string>()
  const missingBasePath = new Set<string>()
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/\s(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["']/i.test(tag)) continue
    const content = /\scontent=(["'])(.*?)\1/i.exec(tag)?.[2]
    if (!content) continue
    let pathname: string
    try {
      pathname = new URL(decodeHtmlEntities(content), 'http://site.invalid').pathname
    } catch {
      continue
    }
    if (pathname.startsWith(`${basePath}/_next/static/`)) {
      paths.add(pathname.slice(basePath.length))
    } else if (pathname.startsWith('/_next/static/')) {
      missingBasePath.add(pathname)
    }
  }
  return { paths: [...paths], missingBasePath: [...missingBasePath] }
}
