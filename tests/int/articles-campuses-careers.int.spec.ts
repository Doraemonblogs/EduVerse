import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { docHref } from '@/components/common/rich-text'
import { createArticleViewHandler } from '@/endpoints/article-view'
import { ViewDeduper } from '@/lib/articles/view'
import { upcomingCareerEvents } from '@/lib/careers/mappers'
import { beijingDayStart, upcomingCohorts } from '@/lib/course/cohorts'
import { BurstLimiter } from '@/lib/lead/burst-limiter'
import config from '@/payload.config'

import { generatePlaceholder } from '../../scripts/seed/placeholders'

/**
 * 资讯、校区、就业服务数据层与阅读量接口（集成）：真实 Payload + 测试库，直接调用查询函数（不经过 Next 缓存）。
 * 重点验证草稿过滤（文章 / 分类 / 校区 / 讲师 / 故事）、相关课程的可访问性、开班与招聘活动的日期过滤，
 * 以及阅读量接口：只给已发布文章计数、不改 updatedAt / 不写版本（绕过钩子）、按 IP 去重、非法 ID。
 * 测试数据统一用 acc-int 前缀，开始前与结束后都会清理；测试库里已有的其它数据（如种子数据）不影响断言。
 */
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => fn,
  revalidateTag: vi.fn(),
}))

const {
  queryArticleDetail,
  queryArticleList,
  queryArticlePagesSettings,
  queryPublishedArticleSlugs,
} = await import('@/lib/data/articles')
const { queryCampusCards, queryCampusDetail, queryCampusPagesSettings, queryPublishedCampusSlugs } =
  await import('@/lib/data/campuses')
const { queryCareersPageData } = await import('@/lib/data/careers')
const { queryCourseDetail } = await import('@/lib/data/courses')
const { queryTeacherDetail } = await import('@/lib/data/teachers')

const PREFIX = 'acc-int'
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString()

let payload: Payload
const ids = {
  media: 0,
  disciplinePublished: 0,
  disciplineDraft: 0,
  campus: 0,
  campusDraft: 0,
  course: 0,
  courseDraftDiscipline: 0,
  courseNeverPublished: 0,
  cohortUpcoming: 0,
  cohortPast: 0,
  cohortClosed: 0,
  cohortUnreachableCourse: 0,
  teacher: 0,
  teacherDraft: 0,
  teacherOtherCampus: 0,
  categoryA: 0,
  categoryDraftOnly: 0,
  articleNew: 0,
  articleOld: 0,
  articleDraft: 0,
  articleDraftOnlyCategory: 0,
  storyFeatured: 0,
  storyPlain: 0,
  storyNoConsent: 0,
  storyDraft: 0,
  eventFuture: 0,
  eventDraftCampus: 0,
  eventToday: 0,
  eventPast: 0,
}

/** 测试开始前站点设置里的学员故事开关（结束后恢复） */
let originalShowStories: boolean | null | undefined

const base = { direction: 'ltr' as const, format: '' as const, indent: 0, version: 1 }

