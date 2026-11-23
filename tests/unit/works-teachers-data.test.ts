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

const { getWorkDetail, queryWorkPagesSettings } = await import('@/lib/data/works')
const { getTeacherDetail, queryTeacherPagesSettings } = await import('@/lib/data/teachers')
const { WORK_PAGES_DEFAULTS } = await import('@/globals/work-pages-defaults')
const { TEACHER_PAGES_DEFAULTS } = await import('@/globals/teacher-pages-defaults')

const find = vi.fn()

beforeEach(() => {
  find.mockReset()
  vi.mocked(getPayloadClient).mockResolvedValue({ find } as unknown as Awaited<
    ReturnType<typeof getPayloadClient>
  >)
})

const collections = (...slugs: string[]) => slugs.map(cacheTags.collection)

/** 设置读取函数接收的 Payload 实例（只用到 findGlobal） */
type SettingsPayload = Parameters<typeof queryWorkPagesSettings>[0]

describe('作品与师资数据的缓存标签', () => {
  it('作品列表随作品、专业方向、软件与媒体失效', () => {
    expect(cached.get('work-list')).toEqual(
      expect.arrayContaining(collections('works', 'disciplines', 'software', 'media')),
    )
  })

  it('作品详情还依赖课程（所属课程是否可访问）', () => {
    expect(cached.get('work-detail')).toEqual(
      expect.arrayContaining(collections('works', 'disciplines', 'courses', 'software', 'media')),
    )
    expect(cached.get('published-work-ids')).toEqual(collections('works'))
  })

  it('讲师列表随讲师、专业方向与媒体失效', () => {
    expect(cached.get('teacher-list')).toEqual(
      expect.arrayContaining(collections('teachers', 'disciplines', 'media')),
    )
    expect(cached.get('published-teacher-slugs')).toEqual(collections('teachers'))
  })

  it('讲师详情依赖课程卡片、作品与站点设置，并包含个人简介可链接的全部集合，标签不重复', () => {
    const tags = cached.get('teacher-detail') ?? []
    expect(tags).toEqual(
      expect.arrayContaining([
        ...collections(
          'teachers',
          'disciplines',
          'courses',
          'cohorts',
          'campuses',
          'software',
          'works',
          'media',
        ),
        ...LINKABLE_COLLECTIONS.map(cacheTags.collection),
        cacheTags.global('site-settings'),
      ]),
    )
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('页面设置随各自的全局配置与媒体（SEO 分享图）失效', () => {
    expect(cached.get('work-pages-settings')).toEqual([
      cacheTags.global('work-pages'),
      cacheTags.collection('media'),
    ])
    expect(cached.get('teacher-pages-settings')).toEqual([
      cacheTags.global('teacher-pages'),
      cacheTags.collection('media'),
    ])
  })
})

describe('详情查询的参数校验', () => {
  it('作品 ID 不是正整数时直接返回 null，不查库', async () => {
    for (const id of ['0', '012', '-3', '1.5', 'abc', '', '99999999999']) {
      expect(await getWorkDetail(id)).toBeNull()
    }
    expect(find).not.toHaveBeenCalled()
  })

  it('讲师 slug 不合法时直接返回 null，不查库', async () => {
    for (const slug of ['Bad', 'a b', '../x', 'x.html', '']) {
      expect(await getTeacherDetail(slug)).toBeNull()
    }
    expect(find).not.toHaveBeenCalled()
  })

  it('作品详情只查询已发布且已授权的作品', async () => {
    find.mockResolvedValue({ docs: [] })
    expect(await getWorkDetail('12')).toBeNull()
    expect(find).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'works',
        where: {
          and: [
            {
              and: [{ _status: { equals: 'published' } }, { consentConfirmed: { equals: true } }],
            },
            { id: { equals: 12 } },
          ],
        },
      }),
    )
  })

  it('讲师详情只查询已发布的讲师', async () => {
    find.mockResolvedValue({ docs: [] })
    expect(await getTeacherDetail('lin-yu-qing')).toBeNull()
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'teachers',
        where: {
          and: [{ _status: { equals: 'published' } }, { slug: { equals: 'lin-yu-qing' } }],
        },
      }),
    )
  })
})

describe('作品 / 师资页面设置', () => {
  it('全局从未保存时使用默认文案', async () => {
    const findGlobal = vi.fn().mockResolvedValue({ id: 1 })
    const payload = { findGlobal } as unknown as SettingsPayload
    expect(await queryWorkPagesSettings(payload)).toEqual({
      list: {
        title: WORK_PAGES_DEFAULTS.list.title,
        description: WORK_PAGES_DEFAULTS.list.description,
        seo: null,
      },
      detail: {
        ctaTitle: WORK_PAGES_DEFAULTS.detail.ctaTitle,
        ctaDescription: WORK_PAGES_DEFAULTS.detail.ctaDescription,
      },
    })
    expect(await queryTeacherPagesSettings(payload)).toEqual({
      list: {
        title: TEACHER_PAGES_DEFAULTS.list.title,
        description: TEACHER_PAGES_DEFAULTS.list.description,
        seo: null,
      },
      detail: {
        ctaTitle: TEACHER_PAGES_DEFAULTS.detail.ctaTitle,
        ctaDescription: TEACHER_PAGES_DEFAULTS.detail.ctaDescription,
      },
    })
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: 'work-pages' }))
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: 'teacher-pages' }))
  })

  it('后台清空的说明不显示，标题为空时回退默认标题', async () => {
    const findGlobal = vi.fn().mockResolvedValue({
      id: 1,
      list: { title: ' ', description: '', seo: { title: 'SEO 标题' } },
      detail: { ctaTitle: '行动号召', ctaDescription: null },
    })
    const payload = { findGlobal } as unknown as SettingsPayload
    for (const settings of [
      await queryWorkPagesSettings(payload),
      await queryTeacherPagesSettings(payload),
    ]) {
      expect(settings.list.description).toBeNull()
      expect(settings.list.seo).toEqual({ title: 'SEO 标题' })
      expect(settings.detail).toEqual({ ctaTitle: '行动号召', ctaDescription: null })
    }
    expect((await queryWorkPagesSettings(payload)).list.title).toBe(WORK_PAGES_DEFAULTS.list.title)
    expect((await queryTeacherPagesSettings(payload)).list.title).toBe(
      TEACHER_PAGES_DEFAULTS.list.title,
    )
  })
})
