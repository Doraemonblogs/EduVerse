import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload } from 'payload'

import { LINKABLE_COLLECTIONS } from '@/components/common/rich-text'
import { cacheTags } from '@/hooks/revalidate'
import { guardCourseLinks } from '@/lib/data/courses'
import { getPayloadClient } from '@/lib/payload'
import { isReservedSlug } from '@/lib/reserved-slugs'
import { isValidSlug } from '@/lib/search-params'
import type { Page } from '@/payload-types'

import { loadIfKnown } from './known-key'

/**
 * 通用页面（关于我们、联系我们、隐私政策、用户协议 …）的数据查询。
 * Local API 默认 overrideAccess=true：这里必须显式只取已发布的页面，草稿不会出现在前台。
 * 区块富文本里指向不可访问课程（所属专业方向未发布）的链接只渲染文字，见 guardCourseLinks。
 */

const published = { _status: { equals: 'published' } } as const

/**
 * 页面内容按 depth 1 填充：区块图片、富文本上传依赖媒体；富文本站内链接 / 关联节点的地址与文字
 * 来自被链接文档（slug、标题、发布状态），课程链接还取决于所属专业方向是否发布。
 * 这些集合任一变更都要让页面缓存失效。
 */
const pageContentTags = [
  ...new Set([
    cacheTags.collection('pages'),
    cacheTags.collection('media'),
    ...LINKABLE_COLLECTIONS.map(cacheTags.collection),
  ]),
]

/** slug 清单只读 pages 自身的字段 */
const pageListTags = [cacheTags.collection('pages')]

/**
 * 该 slug 是否可能是一个通用页面：格式与长度符合后台 slug 规则（不符合的路径如 favicon.ico 直接判定不存在，不查库），
 * 且未被固定路由占用（占用清单见 src/lib/reserved-slugs.ts，后台保存时也会拦截）。
 */
export function isPageSlug(slug: string): boolean {
  return isValidSlug(slug) && !isReservedSlug(slug)
}

/**
 * 查询：按 slug 读取已发布的页面（不经过缓存，集成测试直接调用）；不存在或未发布时返回 null。
 * 区块富文本经 guardCourseLinks 处理：指向不可访问课程的链接只渲染文字。
 */
export async function queryPageBySlug(payload: Payload, slug: string): Promise<Page | null> {
  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [published, { slug: { equals: slug } }] },
    limit: 1,
    depth: 1,
    pagination: false,
  })
  const page = docs[0]
  if (!page) return null
  return { ...page, layout: await guardCourseLinks(payload, page.layout) }
}

const findPublishedPage = unstable_cache(
  async (slug: string): Promise<Page | null> => queryPageBySlug(await getPayloadClient(), slug),
  ['page-by-slug'],
  { tags: pageContentTags },
)

/**
 * 按 slug 读取已发布的页面；不存在、未发布或 slug 不合法时返回 null。
 * 不在已发布清单中的 slug 不进入按 slug 的缓存（见 ./known-key.ts）：/[pageSlug] 接住所有一级路径，随机路径最多。
 */
export async function getPageBySlug(slug: string): Promise<Page | null> {
  if (!isPageSlug(slug)) return null
  return loadIfKnown(slug, getPublishedPageSlugs, findPublishedPage)
}

/** 所有已发布页面的 slug（用于 generateStaticParams） */
export const getPublishedPageSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'pages',
      where: published,
      depth: 0,
      pagination: false,
      select: { slug: true },
    })
    return docs
      .map((doc) => doc.slug)
      .filter((slug): slug is string => Boolean(slug && isPageSlug(slug)))
  },
  ['published-page-slugs'],
  { tags: pageListTags },
)