const text = (value: string) => ({
  type: 'text',
  text: value,
  format: 0,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

const courseLink = (id: number, label: string) => ({
  ...base,
  type: 'link',
  version: 3,
  fields: { linkType: 'internal', newTab: false, doc: { relationTo: 'courses', value: id } },
  children: [text(label)],
})

/** 富文本：一段文字 + 链接到可访问的课程与专业方向是草稿的课程 */
function richText(intro: string) {
  return {
    root: {
      ...base,
      type: 'root',
      children: [
        {
          ...base,
          type: 'paragraph',
          textFormat: 0,
          textStyle: '',
          children: [
            text(intro),
            courseLink(ids.course, '可访问的课程'),
            text('、'),
            courseLink(ids.courseDraftDiscipline, '已下线方向的课程'),
          ],
        },
      ],
    },
  }
}

/** 富文本里全部站内链接：链接文字 → 前台渲染出的地址（docHref；null 表示只渲染文字） */
function linkHrefs(value: unknown): Record<string, string | null> {
  const result: Record<string, string | null> = {}
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const n = node as {
      type?: string
      children?: unknown[]
      fields?: { doc?: { relationTo?: string; value?: unknown } }
    }
    if (n.type === 'link') {
      const label = (n.children as { text?: string }[] | undefined)?.map((c) => c.text).join('')
      const doc = n.fields?.doc
      result[label ?? ''] = doc?.relationTo ? docHref(doc.relationTo, doc.value) : null
    }
    for (const child of n.children ?? []) walk(child)
  }
  walk((value as { root?: unknown } | null)?.root)
  return result
}

async function cleanup() {
  const like = { like: PREFIX }
  const courses = await payload.find({
    collection: 'courses',
    where: { slug: like },
    depth: 0,
    pagination: false,
    select: {},
  })
  const courseIds = courses.docs.map((c) => c.id)
  if (courseIds.length > 0) {
    await payload.delete({ collection: 'cohorts', where: { course: { in: courseIds } } })
  }
  await payload.delete({ collection: 'career-events', where: { title: like } })
  await payload.delete({ collection: 'stories', where: { displayName: like } })
  await payload.delete({ collection: 'articles', where: { slug: like } })
  await payload.delete({ collection: 'article-categories', where: { slug: like } })
  await payload.delete({ collection: 'teachers', where: { slug: like } })
  await payload.delete({ collection: 'courses', where: { slug: like } })
  await payload.delete({ collection: 'campuses', where: { slug: like } })
  await payload.delete({ collection: 'disciplines', where: { slug: like } })
  await payload.delete({ collection: 'media', where: { alt: like } })
}

async function setShowStories(value: boolean) {
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      brandName: settings.brandName || '测试品牌',
      hotline: settings.hotline || '400-000-0000',
      salaryDisclaimer: settings.salaryDisclaimer || '集成测试免责声明：不作为培训效果承诺。',
      showStories: value,
    },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await cleanup()
  originalShowStories = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })).showStories
  await setShowStories(true)

  const image = await generatePlaceholder(
    { kind: 'art', seed: PREFIX, hue: 120, aspect: '16:9', label: '测试', size: 64 },
    `seed-${PREFIX}`,
  )
  ids.media = (
    await payload.create({
      collection: 'media',
      data: { alt: `${PREFIX} 封面` },
      file: {
        data: image.data,
        mimetype: image.mimetype,
        name: image.filename,
        size: image.data.length,
      },
    })
  ).id
  const cover = ids.media

  ids.disciplinePublished = (
    await payload.create({
      collection: 'disciplines',
      data: {
        name: '资讯测试方向',
        slug: `${PREFIX}-pub`,
        cover,
        order: 960,
        _status: 'published',
      },
    })
  ).id
  ids.disciplineDraft = (
    await payload.create({
      collection: 'disciplines',
      draft: true,
      data: { name: '资讯草稿方向', slug: `${PREFIX}-draft`, cover, _status: 'draft' },
    })
  ).id

  const campus = (suffix: string) => ({
    name: `资讯测试校区 ${suffix}`,
    slug: `${PREFIX}-campus-${suffix}`,
    city: '测试市',
    citySlug: `${PREFIX}-city`,
    address: '测试地址（示例）',
    phone: '010-0000-0000',
    cover,
    order: 900,
  })
  ids.campus = (
    await payload.create({
      collection: 'campuses',
      data: {
        ...campus('pub'),
        location: { lng: 116.310316, lat: 39.992806 },
        transit: '地铁示例站 B 口',
        photos: [
          { image: cover, caption: '前台接待区' },
          { image: cover, caption: '' },
        ],
        _status: 'published',
      },
    })
  ).id
  ids.campusDraft = (
    await payload.create({
      collection: 'campuses',
      draft: true,
      data: { ...campus('draft'), _status: 'draft' },
    })
  ).id

  const course = (suffix: string, order: number) => ({
    title: `资讯测试课程 ${suffix}`,
    slug: `${PREFIX}-${suffix}`,
    discipline: ids.disciplinePublished,
    classType: 'long_term' as const,
    deliveryModes: ['offline' as const],
    duration: { value: 3, unit: 'month' as const },
    summary: '集成测试课程',
    cover,
    campuses: [ids.campusDraft, ids.campus],
    order,
  })
  ids.course = (
    await payload.create({
      collection: 'courses',
      data: { ...course('a', 1), _status: 'published' },
    })
  ).id
  ids.courseDraftDiscipline = (
    await payload.create({
      collection: 'courses',
      data: { ...course('y', 2), discipline: ids.disciplineDraft, _status: 'published' },
    })
  ).id
  ids.courseNeverPublished = (
    await payload.create({
      collection: 'courses',
      draft: true,
      data: { ...course('x', 3), _status: 'draft' },
    })
  ).id

  const cohort = (data: Record<string, unknown>) =>
    payload.create({
      collection: 'cohorts',
      data: {
        course: ids.course,
        campus: ids.campus,
        mode: 'offline',
        status: 'enrolling',
        ...data,
      } as never,
    })
  ids.cohortUpcoming = (await cohort({ startDate: inDays(10) })).id
  ids.cohortPast = (await cohort({ startDate: inDays(-5) })).id
  ids.cohortClosed = (await cohort({ startDate: inDays(20), status: 'closed' })).id
  ids.cohortUnreachableCourse = (
    await cohort({ course: ids.courseDraftDiscipline, startDate: inDays(12) })
  ).id

  const teacher = (suffix: string, campusId: number) => ({
    name: `资讯测试讲师 ${suffix}`,
    slug: `${PREFIX}-teacher-${suffix}`,
    title: '测试讲师',
    avatar: cover,
    disciplines: [ids.disciplinePublished],
    campus: campusId,
    order: 900,
  })
  ids.teacher = (
    await payload.create({
      collection: 'teachers',
      data: { ...teacher('pub', ids.campus), _status: 'published' },
    })
  ).id
  ids.teacherDraft = (
    await payload.create({
      collection: 'teachers',
      draft: true,
      data: { ...teacher('draft', ids.campus), _status: 'draft' },
    })
  ).id
  ids.teacherOtherCampus = (
    await payload.create({
      collection: 'teachers',
      data: { ...teacher('other', ids.campusDraft), _status: 'published' },
    })
  ).id

  ids.categoryA = (
    await payload.create({
      collection: 'article-categories',
      data: {
        name: '资讯测试分类',
        slug: `${PREFIX}-cat-a`,
        description: ' 测试分类描述 ',
        order: 900,
      },
    })
  ).id
  ids.categoryDraftOnly = (
    await payload.create({
      collection: 'article-categories',
      data: { name: '只有草稿的分类', slug: `${PREFIX}-cat-b`, order: 901 },
    })
  ).id

  const article = (suffix: string, category: number, publishedAt: string) => ({
    title: `资讯测试文章 ${suffix}`,
    slug: `${PREFIX}-article-${suffix}`,
    category,
    cover,
    excerpt: '集成测试摘要',
    content: richText('正文：'),
    publishedAt,
    authorName: '测试作者',
  })
  ids.articleNew = (
    await payload.create({
      collection: 'articles',
      data: {
        ...article('new', ids.categoryA, inDays(-1)),
        relatedCourses: [ids.courseDraftDiscipline, ids.courseNeverPublished, ids.course],
        _status: 'published',
      },
    })
  ).id
  ids.articleOld = (
    await payload.create({
      collection: 'articles',
      data: { ...article('old', ids.categoryA, inDays(-3)), _status: 'published' },
    })
  ).id
  ids.articleDraft = (
    await payload.create({
      collection: 'articles',
      draft: true,
      data: { ...article('draft', ids.categoryA, inDays(-0.5)), _status: 'draft' },
    })
  ).id
  ids.articleDraftOnlyCategory = (
    await payload.create({
      collection: 'articles',
      draft: true,
      data: { ...article('draft-b', ids.categoryDraftOnly, inDays(-2)), _status: 'draft' },
    })
  ).id

  const story = (suffix: string, featured: boolean) => ({
    displayName: `${PREFIX} 学员 ${suffix}`,
    background: '会计转行',
    avatar: cover,
    course: ids.course,
    currentRole: 'UI 设计师',
    companyName: '某科技公司（虚构）',
    quote: '从零开始学设计',
    story: richText('学习经历：'),
    consentConfirmed: true,
    featured,
    order: 900,
  })
  ids.storyPlain = (
    await payload.create({
      collection: 'stories',
      data: { ...story('plain', false), course: ids.courseDraftDiscipline, _status: 'published' },
    })
  ).id
  ids.storyFeatured = (
    await payload.create({
      collection: 'stories',
      data: { ...story('featured', true), _status: 'published' },
    })
  ).id
  ids.storyNoConsent = (
    await payload.create({
      collection: 'stories',
      data: { ...story('no-consent', true), _status: 'published' },
    })
  ).id
  // 模拟历史数据 / 绕过校验写入的“已发布但未授权”故事
  await payload.db.updateOne({
    collection: 'stories',
    id: ids.storyNoConsent,
    data: { consentConfirmed: false },
  })
  ids.storyDraft = (
    await payload.create({
      collection: 'stories',
      draft: true,
      data: { ...story('draft', true), _status: 'draft' },
    })
  ).id

  const event = (suffix: string, date: string, campusId: number | null) =>
    payload.create({
      collection: 'career-events',
      data: {
        title: `${PREFIX} 活动 ${suffix}`,
        date,
        location: '测试地点',
        campus: campusId,
        description: '活动说明',
      },
    })
  const todayStart = beijingDayStart(new Date())
  ids.eventFuture = (await event('future', inDays(7), ids.campus)).id
  ids.eventDraftCampus = (await event('draft-campus', inDays(14), ids.campusDraft)).id
  // 北京时间今天 0:30（今天的活动仍显示）与昨天 23:00（已过去）
  ids.eventToday = (await event('today', new Date(todayStart + HOUR / 2).toISOString(), null)).id
  ids.eventPast = (await event('past', new Date(todayStart - HOUR).toISOString(), null)).id
})

