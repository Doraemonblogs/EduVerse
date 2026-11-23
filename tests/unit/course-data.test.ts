import type { Payload } from 'payload'
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

const {
  getCourseDetail,
  getDisciplineDetail,
  guardCourseLinks,
  queryCourseDetail,
  queryCoursePagesSettings,
  queryDisciplineDetail,
} = await import('@/lib/data/courses')
const { COURSE_PAGES_DEFAULTS } = await import('@/globals/course-pages-defaults')

const find = vi.fn()

beforeEach(() => {
  find.mockReset()
  vi.mocked(getPayloadClient).mockResolvedValue({ find } as unknown as Awaited<
    ReturnType<typeof getPayloadClient>
  >)
})

const collections = (...slugs: string[]) => slugs.map(cacheTags.collection)

describe('课程数据的缓存标签', () => {
  it('课程卡片随课程、专业方向、校区、开班计划与媒体失效', () => {
    expect(cached.get('course-cards')).toEqual(
      expect.arrayContaining(collections('courses', 'disciplines', 'campuses', 'cohorts', 'media')),
    )
  })

  it('课程详情还依赖讲师、软件、FAQ、作品与站点设置（薪资免责声明）', () => {
    expect(cached.get('course-detail')).toEqual(
      expect.arrayContaining([
        ...collections(
          'courses',
          'disciplines',
          'campuses',
          'cohorts',
          'teachers',
          'software',
          'faqs',
          'works',
          'media',
        ),
        cacheTags.global('site-settings'),
      ]),
    )
  })

  it('专业方向页额外包含富文本可链接的全部集合，标签不重复', () => {
    const tags = cached.get('discipline-detail') ?? []
    expect(tags).toEqual(
      expect.arrayContaining([
        ...LINKABLE_COLLECTIONS.map(cacheTags.collection),
        ...collections('teachers', 'works', 'cohorts'),
        cacheTags.global('site-settings'),
      ]),
    )
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('slug 清单与课程页面设置的标签', () => {
    expect(cached.get('published-course-slugs')).toEqual(collections('courses', 'disciplines'))
    expect(cached.get('published-discipline-slugs')).toEqual(collections('disciplines'))
    expect(cached.get('course-pages-settings')).toEqual([
      cacheTags.global('course-pages'),
      cacheTags.collection('media'),
    ])
  })
})

describe('详情查询的 slug 校验', () => {
  it('格式不合法的 slug 直接返回 null，不查库', async () => {
    for (const slug of ['Bad', 'a b', '../x', 'x.html', '']) {
      expect(await getCourseDetail(slug)).toBeNull()
      expect(await getDisciplineDetail(slug)).toBeNull()
    }
    expect(find).not.toHaveBeenCalled()
  })

  it('超过 80 个字符的 slug 直接返回 null，不查库', async () => {
    const long = `ui-${'a'.repeat(78)}`
    expect(long).toHaveLength(81)
    expect(await getCourseDetail(long)).toBeNull()
    expect(await getDisciplineDetail(long)).toBeNull()
    expect(find).not.toHaveBeenCalled()
  })

  it('不在已发布清单中的 slug 只查清单，不进入按 slug 缓存的详情查询', async () => {
    find.mockResolvedValue({ docs: [{ slug: 'ui-ux-career' }] })
    expect(await getCourseDetail('random-course')).toBeNull()
    expect(await getDisciplineDetail('random-major')).toBeNull()
    expect(find).toHaveBeenCalledTimes(2)
    expect(find).not.toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }))
  })

  it('课程详情只查询已发布的课程', async () => {
    // 已发布清单（不带 limit）里有这门课，详情查询（limit 1）查不到
    find.mockImplementation(({ limit }: { limit?: number }) =>
      Promise.resolve({ docs: limit === 1 ? [] : [{ slug: 'ui-ux-career' }] }),
    )
    expect(await getCourseDetail('ui-ux-career')).toBeNull()
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'courses',
        where: {
          and: [{ _status: { equals: 'published' } }, { slug: { equals: 'ui-ux-career' } }],
        },
      }),
    )
  })
})

