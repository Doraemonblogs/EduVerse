import { beforeEach, describe, expect, it, vi } from 'vitest'

import { cacheTags } from '@/hooks/revalidate'
import { getPayloadClient } from '@/lib/payload'

/**
 * 记录每个 unstable_cache 的键、标签、有效期与被缓存函数的参数个数（参数即缓存键的一部分）；
 * 被缓存的函数直接执行，不做缓存
 */
const cached = vi.hoisted(
  () =>
    new Map<string, { tags: string[]; revalidate: number | false | undefined; arity: number }>(),
)

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    keyParts: string[],
    options: { tags?: string[]; revalidate?: number | false },
  ) => {
    cached.set(keyParts.join('/'), {
      tags: options.tags ?? [],
      revalidate: options.revalidate,
      arity: fn.length,
    })
    return fn
  },
  revalidateTag: vi.fn(),
}))
vi.mock('@/lib/payload', () => ({ getPayloadClient: vi.fn() }))

const { getSearchResults, querySearchResults } = await import('@/lib/data/search')
const { queryTutorialPagesSettings } = await import('@/lib/data/tutorials')
const { queryQuizSettings } = await import('@/lib/data/quiz')
const { TUTORIAL_PAGES_DEFAULTS } = await import('@/globals/tutorial-pages-defaults')
const { QUIZ_SETTINGS_DEFAULTS } = await import('@/globals/quiz-settings-defaults')

const find = vi.fn()
const findGlobal = vi.fn()
type AnyPayload = Awaited<ReturnType<typeof getPayloadClient>>

beforeEach(() => {
  find.mockReset()
  findGlobal.mockReset()
  find.mockResolvedValue({ docs: [], totalDocs: 0 })
  vi.mocked(getPayloadClient).mockClear()
  vi.mocked(getPayloadClient).mockResolvedValue({ find, findGlobal } as unknown as AnyPayload)
})

const collections = (...slugs: string[]) => slugs.map(cacheTags.collection)
const tagsOf = (key: string) => cached.get(key)?.tags ?? []

describe('职业测试、免费教程、站内搜索数据的缓存标签', () => {
  it('职业测试数据随题目、专业方向与课程卡片的全部依赖失效', () => {
    expect(tagsOf('quiz-data')).toEqual(
      expect.arrayContaining(
        collections('quiz-questions', 'disciplines', 'courses', 'campuses', 'cohorts', 'media'),
      ),
    )
  })

  it('教程列表随教程、专业方向与媒体失效', () => {
    expect(tagsOf('tutorial-list')).toEqual(
      expect.arrayContaining(collections('tutorials', 'disciplines', 'media')),
    )
  })

  it('页面设置随各自的全局配置与媒体（SEO 分享图）失效', () => {
    expect(tagsOf('quiz-settings')).toEqual([
      cacheTags.global('quiz-settings'),
      cacheTags.collection('media'),
    ])
    expect(tagsOf('tutorial-pages-settings')).toEqual([
      cacheTags.global('tutorial-pages'),
      cacheTags.collection('media'),
    ])
  })

  it('热门入口随课程、专业方向与媒体失效；标签不重复', () => {
    const tags = tagsOf('search-suggestions')
    expect(tags).toEqual(expect.arrayContaining(collections('courses', 'disciplines', 'media')))
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('搜索结果不进入持久数据缓存：站内搜索只缓存没有参数的数据，访客的关键词不会成为缓存键', async () => {
    const searchEntries = [...cached].filter(([key]) => key.startsWith('search'))
    expect(searchEntries.map(([key]) => key)).toEqual(['search-suggestions'])
    for (const [key, entry] of searchEntries) expect(entry.arity, key).toBe(0)

    // 同一关键词再次搜索仍查库（只在单次请求内去重）
    const before = cached.size
    await getSearchResults('blender')
    await getSearchResults('Blender')
    expect(find).toHaveBeenCalledTimes(10)
    expect(cached.size).toBe(before)
  })
})

describe('站内搜索的查询校验', () => {
  it('空、只有空白、超过 50 个字的关键词直接返回空结果，不查库', async () => {
    for (const query of ['', '   ', '　', 'a'.repeat(51)]) {
      const results = await getSearchResults(query)
      expect(results.total).toBe(0)
      expect(results.groups.map((group) => group.total)).toEqual([0, 0, 0, 0, 0])
      expect(await querySearchResults({ find } as unknown as AnyPayload, query)).toEqual(results)
    }
    expect(find).not.toHaveBeenCalled()
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('合法关键词查五类内容，每类都只取已发布的；LIKE 通配符被转义', async () => {
    await getSearchResults(' 100%  Blender ')
    expect(find).toHaveBeenCalledTimes(5)
    const calls = find.mock.calls.map(([args]) => args as { collection: string; where: unknown })
    expect(calls.map((call) => call.collection).sort()).toEqual(
      ['articles', 'courses', 'disciplines', 'teachers', 'works'].sort(),
    )
    for (const call of calls) {
      const where = JSON.stringify(call.where)
      expect(where, call.collection).toContain('"_status":{"equals":"published"}')
      // 缓存键转了小写；数据库匹配大小写不敏感
      expect(where).toContain('"contains":"100\\\\%"')
      expect(where).toContain('"contains":"blender"')
    }
    const works = calls.find((call) => call.collection === 'works')
    expect(JSON.stringify(works?.where)).toContain('"consentConfirmed":{"equals":true}')
    const courses = calls.find((call) => call.collection === 'courses')
    expect(JSON.stringify(courses?.where)).toContain('"discipline._status":{"equals":"published"}')
  })
})

describe('页面设置的兜底', () => {
  it('教程页面设置从未保存时用默认文案；后台清空的可选文字不显示', async () => {
    findGlobal.mockResolvedValueOnce({})
    const defaults = await queryTutorialPagesSettings({ findGlobal } as unknown as AnyPayload)
    expect(defaults).toEqual({
      list: {
        title: TUTORIAL_PAGES_DEFAULTS.list.title,
        description: TUTORIAL_PAGES_DEFAULTS.list.description,
        seo: null,
      },
      gate: { ...TUTORIAL_PAGES_DEFAULTS.gate },
    })
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: 'tutorial-pages' }))

    findGlobal.mockResolvedValueOnce({
      list: { title: ' 教程 ', description: null, seo: { title: 'SEO' } },
      gate: { title: '', description: '  ', submitLabel: '看视频' },
    })
    expect(await queryTutorialPagesSettings({ findGlobal } as unknown as AnyPayload)).toEqual({
      list: { title: '教程', description: null, seo: { title: 'SEO' } },
      gate: {
        title: TUTORIAL_PAGES_DEFAULTS.gate.title,
        description: null,
        submitLabel: '看视频',
      },
    })
  })

  it('职业测试设置从未保存时用默认文案', async () => {
    findGlobal.mockResolvedValueOnce({})
    const settings = await queryQuizSettings({ findGlobal } as unknown as AnyPayload)
    expect(settings.intro.title).toBe(QUIZ_SETTINGS_DEFAULTS.intro.title)
    expect(settings.result.nextSteps).toEqual(QUIZ_SETTINGS_DEFAULTS.result.nextSteps)
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: 'quiz-settings' }))
  })
})
