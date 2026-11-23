/**
 * SEO 元数据审计的纯函数（tests/e2e/seo.e2e.spec.ts 使用，单元测试见 tests/unit/seo-audit.test.ts）：
 * 解析 <head> 里的 TDK / canonical / robots / Open Graph、校验 JSON-LD、读取图片尺寸、抓取范围控制。
 * 只用正则解析服务端输出的 HTML（爬虫视角，不执行脚本）。
 */

export type HeadMeta = {
  titles: string[]
  descriptions: string[]
  canonicals: string[]
  robots: string[]
  /** Open Graph / Twitter：property 或 name → 取值（可能多个） */
  social: Record<string, string[]>
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function attr(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}=(["'])(.*?)\\1`, 'i').exec(tag)
  return match ? decodeEntities(match[2] ?? '') : null
}

/** 拆出 <head> 与 <body>（找不到时整页当作 head，body 为空） */
export function splitDocument(html: string): { head: string; body: string } {
  const head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html)
  if (!head) return { head: html, body: '' }
  return { head: head[1] ?? '', body: html.slice(head.index + head[0].length) }
}

/** 解析一段 HTML（通常是 <head>）里的元数据标签 */
export function parseHeadMeta(head: string): HeadMeta {
  const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) =>
    decodeEntities(m[1] ?? '').trim(),
  )
  const descriptions: string[] = []
  const robots: string[] = []
  const social: Record<string, string[]> = {}
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const name = (attr(tag, 'name') ?? attr(tag, 'property') ?? '').toLowerCase()
    const content = attr(tag, 'content')
    if (content === null) continue
    if (name === 'description') descriptions.push(content.trim())
    else if (name === 'robots') robots.push(content.trim())
    else if (name.startsWith('og:') || name.startsWith('twitter:')) {
      ;(social[name] ??= []).push(content.trim())
    }
  }
  const canonicals = [...head.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .filter((tag) => /\srel=(["'])canonical\1/i.test(tag))
    .map((tag) => attr(tag, 'href') ?? '')
  return { titles, descriptions, canonicals, robots, social }
}

/** body 里不应出现的元数据（爬虫拿到的是阻塞式元数据，应全部在 <head> 里） */
export function metadataInBody(body: string): string[] {
  const found: string[] = []
  // SVG 里的 <title> 不算
  const withoutSvg = body.replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
  if (/<title\b/i.test(withoutSvg)) found.push('<title>')
  if (/<meta\b[^>]*\sname=(["'])description\1/i.test(body)) found.push('meta description')
  if (/<link\b[^>]*\srel=(["'])canonical\1/i.test(body)) found.push('link canonical')
  return found
}

/** 页面里的全部 JSON-LD 脚本内容 */
export function extractJsonLd(html: string): string[] {
  return [
    ...html.matchAll(
      /<script\b[^>]*type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => m[2] ?? '')
}

// ───────────────────────── JSON-LD 校验 ─────────────────────────

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type JsonObject = { [key: string]: Json }

/** 各类型的必需字段（取自 schema.org 与搜索引擎结构化数据指南中最基本的要求） */
const REQUIRED_FIELDS: Record<string, string[]> = {
  Organization: ['name'],
  EducationalOrganization: ['name', 'address'],
  WebSite: ['name', 'url'],
  SearchAction: ['target', 'query-input'],
  EntryPoint: ['urlTemplate'],
  BreadcrumbList: ['itemListElement'],
  ItemList: ['itemListElement'],
  ListItem: ['position'],
  Course: ['name', 'description', 'provider'],
  CourseInstance: ['courseMode'],
  FAQPage: ['mainEntity'],
  Question: ['name', 'acceptedAnswer'],
  Answer: ['text'],
  Article: ['headline', 'datePublished'],
  VideoObject: ['name', 'description', 'thumbnailUrl', 'uploadDate'],
  Event: ['name', 'startDate', 'location'],
  Person: ['name'],
  CreativeWork: ['name'],
  ImageObject: ['url'],
  GeoCoordinates: ['latitude', 'longitude'],
  WebPage: ['@id'],
}

/** 取值必须是绝对地址的字段 */
const URL_FIELDS = new Set([
  'url',
  'item',
  'image',
  'logo',
  'thumbnailUrl',
  'contentUrl',
  'embedUrl',
  'sameAs',
  'urlTemplate',
  '@id',
])
const DATE_FIELDS = new Set([
  'datePublished',
  'dateModified',
  'uploadDate',
  'startDate',
  'endDate',
  'dateCreated',
])

const isObject = (value: Json | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEmpty = (value: Json | undefined) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0)

const isAbsoluteUrl = (value: string) => /^https?:\/\/[^/\s]+/i.test(value)

function typesOf(node: JsonObject): string[] {
  const type = node['@type']
  if (typeof type === 'string') return [type]
  if (Array.isArray(type)) return type.filter((t): t is string => typeof t === 'string')
  return []
}

function checkNode(node: JsonObject, at: string, problems: string[]) {
  const types = typesOf(node)
  for (const type of types) {
    for (const field of REQUIRED_FIELDS[type] ?? []) {
      if (isEmpty(node[field])) problems.push(`${at}（${type}）缺少 ${field}`)
    }
  }
  if (types.includes('ListItem')) {
    const position = node.position
    if (typeof position !== 'number' || !Number.isInteger(position) || position < 1) {
      problems.push(`${at}（ListItem）position 应为正整数`)
    }
  }
  for (const listType of ['BreadcrumbList', 'ItemList']) {
    if (!types.includes(listType)) continue
    const items = node.itemListElement
    if (!Array.isArray(items)) continue
    items.forEach((item, index) => {
      if (!isObject(item)) return
      if (item.position !== index + 1) {
        problems.push(`${at}（${listType}）第 ${index + 1} 项 position 应为 ${index + 1}`)
      }
      // 面包屑最后一项（当前页）可以不带地址；其余各项与 ItemList 的每一项都要有地址
      const last = listType === 'BreadcrumbList' && index === items.length - 1
      if (!last && isEmpty(item.item) && isEmpty(item.url)) {
        problems.push(`${at}（${listType}）第 ${index + 1} 项缺少地址（item / url）`)
      }
      if (listType === 'BreadcrumbList' && isEmpty(item.name)) {
        problems.push(`${at}（BreadcrumbList）第 ${index + 1} 项缺少 name`)
      }
    })
  }
  for (const [key, value] of Object.entries(node)) {
    const path = `${at}.${key}`
    if (URL_FIELDS.has(key)) {
      const urls = Array.isArray(value) ? value : [value]
      for (const url of urls) {
        if (typeof url === 'string' && !isAbsoluteUrl(url)) {
          problems.push(`${path} 应为绝对地址：${url}`)
        }
      }
    }
    if (DATE_FIELDS.has(key) && (typeof value !== 'string' || Number.isNaN(Date.parse(value)))) {
      problems.push(`${path} 不是有效日期：${String(value)}`)
    }
    if (isObject(value)) checkNode(value, path, problems)
    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        if (isObject(child)) checkNode(child, `${path}[${index}]`, problems)
      })
    }
  }
}

/**
 * 校验一段 JSON-LD：能解析；顶层（对象或数组中的每个对象）有 @context = https://schema.org 与 @type；
 * 各节点的必需字段齐全；地址字段为绝对地址；日期字段可解析。返回问题列表（空数组表示通过）。
 */
export function validateJsonLd(raw: string): string[] {
  let data: Json
  try {
    data = JSON.parse(raw) as Json
  } catch (err) {
    return [`JSON 无法解析：${(err as Error).message}`]
  }
  const roots = Array.isArray(data) ? data : [data]
  const problems: string[] = []
  roots.forEach((root, index) => {
    const at = Array.isArray(data) ? `[${index}]` : '$'
    if (!isObject(root)) {
      problems.push(`${at} 不是对象`)
      return
    }
    if (root['@context'] !== 'https://schema.org') {
      problems.push(`${at} 的 @context 应为 https://schema.org`)
    }
    if (typesOf(root).length === 0) problems.push(`${at} 缺少 @type`)
    checkNode(root, at, problems)
  })
  return problems
}

/** JSON-LD 中出现的全部 @type（用于统计覆盖情况） */
export function jsonLdTypes(raw: string): string[] {
  const types = new Set<string>()
  const walk = (value: Json) => {
    if (Array.isArray(value)) value.forEach(walk)
    else if (isObject(value)) {
      for (const type of typesOf(value)) types.add(type)
      Object.values(value).forEach(walk)
    }
  }
  try {
    walk(JSON.parse(raw) as Json)
  } catch {
    // 解析失败由 validateJsonLd 报告
  }
  return [...types]
}

// ───────────────────────── 图片尺寸 ─────────────────────────

/** 从文件头读取 PNG / WebP / JPEG / GIF 的像素尺寸；无法识别时返回 null */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + length))
  if (bytes.length >= 24 && ascii(1, 3) === 'PNG') {
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }
  if (bytes.length >= 10 && ascii(0, 3) === 'GIF') {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) }
  }
  if (bytes.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4)
    if (chunk === 'VP8 ') {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
    }
    if (chunk === 'VP8L') {
      const bits = view.getUint32(21, true)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') {
      const read24 = (offset: number) =>
        (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16)
      return { width: read24(24) + 1, height: read24(27) + 1 }
    }
    return null
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null
      const marker = bytes[offset + 1] ?? 0
      const length = view.getUint16(offset + 2)
      // SOF0–SOF15（不含 DHT C4、JPG C8、DAC CC）
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) }
      }
      offset += 2 + length
    }
  }
  return null
}

