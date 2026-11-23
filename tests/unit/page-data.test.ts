import { beforeEach, describe, expect, it, vi } from 'vitest'

import { docHref, LINKABLE_COLLECTIONS } from '@/components/common/rich-text'
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
    // 已发布清单（不带 limit）里有 about，详情查询（limit 1）查不到
    find.mockImplementation(({ limit }: { limit?: number }) =>
      Promise.resolve({ docs: limit === 1 ? [] : [{ slug: 'about' }] }),
    )
    expect(isPageSlug('about')).toBe(true)
    expect(await getPageBySlug('about')).toBeNull()
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'pages',
        where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: 'about' } }] },
      }),
    )
  })

  it('超过 80 个字符的 slug 判定不存在，不查库', async () => {
    const long = 'a'.repeat(81)
    expect(isPageSlug(long)).toBe(false)
    expect(isPageSlug('a'.repeat(80))).toBe(true)
    expect(await getPageBySlug(long)).toBeNull()
    expect(find).not.toHaveBeenCalled()
  })

  it('不在已发布清单中的 slug 只查清单，不进入按 slug 缓存的详情查询', async () => {
    find.mockResolvedValue({ docs: [{ slug: 'about' }] })
    expect(await getPageBySlug('random-path-123')).toBeNull()
    expect(find).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'pages', select: { slug: true } }),
    )
    expect(find).not.toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }))
  })

  it('静态生成的 slug 清单剔除被固定路由占用的页面', async () => {
    find.mockResolvedValue({ docs: [{ slug: 'about' }, { slug: 'careers' }, { slug: 'terms' }] })
    expect(await getPublishedPageSlugs()).toEqual(['about', 'terms'])
  })
})

describe('页面区块富文本的课程链接', () => {
  /** 富文本：站内链接指向已填充的课程 */
  const linkTo = (course: { id: number; slug: string }) => ({
    root: {
      type: 'root',
      version: 1,
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [
            {
              type: 'link',
              version: 3,
              fields: {
                linkType: 'internal',
                doc: { relationTo: 'courses', value: { ...course, _status: 'published' } },
              },
              children: [{ type: 'text', text: course.slug, version: 1 }],
            },
          ],
        },
      ],
    },
  })

  /** 区块里全部课程链接的前台地址（按出现顺序） */
  const courseHrefs = (block: unknown): (string | null)[] => {
    const hrefs: (string | null)[] = []
    const walk = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(walk)
      if (!node || typeof node !== 'object') return
      const record = node as Record<string, unknown>
      if (record.relationTo === 'courses') hrefs.push(docHref('courses', record.value))
      Object.values(record).forEach(walk)
    }
    walk(block)
    return hrefs
  }

  it('所属专业方向未发布的课程只渲染文字，其余区块不受影响', async () => {
    const page = {
      id: 1,
      title: '关于我们',
      slug: 'about',
      _status: 'published',
      layout: [
        { blockType: 'richText', content: linkTo({ id: 7, slug: 'live-course' }) },
        { blockType: 'imageText', content: linkTo({ id: 8, slug: 'orphan-course' }) },
        { blockType: 'stats', items: [] },
      ],
    }
    find.mockImplementation(({ collection }: { collection: string }) =>
      Promise.resolve({ docs: collection === 'pages' ? [page] : [{ id: 7 }] }),
    )

    const result = await getPageBySlug('about')
    // 已发布清单 → 页面 → 链接到的课程
    expect(find).toHaveBeenCalledTimes(3)
    expect(find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: 'courses',
        where: {
          and: [
            { id: { in: [7, 8] } },
            { _status: { equals: 'published' } },
            { 'discipline._status': { equals: 'published' } },
          ],
        },
      }),
    )
    const [richText, imageText, stats] = result?.layout ?? []
    expect(courseHrefs(richText)).toEqual(['/courses/live-course'])
    expect(courseHrefs(imageText)).toEqual([null])
    expect(stats).toEqual(page.layout[2])
    expect(result?.title).toBe('关于我们')
  })

  it('区块里没有课程链接时只查询页面本身（另加一次已发布清单）', async () => {
    find.mockResolvedValue({
      docs: [
        { id: 2, title: '用户协议', slug: 'terms', layout: [{ blockType: 'stats', items: [] }] },
      ],
    })
    expect((await getPageBySlug('terms'))?.slug).toBe('terms')
    expect(find).toHaveBeenCalledTimes(2)
  })
})
