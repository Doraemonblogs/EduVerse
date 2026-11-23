import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LINKABLE_COLLECTIONS } from '@/components/common/rich-text'
import { cacheTags } from '@/hooks/revalidate'
import { getPayloadClient } from '@/lib/payload'

/** 记录每个 unstable_cache 的键与标签；被缓存的函数直接执行，不做缓存 */
const cached = vi.hoisted(() => new Map<string, string[]>())

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    keyParts: string[],
    options: { tags?: string[] },
  ) => {
    cached.set(keyParts.join('/'), options.tags ?? [])
    return fn
  },
  revalidateTag: vi.fn(),
}))
vi.mock('@/lib/payload', () => ({ getPayloadClient: vi.fn() }))

const { getPageBySlug, getPublishedPageSlugs, isPageSlug } = await import('@/lib/data/pages')

const find = vi.fn()

beforeEach(() => {
  find.mockReset()
  vi.mocked(getPayloadClient).mockResolvedValue({ find } as unknown as Awaited<
    ReturnType<typeof getPayloadClient>
  >)
})

describe('通用页面查询的缓存标签', () => {
  it('页面内容的缓存随页面、媒体与富文本可链接的全部集合一起失效', () => {
    const tags = cached.get('page-by-slug')
    expect(tags).toBeDefined()
    expect(tags).toEqual(
      expect.arrayContaining([
        cacheTags.collection('pages'),
        cacheTags.collection('media'),
        ...LINKABLE_COLLECTIONS.map(cacheTags.collection),
      ]),
    )
    // 例：课程改 slug / 下线、讲师发布后，引用它们的页面链接随之更新
    expect(tags).toEqual(
      expect.arrayContaining([
        cacheTags.collection('courses'),
        cacheTags.collection('teachers'),
        cacheTags.collection('works'),
      ]),
    )
    expect(new Set(tags).size).toBe(tags?.length)
  })

  it('已发布页面 slug 清单按页面集合失效', () => {
    expect(cached.get('published-page-slugs')).toEqual([cacheTags.collection('pages')])
  })
})

describe('isPageSlug / getPageBySlug', () => {
  it('被固定路由占用或格式不合法的 slug 判定不存在，不查库', async () => {
    for (const slug of ['careers', 'search', 'admin', 'favicon.ico', 'About']) {
      expect(isPageSlug(slug), slug).toBe(false)
      expect(await getPageBySlug(slug)).toBeNull()
    }
    expect(find).not.toHaveBeenCalled()
  })

  it('普通 slug 只查询已发布的页面', async () => {
    find.mockResolvedValue({ docs: [] })
    expect(isPageSlug('about')).toBe(true)
    expect(await getPageBySlug('about')).toBeNull()
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'pages',
        where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: 'about' } }] },
      }),
    )
  })

  it('静态生成的 slug 清单剔除被固定路由占用的页面', async () => {
    find.mockResolvedValue({ docs: [{ slug: 'about' }, { slug: 'careers' }, { slug: 'terms' }] })
    expect(await getPublishedPageSlugs()).toEqual(['about', 'terms'])
  })
})
