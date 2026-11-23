import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LINKABLE_COLLECTIONS } from '@/components/common/rich-text'
import { cacheTags } from '@/hooks/revalidate'
import { getPayloadClient } from '@/lib/payload'

/** 记录每个 unstable_cache 的键、标签与过期时间；被缓存的函数直接执行，不做缓存 */
const cached = vi.hoisted(() => new Map<string, { tags: string[]; revalidate?: number | false }>())

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    keyParts: string[],
    options: { tags?: string[]; revalidate?: number | false },
  ) => {
    cached.set(keyParts.join('/'), { tags: options.tags ?? [], revalidate: options.revalidate })
    return fn
  },
  revalidateTag: vi.fn(),
}))
vi.mock('@/lib/payload', () => ({ getPayloadClient: vi.fn() }))

const { getArticleDetail, queryArticlePagesSettings } = await import('@/lib/data/articles')
const { getCampusDetail, queryCampusPagesSettings } = await import('@/lib/data/campuses')
const { queryCareersPageData } = await import('@/lib/data/careers')
const { ARTICLE_PAGES_DEFAULTS } = await import('@/globals/article-pages-defaults')
const { CAMPUS_PAGES_DEFAULTS } = await import('@/globals/campus-pages-defaults')
const { CAREERS_PAGE_DEFAULTS } = await import('@/globals/careers-page-defaults')

const find = vi.fn()

beforeEach(() => {
  find.mockReset()
  vi.mocked(getPayloadClient).mockResolvedValue({ find } as unknown as Awaited<
    ReturnType<typeof getPayloadClient>
  >)
})

const collections = (...slugs: string[]) => slugs.map(cacheTags.collection)
const tagsOf = (key: string) => cached.get(key)?.tags ?? []

type SettingsPayload = Parameters<typeof queryArticlePagesSettings>[0]
type CareersPayload = Parameters<typeof queryCareersPageData>[0]

describe('资讯、校区、就业服务数据的缓存标签', () => {
  it('资讯列表随文章、分类与媒体失效，并每小时过期一次（阅读量上报不触发失效）', () => {
    expect(tagsOf('article-list')).toEqual(
      expect.arrayContaining(collections('articles', 'article-categories', 'media')),
    )
    expect(cached.get('article-list')?.revalidate).toBe(3600)
    expect(tagsOf('published-article-slugs')).toEqual(collections('articles'))
  })

  it('资讯详情依赖分类、相关课程（课程卡片）与正文可链接的全部集合，标签不重复，每小时过期', () => {
    const tags = tagsOf('article-detail')
    expect(tags).toEqual(
      expect.arrayContaining([
        ...collections(
          'articles',
          'article-categories',
          'courses',
          'disciplines',
          'campuses',
          'cohorts',
          'media',
        ),
        ...LINKABLE_COLLECTIONS.map(cacheTags.collection),
      ]),
    )
    expect(new Set(tags).size).toBe(tags.length)
    expect(cached.get('article-detail')?.revalidate).toBe(3600)
  })

  it('热门课程随课程卡片的依赖失效', () => {
    expect(tagsOf('article-hot-courses')).toEqual(
      expect.arrayContaining(collections('courses', 'disciplines', 'campuses', 'cohorts', 'media')),
    )
  })

  it('校区列表随校区与媒体失效；详情另依赖课程、专业方向、开班计划与讲师', () => {
    expect(tagsOf('campus-cards')).toEqual(expect.arrayContaining(collections('campuses', 'media')))
    expect(tagsOf('campus-detail')).toEqual(
      expect.arrayContaining(
        collections('campuses', 'courses', 'disciplines', 'cohorts', 'teachers', 'media'),
      ),
    )
    expect(tagsOf('published-campus-slugs')).toEqual(collections('campuses'))
  })

  it('就业服务页依赖两个全局、故事 / 企业 / 活动 / 校区与故事正文可链接的全部集合，每小时过期', () => {
    const tags = tagsOf('careers-page-data')
    expect(tags).toEqual(
      expect.arrayContaining([
        cacheTags.global('careers-page'),
        cacheTags.global('site-settings'),
        ...collections(
          'stories',
          'partners',
          'career-events',
          'campuses',
          'courses',
          'disciplines',
          'media',
        ),
        ...LINKABLE_COLLECTIONS.map(cacheTags.collection),
      ]),
    )
    expect(new Set(tags).size).toBe(tags.length)
    expect(cached.get('careers-page-data')?.revalidate).toBe(3600)
  })

  it('页面设置随各自的全局配置与媒体（SEO 分享图）失效', () => {
    expect(tagsOf('article-pages-settings')).toEqual([
      cacheTags.global('article-pages'),
      cacheTags.collection('media'),
    ])
    expect(tagsOf('campus-pages-settings')).toEqual([
      cacheTags.global('campus-pages'),
      cacheTags.collection('media'),
    ])
  })
})