describe('课程页面设置', () => {
  it('全局从未保存时使用默认文案', async () => {
    const findGlobal = vi.fn().mockResolvedValue({ id: 1 })
    const settings = await queryCoursePagesSettings({ findGlobal } as unknown as Parameters<
      typeof queryCoursePagesSettings
    >[0])
    expect(settings).toEqual({
      list: {
        title: COURSE_PAGES_DEFAULTS.list.title,
        description: COURSE_PAGES_DEFAULTS.list.description,
        seo: null,
      },
      detail: {
        sidebarTitle: COURSE_PAGES_DEFAULTS.detail.sidebarTitle,
        sidebarDescription: COURSE_PAGES_DEFAULTS.detail.sidebarDescription,
      },
      major: {
        ctaTitle: COURSE_PAGES_DEFAULTS.major.ctaTitle,
        ctaDescription: COURSE_PAGES_DEFAULTS.major.ctaDescription,
      },
    })
  })

  it('后台清空的说明不显示，标题为空时回退默认标题', async () => {
    const findGlobal = vi.fn().mockResolvedValue({
      id: 1,
      list: { title: ' ', description: null, seo: { title: 'SEO 标题' } },
      detail: { sidebarTitle: '侧栏', sidebarDescription: '' },
      major: { ctaTitle: '行动号召', ctaDescription: '说明' },
    })
    const settings = await queryCoursePagesSettings({ findGlobal } as unknown as Parameters<
      typeof queryCoursePagesSettings
    >[0])
    expect(settings.list).toEqual({
      title: COURSE_PAGES_DEFAULTS.list.title,
      description: null,
      seo: { title: 'SEO 标题' },
    })
    expect(settings.detail).toEqual({ sidebarTitle: '侧栏', sidebarDescription: null })
    expect(settings.major).toEqual({ ctaTitle: '行动号召', ctaDescription: '说明' })
  })
})

/** 封面：竖版原图，hero 是等比缩放（同样竖版），og 是 1200×630 居中裁切 */
const portraitCover = {
  id: 9,
  alt: '课程封面',
  url: '/api/media/file/cover.webp',
  width: 3000,
  height: 4000,
  sizes: {
    card: { url: '/api/media/file/cover-800x1067.webp', width: 800, height: 1067 },
    hero: { url: '/api/media/file/cover-1920x2560.webp', width: 1920, height: 2560 },
    og: { url: '/api/media/file/cover-1200x630.webp', width: 1200, height: 630 },
  },
}

const disciplineDoc = {
  id: 2,
  name: '三维动画',
  shortName: '三维动画',
  slug: '3d-animation',
  order: 1,
  cover: portraitCover,
  intro: null,
  _status: 'published',
}

const courseDoc = {
  id: 1,
  title: '三维动画长期就业班',
  slug: '3d-animation-career',
  summary: '示例课程',
  cover: portraitCover,
  discipline: disciplineDoc,
  classType: 'long_term',
  deliveryModes: ['offline'],
  duration: { value: 6, unit: 'month' },
  campuses: [],
  stages: [],
  teachers: [],
  _status: 'published',
}

/** 按集合返回文档的假 Payload（其余集合返回空列表） */
function fakePayload(docsByCollection: Record<string, unknown[]>): Payload {
  find.mockImplementation(({ collection }: { collection: string }) =>
    Promise.resolve({ docs: docsByCollection[collection] ?? [] }),
  )
  const findGlobal = vi.fn().mockResolvedValue({ salaryDisclaimer: '仅供参考。' })
  return { find, findGlobal } as unknown as Payload
}