// ───────────────────────── 抓取范围 ─────────────────────────

/**
 * 带查询串的地址按“路径 + 参数名组合”分组，每组只抓前几个（筛选组合可达数百个，规则相同，抽样即可）。
 * 返回分组键；不带查询串的地址返回 null（全部抓取）。
 */
export function querySampleKey(url: URL): string | null {
  if (!url.search) return null
  const names = [...new Set([...url.searchParams.keys()])].sort()
  return `${url.pathname}?${names.join('&')}`
}

/** 是否只有分页参数（?page=N），这类页面可收录 */
export function isPaginationOnly(url: URL): boolean {
  const names = [...url.searchParams.keys()]
  return names.length === 1 && names[0] === 'page'
}

// ───────────────────────── robots.txt ─────────────────────────

export type RobotsRule = { allow: boolean; pattern: string }

/** robots.txt 中 `User-agent: *` 组的 Allow / Disallow 规则（按出现顺序；空的 Disallow 表示不限制，忽略） */
export function parseRobotsRules(robotsTxt: string): RobotsRule[] {
  const rules: RobotsRule[] = []
  let inWildcardGroup = false
  let lastWasAgent = false
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const field = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()
    if (field === 'user-agent') {
      // 连续的 User-agent 行属于同一组
      inWildcardGroup = (lastWasAgent && inWildcardGroup) || value === '*'
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (!inWildcardGroup || !value) continue
    if (field === 'allow' || field === 'disallow') {
      rules.push({ allow: field === 'allow', pattern: value })
    }
  }
  return rules
}