describe('详情查询的参数校验', () => {
  it('文章 / 校区 slug 不合法时直接返回 null，不查库', async () => {
    for (const slug of ['Bad', 'a b', '../x', 'x.html', '']) {
      expect(await getArticleDetail(slug)).toBeNull()
      expect(await getCampusDetail(slug)).toBeNull()
    }
    expect(find).not.toHaveBeenCalled()
  })

  it('超过 80 个字符或不在已发布清单中的 slug 不进入按 slug 缓存的详情查询', async () => {
    const long = 'a'.repeat(81)
    expect(await getArticleDetail(long)).toBeNull()
    expect(await getCampusDetail(long)).toBeNull()
    expect(find).not.toHaveBeenCalled()

    find.mockResolvedValue({ docs: [{ slug: 'learn-maya' }, { slug: 'beijing-haidian' }] })
    expect(await getArticleDetail('random-article')).toBeNull()
    expect(await getCampusDetail('random-campus')).toBeNull()
    expect(find).toHaveBeenCalledTimes(2)
    expect(find).not.toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }))
  })

  it('文章详情与校区详情只查询已发布的文档', async () => {
    // 已发布清单（不带 limit）里有这两个 slug，详情查询（limit 1）查不到
    find.mockImplementation(({ limit }: { limit?: number }) =>
      Promise.resolve({
        docs: limit === 1 ? [] : [{ slug: 'learn-maya' }, { slug: 'beijing-haidian' }],
      }),
    )
    expect(await getArticleDetail('learn-maya')).toBeNull()
    expect(await getCampusDetail('beijing-haidian')).toBeNull()
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'articles',
        where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: 'learn-maya' } }] },
      }),
    )
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'campuses',
        where: {
          and: [{ _status: { equals: 'published' } }, { slug: { equals: 'beijing-haidian' } }],
        },
      }),
    )
  })
})

describe('资讯 / 校区页面设置', () => {
  it('全局从未保存时使用默认文案', async () => {
    const findGlobal = vi.fn().mockResolvedValue({ id: 1 })
    const payload = { findGlobal } as unknown as SettingsPayload
    expect(await queryArticlePagesSettings(payload)).toEqual({
      list: {
        title: ARTICLE_PAGES_DEFAULTS.list.title,
        description: ARTICLE_PAGES_DEFAULTS.list.description,
        seo: null,
      },
      detail: {
        sidebarTitle: ARTICLE_PAGES_DEFAULTS.detail.sidebarTitle,
        sidebarDescription: ARTICLE_PAGES_DEFAULTS.detail.sidebarDescription,
      },
    })
    expect(await queryCampusPagesSettings(payload)).toEqual({
      list: {
        title: CAMPUS_PAGES_DEFAULTS.list.title,
        description: CAMPUS_PAGES_DEFAULTS.list.description,
        seo: null,
      },
      detail: {
        ctaTitle: CAMPUS_PAGES_DEFAULTS.detail.ctaTitle,
        ctaDescription: CAMPUS_PAGES_DEFAULTS.detail.ctaDescription,
      },
    })
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: 'article-pages' }))
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: 'campus-pages' }))
  })

  it('后台清空的说明不显示，标题为空时回退默认标题', async () => {
    const findGlobal = vi.fn().mockResolvedValue({
      id: 1,
      list: { title: ' ', description: '', seo: { title: 'SEO 标题' } },
      detail: {
        sidebarTitle: '',
        sidebarDescription: null,
        ctaTitle: '到校看看',
        ctaDescription: '',
      },
    })
    const payload = { findGlobal } as unknown as SettingsPayload
    const articles = await queryArticlePagesSettings(payload)
    expect(articles.list).toEqual({
      title: ARTICLE_PAGES_DEFAULTS.list.title,
      description: null,
      seo: { title: 'SEO 标题' },
    })
    expect(articles.detail).toEqual({
      sidebarTitle: ARTICLE_PAGES_DEFAULTS.detail.sidebarTitle,
      sidebarDescription: null,
    })
    const campuses = await queryCampusPagesSettings(payload)
    expect(campuses.list.title).toBe(CAMPUS_PAGES_DEFAULTS.list.title)
    expect(campuses.detail).toEqual({ ctaTitle: '到校看看', ctaDescription: null })
  })
})