describe('分享图（og 尺寸）', () => {
  it('课程详情的 shareImage 取封面的 og 裁切，首屏大图仍用 hero 尺寸', async () => {
    const detail = await queryCourseDetail(fakePayload({ courses: [courseDoc] }), courseDoc.slug)
    expect(detail?.shareImage).toEqual({
      src: '/api/media/file/cover-1200x630.webp',
      alt: '课程封面',
      width: 1200,
      height: 630,
    })
    expect(detail?.heroImage?.src).toBe('/api/media/file/cover-1920x2560.webp')
  })

  it('专业方向的 shareImage 取封面的 og 裁切', async () => {
    const detail = await queryDisciplineDetail(
      fakePayload({ disciplines: [disciplineDoc] }),
      disciplineDoc.slug,
    )
    expect(detail?.shareImage).toEqual({
      src: '/api/media/file/cover-1200x630.webp',
      alt: '课程封面',
      width: 1200,
      height: 630,
    })
  })

  it('封面没有 og 裁切（如 SVG）时退回原图；没有封面时为 null', async () => {
    const svg = { id: 10, alt: '矢量封面', url: '/api/media/file/a.svg', width: 1600, height: 900 }
    const withSvg = await queryDisciplineDetail(
      fakePayload({ disciplines: [{ ...disciplineDoc, cover: svg }] }),
      disciplineDoc.slug,
    )
    expect(withSvg?.shareImage?.src).toBe('/api/media/file/a.svg')
    const withoutCover = await queryDisciplineDetail(
      fakePayload({ disciplines: [{ ...disciplineDoc, cover: 10 }] }),
      disciplineDoc.slug,
    )
    expect(withoutCover?.shareImage).toBeNull()
  })
})

/** 富文本：一个站内链接 + 一个关联节点，都指向已填充的课程 */
const courseLinks = (...courses: { id: number; slug: string }[]) => ({
  root: {
    type: 'root',
    version: 1,
    children: courses.flatMap((course) => [
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
      {
        type: 'relationship',
        version: 2,
        relationTo: 'courses',
        value: { ...course, title: course.slug, _status: 'published' },
      },
    ]),
  },
})

/** 富文本里全部课程引用的前台地址（按出现顺序） */
function courseHrefs(value: unknown): (string | null)[] {
  const hrefs: (string | null)[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (record.relationTo === 'courses') hrefs.push(docHref('courses', record.value))
    Object.values(record).forEach(walk)
  }
  walk(value)
  return hrefs
}

describe('富文本课程链接守卫（guardCourseLinks）', () => {
  const live = { id: 1, slug: 'live-course' }
  const orphan = { id: 2, slug: 'orphan-course' }

  it('一次查询引用课程中可访问的（已发布且所属专业方向已发布），其余只渲染文字', async () => {
    const payload = fakePayload({ courses: [{ id: live.id }] })
    const guarded = await guardCourseLinks(payload, courseLinks(live, orphan))
    expect(find).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'courses',
        where: {
          and: [
            { id: { in: [live.id, orphan.id] } },
            { _status: { equals: 'published' } },
            { 'discipline._status': { equals: 'published' } },
          ],
        },
        depth: 0,
        pagination: false,
      }),
    )
    expect(courseHrefs(guarded)).toEqual([
      '/courses/live-course',
      '/courses/live-course',
      null,
      null,
    ])
  })

  it('富文本没有课程引用时不查库', async () => {
    const payload = fakePayload({})
    expect(await guardCourseLinks(payload, null)).toBeNull()
    const plain = { root: { type: 'root', version: 1, children: [] } }
    expect(await guardCourseLinks(payload, plain)).toBe(plain)
    expect(find).not.toHaveBeenCalled()
  })

  it('专业介绍经过守卫：所属专业方向已下线的课程不输出链接', async () => {
    const payload = fakePayload({
      disciplines: [{ ...disciplineDoc, intro: courseLinks(live, orphan) }],
      // courses 集合：守卫查询只返回可访问的课程；课程卡片查询拿到同一条记录，
      // 它没有已填充的专业方向，会被 toCourseCard 过滤，不影响断言
      courses: [{ id: live.id }],
    })
    const detail = await queryDisciplineDetail(payload, disciplineDoc.slug)
    expect(courseHrefs(detail?.intro)).toEqual([
      '/courses/live-course',
      '/courses/live-course',
      null,
      null,
    ])
  })
})
