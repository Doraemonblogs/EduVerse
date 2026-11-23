import { getSiteUrl } from '@/config/site'

/**
 * 结构化数据（schema.org JSON-LD）。
 * 内容来自后台，可能包含任意字符：输出前必须转义，防止 `</script>` 提前闭合标签造成注入。
 */

export type JsonLdData = Record<string, unknown>

/** 面包屑的一级；href 为站内路径（不含 basePath），或完整的 http(s) 地址 */
export type BreadcrumbItem = {
  label: string
  href: string
}

/**
 * 序列化为可安全嵌入 <script> 的 JSON：
 * `<` `>` `&` 与 U+2028 / U+2029 统一转成 \uXXXX，JSON 语义不变，HTML 解析器看不到标签。
 */
export function serializeJsonLd(data: JsonLdData | JsonLdData[]): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (char) => {
    return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
  })
}

/** 站内路径转绝对地址（与 canonical 的拼法一致：首页不带末尾斜杠） */
export function absoluteUrl(href: string, siteUrl: string = getSiteUrl()): string {
  if (/^https?:\/\//i.test(href)) return href
  const base = siteUrl.replace(/\/+$/, '')
  if (href === '/' || href === '') return base
  return `${base}${href.startsWith('/') ? href : `/${href}`}`
}

/** BreadcrumbList：items 按层级排列（第一项为首页，最后一项为当前页） */
export function breadcrumbListJsonLd(
  items: BreadcrumbItem[],
  siteUrl: string = getSiteUrl(),
): JsonLdData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href, siteUrl),
    })),
  }
}

/** 输出一段 JSON-LD 结构化数据（服务端组件） */
export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  return (
    <script
      type="application/ld+json"
      // 已在 serializeJsonLd 中转义，不会被提前闭合
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