describe('就业服务页数据', () => {
  /** 全局按 slug 返回；集合查询都没有数据 */
  const careersPayload = (globals: Record<string, unknown>) => {
    const findGlobal = vi.fn(async ({ slug }: { slug: string }) => globals[slug] ?? { id: 1 })
    find.mockResolvedValue({ docs: [] })
    return { payload: { find, findGlobal } as unknown as CareersPayload, findGlobal }
  }

  it('全局从未保存：标题 / 眉标 / 行动号召用默认值；没有内容的区块为 null，招聘活动区块保留（空状态）', async () => {
    const { payload } = careersPayload({})
    const data = await queryCareersPageData(payload, new Date('2026-11-23T04:00:00.000Z'))
    expect(data.intro).toEqual({
      eyebrow: CAREERS_PAGE_DEFAULTS.intro.eyebrow,
      title: CAREERS_PAGE_DEFAULTS.intro.title,
      description: null,
    })
    expect(data.process).toBeNull()
    expect(data.stories).toBeNull()
    expect(data.partners).toBeNull()
    expect(data.events).toEqual({
      heading: {
        eyebrow: CAREERS_PAGE_DEFAULTS.sections.events.eyebrow,
        title: CAREERS_PAGE_DEFAULTS.sections.events.title,
        description: null,
      },
      items: [],
    })
    expect(data.cta).toEqual(CAREERS_PAGE_DEFAULTS.cta)
    expect(data.seo).toBeNull()
  })

  it('招聘活动从北京时间当天 0 点起查询（今天已经开始的活动仍显示），按时间升序', async () => {
    const { payload } = careersPayload({})
    // 北京时间 11 月 23 日 12:00
    await queryCareersPageData(payload, new Date('2026-11-23T04:00:00.000Z'))
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'career-events',
        where: { date: { greater_than_equal: '2026-11-22T16:00:00.000Z' } },
        sort: ['date', 'id'],
      }),
    )
  })

  it('站点设置关闭学员故事模块时不查询故事；区块关闭时不查询对应内容', async () => {
    const { payload } = careersPayload({
      'site-settings': { id: 1, showStories: false },
      'careers-page': {
        id: 1,
        intro: { eyebrow: '', title: '就业支持', description: ' 说明 ' },
        process: { enabled: true, title: '流程', steps: [{ title: ' 作品集 ' }, { title: ' ' }] },
        partners: { enabled: false, title: '合作企业' },
        events: { enabled: false, title: '招聘活动' },
        cta: { title: '', description: '' },
      },
    })
    const data = await queryCareersPageData(payload)
    expect(data.intro).toEqual({ eyebrow: null, title: '就业支持', description: '说明' })
    expect(data.process?.items).toEqual([{ title: '作品集', description: null }])
    expect(data.stories).toBeNull()
    expect(data.partners).toBeNull()
    expect(data.events).toBeNull()
    expect(data.cta).toEqual({ title: CAREERS_PAGE_DEFAULTS.cta.title, description: null })
    const queried = find.mock.calls.map(([args]) => (args as { collection: string }).collection)
    expect(queried).not.toContain('stories')
    expect(queried).not.toContain('partners')
    expect(queried).not.toContain('career-events')
  })
})