/** 一条规则是否匹配路径（含查询串）：前缀匹配，`*` 匹配任意字符，结尾的 `$` 表示行尾 */
function robotsPatternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$')
  const body = anchored ? pattern.slice(0, -1) : pattern
  const regex = body
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${regex}${anchored ? '$' : ''}`).test(path)
}

/**
 * 按 robots.txt 判断路径（含查询串）是否允许抓取，分别给出两种引擎的结论（没有匹配的规则时允许）：
 * - firstMatch（百度）：按出现顺序，第一条匹配的 Allow / Disallow 决定；
 * - longestMatch（Google / 必应）：最长（最具体）的匹配规则决定，同样长时 Allow 优先。
 */
export function robotsVerdicts(
  rules: readonly RobotsRule[],
  path: string,
): { firstMatch: boolean; longestMatch: boolean } {
  const hits = rules.filter((rule) => robotsPatternMatches(rule.pattern, path))
  if (hits.length === 0) return { firstMatch: true, longestMatch: true }
  const longest = Math.max(...hits.map((rule) => rule.pattern.length))
  return {
    firstMatch: hits[0]!.allow,
    longestMatch: hits.some((rule) => rule.pattern.length === longest && rule.allow),
  }
}

/** 两种引擎都允许抓取 */
export function robotsAllows(rules: readonly RobotsRule[], path: string): boolean {
  const { firstMatch, longestMatch } = robotsVerdicts(rules, path)
  return firstMatch && longestMatch
}

/** 两种引擎都禁止抓取 */
export function robotsBlocks(rules: readonly RobotsRule[], path: string): boolean {
  const { firstMatch, longestMatch } = robotsVerdicts(rules, path)
  return !firstMatch && !longestMatch
}
