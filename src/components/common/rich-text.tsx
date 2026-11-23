import type {
  DefaultNodeTypes,
  SerializedLinkNode,
  SerializedRelationshipNode,
  SerializedUploadNode,
} from '@payloadcms/richtext-lexical'
import {
  RichText as LexicalRichText,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'
import Link from 'next/link'
import type { CollectionSlug } from 'payload'
import type * as React from 'react'

import { getSiteUrl } from '@/config/site'
import { withBasePath } from '@/lib/base-path'
import { imageSource, isMedia } from '@/lib/media'
import { isReservedSlug } from '@/lib/reserved-slugs'
import { cn } from '@/lib/utils'

/** Payload richText 字段的值（Lexical 编辑器状态） */
export type RichTextData = React.ComponentProps<typeof LexicalRichText>['data']

type RichTextProps = {
  data: RichTextData | null | undefined
  className?: string
  /** 正文图片的 sizes；默认按正文版心 736px 计算 */
  imageSizes?: string
}

const DEFAULT_IMAGE_SIZES = '(min-width: 768px) 736px, 100vw'

/** 各集合在前台的路径（站内链接、关联节点用），按 slug 拼接；作品详情按 ID，见 docHref */
const COLLECTION_PATH_ENTRIES = [
  ['pages', ''],
  ['courses', '/courses'],
  ['disciplines', '/majors'],
  ['teachers', '/teachers'],
  ['campuses', '/campuses'],
  ['articles', '/articles'],
  ['article-categories', '/articles/category'],
] as const satisfies readonly (readonly [CollectionSlug, string])[]

const COLLECTION_PATHS: ReadonlyMap<string, string> = new Map(COLLECTION_PATH_ENTRIES)

/**
 * 富文本会输出链接的全部集合。链接地址与文字取自 depth 1 填充进来的文档（slug、标题、发布状态），
 * 缓存含富文本内容的查询时必须同时打上这些集合的缓存标签，否则改 slug / 发布 / 下线后链接不会更新。
 * 其它集合即使被关联也只渲染文字，不依赖其字段。
 */
export const LINKABLE_COLLECTIONS: readonly CollectionSlug[] = [
  ...COLLECTION_PATH_ENTRIES.map(([collection]) => collection),
  'works',
]

type DocLike = {
  id?: unknown
  slug?: unknown
  title?: unknown
  name?: unknown
  _status?: unknown
  consentConfirmed?: unknown
}

function isDocLike(value: unknown): value is DocLike {
  return Boolean(value && typeof value === 'object')
}

/**
 * 关联文档的前台地址。关联未填充（只有 ID）、文档仍是草稿、集合没有前台页面，
 * 或通用页面的 slug 被固定路由占用（/[pageSlug] 永远访问不到）时返回 null，
 * 此时只渲染文字，不输出会 404 的链接。
 * 作品详情只展示已确认学员授权的作品（src/lib/data/works.ts），未确认授权（consentConfirmed 不为 true）的作品同样不输出链接。
 */
export function docHref(relationTo: string, value: unknown): string | null {
  if (!isDocLike(value) || value._status === 'draft') return null
  if (relationTo === 'works') {
    if (value.consentConfirmed !== true) return null
    return typeof value.id === 'number' || typeof value.id === 'string'
      ? `/works/${value.id}`
      : null
  }
  const prefix = COLLECTION_PATHS.get(relationTo)
  if (prefix === undefined || typeof value.slug !== 'string' || !value.slug) return null
  if (relationTo === 'pages' && isReservedSlug(value.slug)) return null
  return `${prefix}/${value.slug}`
}

/** 以 // 或 /\ 开头的路径会被浏览器当作另一个域名（\ 按 / 处理），不能当站内路径输出 */
function isHostRelative(path: string): boolean {
  return /^\/[/\\]/.test(path)
}

/**
 * 自定义链接地址的安全检查：只允许站内路径、页内锚点、http(s)、mailto、tel，
 * 其它协议（javascript: / data: 等）一律不输出链接。指向本站的完整地址转为站内路径。
 * 浏览器解析地址时会删掉中间的制表符 / 换行并把 \ 当作 /（`/\evil.com` 等同 `//evil.com`），
 * 这类地址无法按字面判断去向，同样不输出链接。
 */
export function safeHref(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const href = url.trim()
  if (!href) return null
  if (/\p{Cc}/u.test(href) || href.startsWith('/\\')) return null
  const site = getSiteUrl()
  if (href === site || href.startsWith(`${site}/`) || href.startsWith(`${site}#`)) {
    const path = href.slice(site.length) || '/'
    // 本站地址后接 // 或 /\ 时，截成站内路径会变成指向其它域名：保留完整地址（按外链输出，去向不变）
    if (!isHostRelative(path)) return path
  }
  if (href.startsWith('/') || href.startsWith('#')) return href
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href
  return null
}

function RichTextLink({
  fields,
  children,
}: {
  fields: SerializedLinkNode['fields']
  children: React.ReactNode
}) {
  const href =
    fields.linkType === 'internal'
      ? fields.doc
        ? docHref(fields.doc.relationTo, fields.doc.value)
        : null
      : safeHref(fields.url)

  if (!href) return <>{children}</>

  // 站内路径：next/link 自动补 basePath；不预取，避免批量请求尚未上线的路由
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link
        href={href}
        prefetch={false}
        target={fields.newTab ? '_blank' : undefined}
        rel={fields.newTab ? 'noopener' : undefined}
      >
        {children}
      </Link>
    )
  }

  // 外链一律新窗口打开，不传递来源与窗口引用
  if (/^https?:/i.test(href) || href.startsWith('//')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }

  // 页内锚点、mailto:、tel:
  return <a href={href}>{children}</a>
}

