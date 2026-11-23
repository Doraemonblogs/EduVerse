import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }))
vi.mock('@/lib/payload', () => ({ getPayloadClient: vi.fn() }))

const { querySitemapItems } = await import('@/lib/data/sitemap')

/**
 * sitemap 的数据（src/lib/data/sitemap.ts）：用假的 Payload 实例返回固定文档，
 * 验证收录范围（noindex、slug 规则、有文章的分类、列表页设置）、可见条件（查询条件）与修改时间。
 */

const T1 = '2026-11-20T00:00:00.000Z'
const T2 = '2026-11-21T00:00:00.000Z'
const T3 = '2026-11-22T00:00:00.000Z'
const T4 = '2026-11-23T00:00:00.000Z'

type Doc = Record<string, unknown>

const COLLECTIONS: Record<string, Doc[]> = {
  courses: [
    { id: 1, slug: '3d-animation-career', updatedAt: T1 },
    { id: 2, slug: 'hidden-course', updatedAt: T4, seo: { noindex: true } },
    { id: 3, slug: 'Bad_Slug', updatedAt: T4 },
  ],
  disciplines: [{ id: 1, slug: '3d-animation', updatedAt: T2 }],
  works: [
    { id: 11, updatedAt: T2 },
    { id: 12, updatedAt: T4, seo: { noindex: true } },
  ],
  teachers: [{ id: 1, slug: 'lin-yuqing', updatedAt: T1 }],
  articles: [
    { id: 1, slug: 'news-a', updatedAt: T1, category: 7 },
    { id: 2, slug: 'news-b', updatedAt: T3, category: { id: 7, slug: 'news' } },
  ],
  'article-categories': [
    { id: 7, slug: 'news', updatedAt: T1 },
    // 没有已发布文章的分类不列入（分类页会 404）
    { id: 8, slug: 'empty', updatedAt: T4 },
  ],
  campuses: [{ id: 1, slug: 'beijing-haidian', updatedAt: T2 }],
  pages: [
    { id: 1, slug: 'about', updatedAt: T1 },
    { id: 2, slug: 'draft-ish', updatedAt: T1, seo: { noindex: true } },
    // 被固定路由占用的 slug 不可访问
    { id: 3, slug: 'courses', updatedAt: T1 },
  ],
  tutorials: [{ id: 1, updatedAt: T3 }],
}

const GLOBALS: Record<string, Doc> = {
  'home-page': { updatedAt: T1 },
  'course-pages': { updatedAt: T1, list: { seo: { noindex: false } } },
  'work-pages': { updatedAt: T1 },
  // 列表页设置里勾选了禁止收录
  'teacher-pages': { updatedAt: T1, list: { seo: { noindex: true } } },
  'article-pages': { updatedAt: T4 },
  'campus-pages': {},
  'tutorial-pages': { updatedAt: T1 },
  'careers-page': { updatedAt: T2 },
  'quiz-settings': { updatedAt: T1, seo: { noindex: true } },
}

function fakePayload() {
  const find = vi.fn(async ({ collection }: { collection: string }) => ({
    docs: COLLECTIONS[collection] ?? [],
  }))
  const findGlobal = vi.fn(async ({ slug }: { slug: string }) => GLOBALS[slug] ?? {})
  return { payload: { find, findGlobal } as unknown as Payload, find }
}

describe('querySitemapItems', () => {
  it('列出首页、列表页与可收录的详情页，排除 noindex、slug 不合法、被占用的通用页面与空分类', async () => {
    const { payload } = fakePayload()
    const items = await querySitemapItems(payload)
    expect(items.map((item) => item.path)).toEqual([
      '/',
      '/courses',
      '/works',
      // /teachers：列表页设置禁止收录
      '/articles',
      '/campuses',
      '/tutorials',
      '/careers',
      // /quiz：测试设置禁止收录
      '/majors/3d-animation',
      '/courses/3d-animation-career',
      '/works/11',
      '/teachers/lin-yuqing',
      '/articles/news-a',
      '/articles/news-b',
      '/articles/category/news',
      '/campuses/beijing-haidian',
      '/about',
    ])
  })

  it('修改时间：详情用文档 updatedAt；列表页取设置与列表内容的最新值；首页取全站最新值', async () => {
    const { payload } = fakePayload()
    const items = await querySitemapItems(payload)
    const lastModified = (path: string) => items.find((item) => item.path === path)?.lastModified
    expect(lastModified('/courses/3d-animation-career')).toBe(T1)
    expect(lastModified('/courses')).toBe(T1)
    expect(lastModified('/works')).toBe(T2)
    expect(lastModified('/articles')).toBe(T4)
    expect(lastModified('/articles/category/news')).toBe(T3)
    expect(lastModified('/campuses')).toBe(T2)
    expect(lastModified('/tutorials')).toBe(T3)
    expect(lastModified('/careers')).toBe(T2)
    expect(lastModified('/')).toBe(T4)
  })

  it('查询条件与详情页一致：只取已发布；课程要求专业方向已发布，作品要求已确认授权', async () => {
    const { payload, find } = fakePayload()
    await querySitemapItems(payload)
    const whereOf = (collection: string) =>
      JSON.stringify(
        find.mock.calls.find(([args]) => args.collection === collection)?.[0] as {
          where?: unknown
        },
      )
    for (const collection of [
      'courses',
      'disciplines',
      'works',
      'teachers',
      'articles',
      'campuses',
      'pages',
      'tutorials',
    ]) {
      expect(whereOf(collection)).toContain('"_status":{"equals":"published"}')
    }
    expect(whereOf('courses')).toContain('"discipline._status":{"equals":"published"}')
    expect(whereOf('works')).toContain('"consentConfirmed":{"equals":true}')
  })
})