afterAll(async () => {
  if (!payload) return
  await cleanup()
  await setShowStories(originalShowStories !== false)
})

describe('资讯数据', () => {
  it('列表只含已发布文章（发布时间降序），分类导航只含有已发布文章的分类（带文章数与描述）', async () => {
    const { articles, categories } = await queryArticleList(payload)
    const ours = articles.filter((a) => a.slug.startsWith(PREFIX))
    expect(ours.map((a) => a.id)).toEqual([ids.articleNew, ids.articleOld])
    expect(ours[0]).toMatchObject({
      title: '资讯测试文章 new',
      category: { id: ids.categoryA, name: '资讯测试分类', slug: `${PREFIX}-cat-a` },
      authorName: '测试作者',
      views: 0,
    })
    expect(ours[0]?.cover?.src).toMatch(/^\/api\/media\/file\//)

    const category = categories.find((c) => c.id === ids.categoryA)
    expect(category).toEqual({
      id: ids.categoryA,
      name: '资讯测试分类',
      slug: `${PREFIX}-cat-a`,
      description: '测试分类描述',
      count: 2,
    })
    expect(categories.some((c) => c.id === ids.categoryDraftOnly)).toBe(false)

    const slugs = await queryPublishedArticleSlugs(payload)
    expect(slugs).toContain(`${PREFIX}-article-new`)
    expect(slugs).not.toContain(`${PREFIX}-article-draft`)
  })

  it('详情：草稿返回 null；相关课程只含可访问课程（按关联顺序），相关文章同分类且排除本文与草稿', async () => {
    expect(await queryArticleDetail(payload, `${PREFIX}-article-draft`)).toBeNull()
    expect(await queryArticleDetail(payload, `${PREFIX}-missing`)).toBeNull()

    const detail = await queryArticleDetail(payload, `${PREFIX}-article-new`)
    expect(detail).not.toBeNull()
    expect(detail!.relatedCourses.map((c) => c.id)).toEqual([ids.course])
    // 课程卡片的开设校区只含已发布的校区
    expect(detail!.relatedCourses[0]?.campuses.map((c) => c.id)).toEqual([ids.campus])
    expect(detail!.relatedArticles.map((a) => a.id)).toEqual([ids.articleOld])
    expect(detail!.heroImage?.src).toMatch(/^\/api\/media\/file\//)
    expect(detail!.shareImage?.src).toMatch(/^\/api\/media\/file\//)
    expect(typeof detail!.updatedAt).toBe('string')
    // 正文里指向专业方向未发布课程的链接只渲染文字
    expect(linkHrefs(detail!.content)).toEqual({
      可访问的课程: `/courses/${PREFIX}-a`,
      已下线方向的课程: null,
    })
  })

  it('资讯页面设置总有标题（全局从未保存时用默认值）', async () => {
    const settings = await queryArticlePagesSettings(payload)
    expect(settings.list.title).toBeTruthy()
    expect(settings.detail.sidebarTitle).toBeTruthy()
  })
})

describe('校区数据', () => {
  it('列表与 slug 只含已发布校区', async () => {
    const cards = await queryCampusCards(payload)
    expect(cards.some((c) => c.id === ids.campus)).toBe(true)
    expect(cards.some((c) => c.id === ids.campusDraft)).toBe(false)
    const card = cards.find((c) => c.id === ids.campus)!
    expect(card.phoneHref).toBe('tel:01000000000')
    expect(card.mapUrl).toContain('https://uri.amap.com/marker?position=116.310316,39.992806')

    const slugs = await queryPublishedCampusSlugs(payload)
    expect(slugs).toContain(`${PREFIX}-campus-pub`)
    expect(slugs).not.toContain(`${PREFIX}-campus-draft`)
    expect(await queryCampusDetail(payload, `${PREFIX}-campus-draft`)).toBeNull()
  })

  it('详情：可访问的课程、未结束开班（带课程、渲染时按日期过滤）、已发布讲师、环境照片与地图', async () => {
    const detail = await queryCampusDetail(payload, `${PREFIX}-campus-pub`)
    expect(detail).not.toBeNull()
    expect(detail!.courses.map((c) => c.id)).toEqual([ids.course])

    // 缓存里有未结束的开班（含已过开班日的），不含已结束的、不可访问课程的
    expect(detail!.cohorts.map((c) => c.id)).toEqual([ids.cohortPast, ids.cohortUpcoming])
    expect(detail!.cohorts[1]).toMatchObject({
      course: { id: ids.course, slug: `${PREFIX}-a`, disciplineId: ids.disciplinePublished },
      campus: { slug: `${PREFIX}-campus-pub` },
    })
    expect(upcomingCohorts(detail!.cohorts, new Date()).map((c) => c.id)).toEqual([
      ids.cohortUpcoming,
    ])

    expect(detail!.teachers.map((t) => t.id)).toEqual([ids.teacher])
    expect(detail!.teachers[0]?.disciplines.map((d) => d.id)).toEqual([ids.disciplinePublished])

    expect(detail!.photos).toHaveLength(2)
    expect(detail!.photos.map((p) => p.caption)).toEqual(['前台接待区', null])
    expect(detail!.location).toEqual({ lat: 39.992806, lng: 116.310316 })
    expect(detail!.baiduMapUrl).toContain('location=39.992806,116.310316')
    expect(detail!.transit).toBe('地铁示例站 B 口')
  })

  it('课程详情的开班与讲师详情的所在校区带上校区 slug（链接到校区详情），草稿校区不出现', async () => {
    const course = await queryCourseDetail(payload, `${PREFIX}-a`)
    expect(course?.campuses.map((c) => c.slug)).toEqual([`${PREFIX}-campus-pub`])
    expect(course?.cohorts.every((c) => c.campus?.slug === `${PREFIX}-campus-pub`)).toBe(true)

    const teacher = await queryTeacherDetail(payload, `${PREFIX}-teacher-pub`)
    expect(teacher?.campus).toEqual({
      name: '资讯测试校区 pub',
      slug: `${PREFIX}-campus-pub`,
      city: '测试市',
    })
    expect((await queryTeacherDetail(payload, `${PREFIX}-teacher-other`))?.campus).toBeNull()
  })

  it('校区页面设置总有标题（全局从未保存时用默认值）', async () => {
    const settings = await queryCampusPagesSettings(payload)
    expect(settings.list.title).toBeTruthy()
    expect(settings.detail.ctaTitle).toBeTruthy()
  })
})

describe('就业服务数据', () => {
  it('学员故事：只含已发布且已授权的，精选在前；所属课程只在可访问时给出；正文链接经过守卫', async () => {
    const data = await queryCareersPageData(payload)
    const stories = data.stories?.items ?? []
    const ours = stories.filter((s) => s.displayName.startsWith(PREFIX))
    expect(ours.map((s) => s.id)).toEqual([ids.storyFeatured, ids.storyPlain])

    const featured = ours[0]!
    expect(featured.course).toEqual({ title: '资讯测试课程 a', slug: `${PREFIX}-a` })
    expect(linkHrefs(featured.story)).toEqual({
      可访问的课程: `/courses/${PREFIX}-a`,
      已下线方向的课程: null,
    })
    expect(ours[1]?.course).toBeNull()
    // 输出里没有任何薪资字段
    expect(JSON.stringify(ours)).not.toMatch(/salary|薪资/)
  })

  it('站点设置关闭学员故事模块时，学员故事区块为 null', async () => {
    await setShowStories(false)
    try {
      expect((await queryCareersPageData(payload)).stories).toBeNull()
    } finally {
      await setShowStories(true)
    }
  })

  it('招聘活动：从北京时间今天 0 点起按时间升序，已发布的校区可链接，草稿校区为 null', async () => {
    const now = new Date()
    const data = await queryCareersPageData(payload, now)
    expect(data.events).not.toBeNull()
    const ours = data.events!.items.filter((e) => e.title.startsWith(PREFIX))
    expect(ours.map((e) => e.id)).toEqual([ids.eventToday, ids.eventFuture, ids.eventDraftCampus])
    expect(ours[1]?.campus).toEqual({
      name: '资讯测试校区 pub',
      slug: `${PREFIX}-campus-pub`,
      city: '测试市',
      address: '测试地址（示例）',
    })
    expect(ours[2]?.campus).toBeNull()

    // 渲染时再按当前时间过滤：一周后今天与明天之前的活动都不再显示
    const later = upcomingCareerEvents(ours, new Date(Date.now() + 8 * DAY))
    expect(later.map((e) => e.id)).toEqual([ids.eventDraftCampus])
  })
})

describe('阅读量接口 POST /api/articles/:id/view', () => {
  const call = async (
    handler: ReturnType<typeof createArticleViewHandler>,
    id: string,
    ip?: string,
  ) => {
    const req = await createLocalReq(
      {
        req: {
          headers: new Headers(ip ? { 'x-forwarded-for': ip } : {}),
          routeParams: { id },
        } as Partial<PayloadRequest>,
      },
      payload,
    )
    const response = await handler(req)
    return { status: response.status, body: (await response.json()) as Record<string, unknown> }
  }

  const readArticle = async (id: number) => {
    // 读主表（不带 draft：带 draft 时返回最新版本快照，其中的阅读量是保存时的旧值）
    const doc = await payload.findByID({
      collection: 'articles',
      id,
      depth: 0,
      select: { views: true, updatedAt: true, searchText: true },
    })
    const versions = await payload.findVersions({
      collection: 'articles',
      where: { parent: { equals: id } },
      limit: 1,
      depth: 0,
    })
    return {
      views: doc.views ?? 0,
      updatedAt: doc.updatedAt,
      searchText: doc.searchText,
      versions: versions.totalDocs,
    }
  }

  it('已发布文章：计数 +1，不改 updatedAt、不写版本（绕过钩子）；同一 IP 30 分钟内只计一次', async () => {
    const handler = createArticleViewHandler({ deduper: new ViewDeduper(), trustProxy: true })
    const before = await readArticle(ids.articleNew)

    expect(await call(handler, String(ids.articleNew), '203.0.113.10')).toEqual({
      status: 200,
      body: { counted: true },
    })
    expect(await call(handler, String(ids.articleNew), '203.0.113.10')).toEqual({
      status: 200,
      body: { counted: false },
    })
    expect(await call(handler, String(ids.articleNew), '203.0.113.11')).toEqual({
      status: 200,
      body: { counted: true },
    })

    const after = await readArticle(ids.articleNew)
    expect(after.views).toBe(before.views + 2)
    expect(after.updatedAt).toBe(before.updatedAt)
    expect(after.versions).toBe(before.versions)
    expect(after.searchText).toBe(before.searchText)

    // 之后在后台保存文章（版本快照里是旧计数）也不会把计数写回去
    await payload.update({
      collection: 'articles',
      id: ids.articleNew,
      data: { excerpt: '集成测试摘要（已修改）', views: 0 },
    })
    expect((await readArticle(ids.articleNew)).views).toBe(before.views + 2)
  })

  it('草稿文章与不存在的文章返回 404，不计数也不占用去重名额；非法 ID 返回 400', async () => {
    const handler = createArticleViewHandler({ deduper: new ViewDeduper(), trustProxy: true })
    const before = await readArticle(ids.articleDraft)
    expect((await call(handler, String(ids.articleDraft), '203.0.113.20')).status).toBe(404)
    expect((await call(handler, String(ids.articleDraft), '203.0.113.20')).status).toBe(404)
    expect((await readArticle(ids.articleDraft)).views).toBe(before.views)

    expect(await call(handler, '2147483647', '203.0.113.20')).toEqual({
      status: 404,
      body: { error: 'not found' },
    })
    for (const id of ['abc', '0', '012', '-1', '1.5', '2147483648', '']) {
      expect((await call(handler, id, '203.0.113.20')).status).toBe(400)
    }
  })

  it('无法识别 IP（未信任代理）时不按 IP 去重，改为按文章限流', async () => {
    const handler = createArticleViewHandler({
      deduper: new ViewDeduper(),
      unknownIpLimiter: new BurstLimiter(2, 60_000),
      trustProxy: false,
    })
    const before = await readArticle(ids.articleOld)
    const results = []
    for (let i = 0; i < 3; i++) {
      results.push((await call(handler, String(ids.articleOld), '203.0.113.30')).body.counted)
    }
    expect(results).toEqual([true, true, false])
    expect((await readArticle(ids.articleOld)).views).toBe(before.views + 2)
  })

  it('无法识别 IP 时，不存在或草稿文章的请求返回 404，不占用限流名额，也不在限流器里留下键', async () => {
    const unknownIpLimiter = new BurstLimiter(2, 60_000)
    const handler = createArticleViewHandler({
      deduper: new ViewDeduper(),
      unknownIpLimiter,
      trustProxy: false,
    })
    for (let i = 0; i < 5; i++) {
      expect((await call(handler, String(2_000_000_000 + i), '203.0.113.31')).status).toBe(404)
      expect((await call(handler, String(ids.articleDraft), '203.0.113.31')).status).toBe(404)
    }
    expect(unknownIpLimiter.size).toBe(0)

    // 草稿发布前的 404 不占名额：同一分钟里已发布文章仍可计满 2 次
    const before = await readArticle(ids.articleNew)
    const results = []
    for (let i = 0; i < 3; i++) {
      results.push((await call(handler, String(ids.articleNew), '203.0.113.31')).body.counted)
    }
    expect(results).toEqual([true, true, false])
    expect((await readArticle(ids.articleNew)).views).toBe(before.views + 2)
    expect(unknownIpLimiter.size).toBe(1)
  })
})