function RichTextUpload({ node, sizes }: { node: SerializedUploadNode; sizes: string }) {
  const media = node.value
  if (!isMedia(media) || !media.url) return null

  // 非图片（如视频、PDF）：输出下载链接，地址补 basePath
  if (!media.mimeType?.startsWith('image/')) {
    return (
      <p>
        <a href={withBasePath(media.url)} target="_blank" rel="noopener">
          {media.filename || media.alt}
        </a>
      </p>
    )
  }

  const image = imageSource(media, 'hero')
  if (!image) return null
  const customAlt = node.fields?.alt
  const alt = typeof customAlt === 'string' && customAlt ? customAlt : image.alt

  return (
    <figure>
      <Image
        src={image.src}
        alt={alt}
        width={image.width}
        height={image.height}
        sizes={sizes}
        className="h-auto max-w-full"
      />
      {media.caption ? <figcaption>{media.caption}</figcaption> : null}
    </figure>
  )
}

function RichTextRelationship({ node }: { node: SerializedRelationshipNode }) {
  const href = docHref(node.relationTo, node.value)
  if (!href || !isDocLike(node.value)) return null
  const label = node.value.title ?? node.value.name
  if (typeof label !== 'string' || !label) return null
  return (
    <p>
      <Link href={href} prefetch={false}>
        {label}
      </Link>
    </p>
  )
}

/**
 * 富文本（Payload Lexical）渲染：
 * - 站内链接走 next/link，外链新窗口打开并加 rel="noopener noreferrer"，过滤不安全协议；
 * - 上传图片走 next/image（地址经 imageSource 补 basePath）；
 * - 正文里的 h1 降为 h2，保证每页只有一个 h1；
 * - 版式由 prose-zh 工具类统一控制（globals.css）。
 */
export function RichText({ data, className, imageSizes = DEFAULT_IMAGE_SIZES }: RichTextProps) {
  if (!data) return null

  const converters: JSXConvertersFunction<DefaultNodeTypes> = ({ defaultConverters }) => ({
    ...defaultConverters,
    heading: ({ node, nodesToJSX }) => {
      const Tag = node.tag === 'h1' ? 'h2' : node.tag
      return <Tag>{nodesToJSX({ nodes: node.children })}</Tag>
    },
    link: ({ node, nodesToJSX }) => (
      <RichTextLink fields={node.fields}>{nodesToJSX({ nodes: node.children })}</RichTextLink>
    ),
    autolink: ({ node, nodesToJSX }) => (
      <RichTextLink fields={node.fields}>{nodesToJSX({ nodes: node.children })}</RichTextLink>
    ),
    upload: ({ node }) => <RichTextUpload node={node} sizes={imageSizes} />,
    relationship: ({ node }) => <RichTextRelationship node={node} />,
    // 未注册的节点类型（如后续新增的富文本区块）不输出默认的 “unknown node” 占位
    unknown: () => null,
  })

  return (
    <LexicalRichText data={data} converters={converters} className={cn('prose-zh', className)} />
  )
}
