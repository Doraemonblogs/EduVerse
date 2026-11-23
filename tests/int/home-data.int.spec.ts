import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { HOME_PAGE_DEFAULTS } from '@/globals/home-page-defaults'
import type { HomePageData } from '@/lib/home/types'
import config from '@/payload.config'

import { generatePlaceholder } from '../../scripts/seed/placeholders'

/**
 * 首页数据层（集成）：真实 Payload + 测试库，直接调用 queryHomePageData（不经过 Next 缓存）。
 * 重点验证：草稿与未授权的作品 / 学员故事不出现；站点设置关闭学员故事时整块为 null；
 * 轮播图只取首页主视觉且已启用的，渲染时按时间窗过滤；后台“指定”为空（或全部不可用）时的自动规则。
 *
 * 测试库里可能已有种子数据：测试数据统一用 home-int 前缀，排序字段取很小的负数排在最前，
 * 断言只针对测试数据（“排在第一位”“不出现”），不依赖库里其它数据的数量。
 * 会改写全局「首页」与站点设置的 showStories，结束后恢复原值；开始前与结束后都清理测试数据。
 */
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => fn,
  revalidateTag: vi.fn(),
}))

const { getHomePageData, queryHomePageData, withLiveBanners } = await import('@/lib/data/home')

const PREFIX = 'home-int'
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const fromNow = (ms: number) => new Date(Date.now() + ms).toISOString()
/** 排在库里其它数据前面 */
const FIRST = -900

let payload: Payload
let originalHome: Record<string, unknown> = {}
let originalShowStories = true

const ids = {
  media: 0,
  disciplinePub: 0,
  /** 已发布，但不在导航中显示：不进自动规则，可以手动指定 */
  disciplineHidden: 0,
  disciplineDraft: 0,
  /** 排序最靠前，但是短期班：自动规则跳过 */
  courseShort: 0,
  courseLong: 0,
  courseLong2: 0,
  courseDraft: 0,
  courseInDraftDiscipline: 0,
  /** 4 件已授权的精选作品（从新到旧），数量等于首页作品数量上限 */
  workFeatured: [] as number[],
  workPlain: 0,
  workNoConsent: 0,
  workDraft: 0,
  partner: 0,
  storyFeatured: 0,
  storyPlain: 0,
  storyNoConsent: 0,
  storyDraft: 0,
  teacherFeatured: 0,
  teacherPlain: 0,
  teacherDraft: 0,
  campusPub: 0,
  campusDraft: 0,
  category: 0,
  /** 3 篇已发布的文章（从新到旧），数量等于首页资讯数量上限 */
  articles: [] as number[],
  articleDraft: 0,
  bannerLive: 0,
  bannerWindow: 0,
  bannerFuture: 0,
  bannerExpired: 0,
  bannerInactive: 0,
  bannerCareers: 0,
}

const base = { direction: 'ltr' as const, format: '' as const, indent: 0, version: 1 }
const richText = (value: string) => ({
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
          {
            type: 'text',
            text: value,
            format: 0,
            detail: 0,
            mode: 'normal',
            style: '',
            version: 1,
          },
        ],
      },
    ],
  },
})

/** 每个测试的首页配置：全部区块显式写入（测试库里的全局可能从未保存过新增的区块） */
const baseHome = () => ({
  hero: { autoplay: true, interval: 8 },
  quickEntries: {
    enabled: true,
    eyebrow: 'Start Here',
    title: '快速了解',
    items: [
      { title: '学员作品', description: '看看学员作品', action: 'link', href: '/works' },
      { title: '预约试听', action: 'lead' },
    ],
  },
  hotDisciplines: {
    enabled: true,
    eyebrow: 'Majors',
    title: '热门专业',
    disciplines: [] as number[],
  },
  courses: {
    enabled: true,
    eyebrow: '',
    title: '精选课程',
    description: '',
    courses: [] as number[],
  },
  featuredWorks: {
    enabled: true,
    title: '学员作品',
    mode: 'auto',
    limit: 4,
    works: [] as number[],
  },
  stories: { enabled: true, title: '学员故事', stories: [] as number[] },
  teachers: { enabled: true, title: '师资团队', teachers: [] as number[] },
  campuses: { enabled: true, title: '校区分布' },
  partners: { enabled: true, title: '合作企业' },
  articles: { enabled: true, title: '最新资讯', limit: 3 },
  leadForm: {
    enabled: true,
    eyebrow: 'Free Trial',
    title: '预约一节试听课',
    description: '说明',
    submitLabel: '',
  },
})

type HomeConfig = ReturnType<typeof baseHome>

async function setHome(overrides: { [K in keyof HomeConfig]?: Partial<HomeConfig[K]> } = {}) {
  const data: Record<string, unknown> = baseHome()
  for (const [key, value] of Object.entries(overrides)) {
    data[key] = { ...(data[key] as object), ...value }
  }
  await payload.updateGlobal({ slug: 'home-page', data: data as never })
}

async function setShowStories(showStories: boolean) {
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  // 测试库从未写入站点设置时补上必填项
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      brandName: settings.brandName || '测试品牌',
      hotline: settings.hotline || '400-000-0000',
      salaryDisclaimer: settings.salaryDisclaimer || '集成测试免责声明：不作为培训效果承诺。',
      showStories,
    },
  })
}

/**
 * 恢复测试前的首页配置。测试库里的全局可能从未保存过某些区块（如新增的精选课程），
 * 它们的必填标题为空，原样写回会校验失败：补上默认标题。
 */
function restorableHome(original: Record<string, unknown>) {
  const data: Record<string, unknown> = { ...original }
  for (const [key, defaults] of Object.entries(HOME_PAGE_DEFAULTS.sections)) {
    const section = (data[key] ?? {}) as { title?: string | null }
    data[key] = { ...section, title: section.title || defaults.title }
  }
  return data
}

const load = () => queryHomePageData(payload)
const itemIds = (section: { items: { id: number }[] } | null) =>
  section?.items.map((item) => item.id) ?? []

async function cleanup() {
  const like = { like: PREFIX }
  await payload.delete({ collection: 'banners', where: { title: like } })
  await payload.delete({ collection: 'articles', where: { slug: like } })
  await payload.delete({ collection: 'article-categories', where: { slug: like } })
  await payload.delete({ collection: 'stories', where: { displayName: like } })
  await payload.delete({ collection: 'partners', where: { name: like } })
  await payload.delete({ collection: 'works', where: { title: like } })
  await payload.delete({ collection: 'courses', where: { slug: like } })
  await payload.delete({ collection: 'teachers', where: { slug: like } })
  await payload.delete({ collection: 'campuses', where: { slug: like } })
  await payload.delete({ collection: 'disciplines', where: { slug: like } })
  await payload.delete({ collection: 'media', where: { alt: like } })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const home = await payload.findGlobal({ slug: 'home-page', depth: 0 })
  const {
    id: _id,
    updatedAt: _u,
    createdAt: _c,
    globalType: _g,
    ...rest
  } = home as typeof home & {
    globalType?: string
  }
  originalHome = rest
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  originalShowStories = settings.showStories !== false
  await cleanup()

  const image = await generatePlaceholder(
    { kind: 'art', seed: PREFIX, hue: 120, aspect: '16:9', label: '测试', size: 64 },
    `seed-${PREFIX}`,
  )
  ids.media = (
    await payload.create({
      collection: 'media',
      data: { alt: `${PREFIX} 图片` },
      file: {
        data: image.data,
        mimetype: image.mimetype,
        name: image.filename,
        size: image.data.length,
      },
    })
  ).id
  const cover = ids.media

  // 专业方向
  const discipline = (suffix: string, order: number, showInNav = true) => ({
    name: `首页测试方向 ${suffix}`,
    slug: `${PREFIX}-${suffix}`,
    tagline: `一句话卖点 ${suffix}`,
    cover,
    showInNav,
    order,
  })
  ids.disciplinePub = (
    await payload.create({
      collection: 'disciplines',
      data: { ...discipline('pub', FIRST), _status: 'published' },
    })
  ).id
  ids.disciplineHidden = (
    await payload.create({
      collection: 'disciplines',
      data: { ...discipline('hidden', FIRST - 1, false), _status: 'published' },
    })
  ).id
  ids.disciplineDraft = (
    await payload.create({
      collection: 'disciplines',
      draft: true,
      data: { ...discipline('draft', FIRST - 2), _status: 'draft' },
    })
  ).id

  // 课程（纯线上，不需要校区）
  const course = (
    suffix: string,
    classType: 'long_term' | 'short_term',
    order: number,
    disciplineId = ids.disciplinePub,
  ) => ({
    title: `首页测试课程 ${suffix}`,
    slug: `${PREFIX}-course-${suffix}`,
    discipline: disciplineId,
    classType,
    deliveryModes: ['online' as const],
    duration: { value: 3, unit: 'month' as const },
    summary: '集成测试课程',
    cover,
    order,
  })
  const publishedCourse = async (data: ReturnType<typeof course>) =>
    (await payload.create({ collection: 'courses', data: { ...data, _status: 'published' } })).id
  ids.courseShort = await publishedCourse(course('short', 'short_term', FIRST - 1))
  ids.courseLong = await publishedCourse(course('long', 'long_term', FIRST))
  ids.courseLong2 = await publishedCourse(course('long-2', 'long_term', FIRST + 1))
  ids.courseDraft = (
    await payload.create({
      collection: 'courses',
      draft: true,
      data: { ...course('draft', 'long_term', FIRST - 2), _status: 'draft' },
    })
  ).id
  ids.courseInDraftDiscipline = await publishedCourse(
    course('in-draft-discipline', 'long_term', FIRST, ids.disciplineDraft),
  )

  // 作品：发布时间都比种子作品新（精选作品按发布时间降序时排在最前）
  const work = (suffix: string, featured: boolean, ageMs: number) => ({
    title: `${PREFIX} 作品 ${suffix}`,
    author: { displayName: `测试同学 ${suffix}`, cohortLabel: '2026 届' },
    discipline: ids.disciplinePub,
    course: ids.courseLong,
    cover,
    video: { kind: 'none' as const },
    consentConfirmed: true,
    featured,
    publishedAt: fromNow(-ageMs),
  })
  const publishedWork = async (data: ReturnType<typeof work>) =>
    (await payload.create({ collection: 'works', data: { ...data, _status: 'published' } })).id
  for (let i = 0; i < 4; i++) {
    ids.workFeatured.push(await publishedWork(work(`featured-${i}`, true, (3 + i) * HOUR)))
  }
  ids.workPlain = await publishedWork(work('plain', false, 2 * HOUR))
  // 发布校验要求勾选授权：模拟历史数据 / 绕过校验写入的“已发布但未授权”作品
  ids.workNoConsent = await publishedWork(work('no-consent', true, HOUR))
  await payload.db.updateOne({
    collection: 'works',
    id: ids.workNoConsent,
    data: { consentConfirmed: false },
  })
  ids.workDraft = (
    await payload.create({
      collection: 'works',
      draft: true,
      data: { ...work('draft', true, HOUR / 2), _status: 'draft' },
    })
  ).id

  // 合作企业（没有草稿）
  ids.partner = (
    await payload.create({
      collection: 'partners',
      data: {
        name: `${PREFIX} 合作企业`,
        industry: '游戏研发',
        logo: cover,
        website: 'https://partner.example.com',
        order: FIRST,
      },
    })
  ).id

  // 学员故事
  const story = (suffix: string, featured: boolean, order: number) => ({
    displayName: `${PREFIX} ${suffix}`,
    background: '财务专员转行',
    avatar: cover,
    course: ids.courseLong,
    currentRole: 'UI 设计师',
    companyName: '',
    partner: ids.partner,
    quote: '先把逻辑理清楚，再动手画。',
    story: richText('故事正文'),
    consentConfirmed: true,
    featured,
    order,
  })
  ids.storyFeatured = (
    await payload.create({
      collection: 'stories',
      data: { ...story('featured', true, FIRST), _status: 'published' },
    })
  ).id
  ids.storyPlain = (
    await payload.create({
      collection: 'stories',
      data: {
        ...story('plain', false, FIRST + 1),
        course: ids.courseDraft,
        companyName: '某工作室',
        _status: 'published',
      },
    })
  ).id
  ids.storyNoConsent = (
    await payload.create({
      collection: 'stories',
      data: { ...story('no-consent', true, FIRST - 2), _status: 'published' },
    })
  ).id
  await payload.db.updateOne({
    collection: 'stories',
    id: ids.storyNoConsent,
    data: { consentConfirmed: false },
  })
  ids.storyDraft = (
    await payload.create({
      collection: 'stories',
      draft: true,
      data: { ...story('draft', true, FIRST - 1), _status: 'draft' },
    })
  ).id

  // 讲师
  const teacher = (suffix: string, featured: boolean, order: number) => ({
    name: `首页测试讲师 ${suffix}`,
    slug: `${PREFIX}-teacher-${suffix}`,
    title: '测试讲师',
    avatar: cover,
    disciplines: [ids.disciplinePub],
    featured,
    order,
  })
  ids.teacherFeatured = (
    await payload.create({
      collection: 'teachers',
      data: { ...teacher('featured', true, FIRST), _status: 'published' },
    })
  ).id
  ids.teacherPlain = (
    await payload.create({
      collection: 'teachers',
      data: { ...teacher('plain', false, FIRST + 1), _status: 'published' },
    })
  ).id
  ids.teacherDraft = (
    await payload.create({
      collection: 'teachers',
      draft: true,
      data: { ...teacher('draft', true, FIRST - 1), _status: 'draft' },
    })
  ).id

  // 校区
  const campus = (suffix: string, order: number) => ({
    name: `首页测试校区 ${suffix}`,
    slug: `${PREFIX}-campus-${suffix}`,
    city: '测试市',
    citySlug: `${PREFIX}-city`,
    address: '测试地址（示例）',
    phone: '010-6000 0000',
    location: { lng: 116.31, lat: 39.98 },
    cover,
    order,
  })
  ids.campusPub = (
    await payload.create({
      collection: 'campuses',
      data: { ...campus('pub', FIRST), _status: 'published' },
    })
  ).id
  ids.campusDraft = (
    await payload.create({
      collection: 'campuses',
      draft: true,
      data: { ...campus('draft', FIRST - 1), _status: 'draft' },
    })
  ).id

  // 资讯：草稿比已发布的更新
  ids.category = (
    await payload.create({
      collection: 'article-categories',
      data: { name: '首页测试分类', slug: `${PREFIX}-category`, order: FIRST },
    })
  ).id
  const article = (suffix: string, ageMs: number) => ({
    title: `首页测试文章 ${suffix}`,
    slug: `${PREFIX}-article-${suffix}`,
    category: ids.category,
    cover,
    excerpt: `摘要 ${suffix}`,
    content: richText('正文'),
    publishedAt: fromNow(-ageMs),
  })
  for (let i = 0; i < 3; i++) {
    ids.articles.push(
      (
        await payload.create({
          collection: 'articles',
          data: { ...article(`new-${i}`, (i + 1) * HOUR), _status: 'published' },
        })
      ).id,
    )
  }
  ids.articleDraft = (
    await payload.create({
      collection: 'articles',
      draft: true,
      data: { ...article('draft', HOUR / 2), _status: 'draft' },
    })
  ).id

  // 轮播图
  const banner = (suffix: string, order: number, extra: Record<string, unknown> = {}) => ({
    title: `${PREFIX} 轮播 ${suffix}`,
    subtitle: '副标题',
    image: cover,
    ctaLabel: '查看课程',
    href: '/courses',
    placement: 'home_hero' as const,
    active: true,
    order,
    ...extra,
  })
  const createBanner = async (data: ReturnType<typeof banner>) =>
    (await payload.create({ collection: 'banners', data: data as never })).id
  ids.bannerLive = await createBanner(banner('live', FIRST, { href: null }))
  ids.bannerWindow = await createBanner(
    banner('window', FIRST + 1, { startAt: fromNow(-HOUR), endAt: fromNow(HOUR) }),
  )
  ids.bannerFuture = await createBanner(banner('future', FIRST + 2, { startAt: fromNow(DAY) }))
  ids.bannerExpired = await createBanner(banner('expired', FIRST + 3, { endAt: fromNow(-HOUR) }))
  ids.bannerInactive = await createBanner(banner('inactive', FIRST - 1, { active: false }))
  ids.bannerCareers = await createBanner(
    banner('careers', FIRST - 2, { placement: 'careers_hero' }),
  )

  await setShowStories(true)
}, 120_000)

afterAll(async () => {
  if (payload) {
    await payload.updateGlobal({ slug: 'home-page', data: restorableHome(originalHome) as never })
    await setShowStories(originalShowStories)
    await cleanup()
  }
  await payload?.db.destroy?.()
})

describe('首页数据：区块开关与文字（集成）', () => {
  it('区块文字按后台填写；清空的眉标与描述不显示，未填写的按钮文字用默认值', async () => {
    await setHome({ partners: { enabled: false } })
    const data = await load()
    expect(data.courses?.heading).toEqual({ eyebrow: null, title: '精选课程', description: null })
    expect(data.hotDisciplines?.heading.eyebrow).toBe('Majors')
    expect(data.leadForm).toEqual({
      heading: { eyebrow: 'Free Trial', title: '预约一节试听课', description: '说明' },
      submitLabel: '立即预约',
    })
    expect(data.hero.autoplay).toBe(true)
    expect(data.hero.intervalMs).toBe(8000)
    // 后台关闭的区块为 null
    expect(data.partners).toBeNull()
  })

  it('快速了解：跳转链接与打开预约弹窗两种入口', async () => {
    await setHome()
    const { quickEntries } = await load()
    expect(quickEntries?.items.map((item) => [item.title, item.action])).toEqual([
      ['学员作品', { kind: 'link', link: { href: '/works', external: false } }],
      ['预约试听', { kind: 'lead' }],
    ])
  })

  it('品牌名来自站点设置；首页 SEO 字段原样给出', async () => {
    const data = await load()
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    expect(data.brandName).toBe(settings.brandName)
    expect(data).toHaveProperty('seo')
  })
})

describe('首页数据：主视觉轮播（集成）', () => {
  it('只取投放位置为首页主视觉、已启用的轮播图（缓存里含全部时间窗），按排序', async () => {
    await setHome()
    const { hero } = await load()
    const ours = hero.banners.filter((b) => b.title.startsWith(PREFIX)).map((b) => b.id)
    expect(ours).toEqual([ids.bannerLive, ids.bannerWindow, ids.bannerFuture, ids.bannerExpired])
    const live = hero.banners.find((b) => b.id === ids.bannerLive)!
    // 没有链接地址：按钮打开留资弹窗；没有移动端图时用桌面图
    expect(live.link).toBeNull()
    expect(live.ctaLabel).toBe('查看课程')
    expect(live.image.src).toMatch(/^\/api\/media\/file\//)
    expect(live.mobileImage.src).toMatch(/^\/api\/media\/file\//)
  })

  it('渲染时按当前时间过滤时间窗：未开始与已结束的不展示，到点后自动切换', async () => {
    const data = await load()
    const ours = (result: HomePageData) =>
      result.hero.banners.filter((b) => b.title.startsWith(PREFIX)).map((b) => b.id)
    expect(ours(withLiveBanners(data, new Date()))).toEqual([ids.bannerLive, ids.bannerWindow])
    expect(ours(withLiveBanners(data, new Date(Date.now() + 2 * DAY)))).toEqual([
      ids.bannerLive,
      ids.bannerFuture,
    ])
    // 不修改传入的数据
    expect(data.hero.banners.length).toBeGreaterThanOrEqual(4)
  })

  it('getHomePageData(now) 返回过滤后的轮播图', async () => {
    const data = await getHomePageData(new Date())
    const ours = data.hero.banners.filter((b) => b.title.startsWith(PREFIX)).map((b) => b.id)
    expect(ours).toEqual([ids.bannerLive, ids.bannerWindow])
  })
})

describe('首页数据：热门专业与精选课程（集成）', () => {
  it('热门专业留空时取已发布且在导航中显示的专业（按排序），带可访问课程数', async () => {
    await setHome()
    const { hotDisciplines } = await load()
    const items = hotDisciplines!.items
    expect(items[0]).toMatchObject({
      id: ids.disciplinePub,
      slug: `${PREFIX}-pub`,
      tagline: '一句话卖点 pub',
      // 长期班 2 门 + 短期班 1 门；草稿课程不计入
      courseCount: 3,
    })
    expect(items[0]!.cover?.src).toMatch(/^\/api\/media\/file\//)
    expect(items.map((d) => d.id)).not.toContain(ids.disciplineHidden)
    expect(items.map((d) => d.id)).not.toContain(ids.disciplineDraft)
    expect(items.length).toBeLessThanOrEqual(8)
  })

  it('指定专业按所选顺序（不受导航开关限制），草稿被剔除；全部不可用时走自动规则', async () => {
    await setHome({
      hotDisciplines: {
        disciplines: [ids.disciplineDraft, ids.disciplineHidden, ids.disciplinePub],
      },
    })
    expect(itemIds((await load()).hotDisciplines)).toEqual([
      ids.disciplineHidden,
      ids.disciplinePub,
    ])
    await setHome({ hotDisciplines: { disciplines: [ids.disciplineDraft] } })
    expect(itemIds((await load()).hotDisciplines)[0]).toBe(ids.disciplinePub)
  })

  it('精选课程留空时每个专业方向取排序最靠前的长期就业班', async () => {
    await setHome()
    const courses = (await load()).courses!.items
    expect(courses[0]?.id).toBe(ids.courseLong)
    const courseIds = courses.map((c) => c.id)
    expect(courseIds).not.toContain(ids.courseShort)
    expect(courseIds).not.toContain(ids.courseLong2)
    expect(courseIds).not.toContain(ids.courseDraft)
    expect(courseIds).not.toContain(ids.courseInDraftDiscipline)
    expect(courses.every((c) => c.classType === 'long_term')).toBe(true)
    const disciplines = courses.map((c) => c.discipline.id)
    expect(new Set(disciplines).size).toBe(disciplines.length)
  })

  it('指定课程按所选顺序，草稿课程与专业方向未发布的课程被剔除', async () => {
    await setHome({
      courses: {
        courses: [ids.courseDraft, ids.courseInDraftDiscipline, ids.courseShort, ids.courseLong2],
      },
    })
    expect(itemIds((await load()).courses)).toEqual([ids.courseShort, ids.courseLong2])
  })
})

describe('首页数据：学员作品（集成）', () => {
  it('auto：精选作品按发布时间降序取 limit 件，草稿与未授权的作品不出现', async () => {
    await setHome()
    // 未授权与草稿的精选作品发布时间更新，但不出现；非精选作品不占位
    expect(itemIds((await load()).works)).toEqual(ids.workFeatured)
  })

  it('auto：精选作品不足 limit 件时有多少展示多少，不用非精选作品补足', async () => {
    const limit = HOME_PAGE_DEFAULTS.featuredWorks.max
    // 独立查询库里全部前台可见的精选作品（含种子数据），确认确实不足 limit 件
    const { docs: visibleFeatured } = await payload.find({
      collection: 'works',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { consentConfirmed: { equals: true } },
          { featured: { equals: true } },
        ],
      },
      select: {},
      depth: 0,
      pagination: false,
    })
    expect(visibleFeatured.length, '测试库的精选作品应少于首页作品数量上限').toBeLessThan(limit)

    await setHome({ featuredWorks: { mode: 'auto', limit } })
    const works = itemIds((await load()).works)
    // 测试作品的发布时间最新，排在最前
    expect(works.slice(0, ids.workFeatured.length)).toEqual(ids.workFeatured)
    expect(works).toHaveLength(visibleFeatured.length)
    const featuredIds = new Set(visibleFeatured.map((doc) => doc.id))
    expect(works.every((id) => featuredIds.has(id))).toBe(true)
    // 比测试精选作品更新的非精选作品也不出现
    expect(works).not.toContain(ids.workPlain)
  })

  it('manual：按所选顺序，剔除草稿与未授权的作品；全部不可用时改为自动取精选', async () => {
    await setHome({
      featuredWorks: {
        mode: 'manual',
        works: [ids.workNoConsent, ids.workDraft, ids.workPlain, ids.workFeatured[2]!],
      },
    })
    expect(itemIds((await load()).works)).toEqual([ids.workPlain, ids.workFeatured[2]])

    await setHome({
      featuredWorks: { mode: 'manual', works: [ids.workNoConsent, ids.workDraft] },
    })
    expect(itemIds((await load()).works)).toEqual(ids.workFeatured)
  })
})

describe('首页数据：学员故事（集成）', () => {
  it('留空时取精选故事（按排序），草稿与未授权的故事不出现', async () => {
    await setHome()
    const stories = (await load()).stories!
    expect(stories.items[0]).toEqual({
      id: ids.storyFeatured,
      displayName: `${PREFIX} featured`,
      background: '财务专员转行',
      avatar: expect.objectContaining({ src: expect.stringMatching(/^\/api\/media\/file\//) }),
      currentRole: 'UI 设计师',
      // 就职公司为空：取合作企业名称（只作文字）
      companyName: `${PREFIX} 合作企业`,
      quote: '先把逻辑理清楚，再动手画。',
      course: { title: '首页测试课程 long', slug: `${PREFIX}-course-long` },
    })
    const storyIds = itemIds(stories)
    expect(storyIds).not.toContain(ids.storyNoConsent)
    expect(storyIds).not.toContain(ids.storyDraft)
    expect(storyIds).not.toContain(ids.storyPlain)
  })

  it('指定故事按所选顺序，剔除草稿与未授权的；所属课程不可访问时不给出课程', async () => {
    await setHome({
      stories: { stories: [ids.storyDraft, ids.storyNoConsent, ids.storyPlain, ids.storyFeatured] },
    })
    const stories = (await load()).stories!
    expect(itemIds(stories)).toEqual([ids.storyPlain, ids.storyFeatured])
    expect(stories.items[0]).toMatchObject({ companyName: '某工作室', course: null })
  })

  it('不输出故事正文、作品与任何薪资信息', async () => {
    await setHome()
    const json = JSON.stringify((await load()).stories)
    expect(json).not.toContain('故事正文')
    for (const word of ['薪资', '月薪', '年薪', 'salary']) expect(json).not.toContain(word)
  })

  it('站点设置关闭学员故事时整块为 null（即使后台指定了故事）', async () => {
    await setHome({ stories: { stories: [ids.storyFeatured] } })
    await setShowStories(false)
    try {
      expect((await load()).stories).toBeNull()
    } finally {
      await setShowStories(true)
    }
  })
})

describe('首页数据：师资、校区、合作企业、资讯（集成）', () => {
  it('讲师留空时精选在前、按排序补足（4 或 8 位），草稿讲师不出现', async () => {
    await setHome()
    const teachers = (await load()).teachers!
    expect(teachers.items[0]).toMatchObject({
      id: ids.teacherFeatured,
      disciplines: [expect.objectContaining({ id: ids.disciplinePub })],
    })
    // 精选讲师之后，按排序补足的第一位就是排序最靠前的非精选讲师
    expect(itemIds(teachers)).toContain(ids.teacherPlain)
    expect(itemIds(teachers)).not.toContain(ids.teacherDraft)
    expect(teachers.items.length).toBeLessThanOrEqual(8)
  })

  it('指定讲师按所选顺序，草稿被剔除', async () => {
    await setHome({
      teachers: { teachers: [ids.teacherDraft, ids.teacherPlain, ids.teacherFeatured] },
    })
    expect(itemIds((await load()).teachers)).toEqual([ids.teacherPlain, ids.teacherFeatured])
  })

  it('校区：只含已发布的，带 tel: 链接与高德地图链接', async () => {
    await setHome()
    const campuses = (await load()).campuses!
    expect(campuses.items[0]).toMatchObject({
      id: ids.campusPub,
      slug: `${PREFIX}-campus-pub`,
      phoneHref: 'tel:01060000000',
      mapUrl: expect.stringMatching(/^https:\/\/uri\.amap\.com\/marker\?position=116\.31,39\.98&/),
    })
    expect(itemIds(campuses)).not.toContain(ids.campusDraft)
  })

  it('合作企业：Logo 的替代文字为企业名，不输出官网地址', async () => {
    const partners = (await load()).partners!
    expect(partners.items[0]).toMatchObject({
      id: ids.partner,
      name: `${PREFIX} 合作企业`,
      industry: '游戏研发',
      logo: expect.objectContaining({ alt: `${PREFIX} 合作企业` }),
    })
    expect(JSON.stringify(partners)).not.toContain('partner.example.com')
  })

  it('资讯：已发布文章按发布时间取 limit 篇（更新的草稿不出现），附带出现过的分类', async () => {
    const articles = (await load()).articles!
    expect(itemIds(articles)).toEqual(ids.articles)
    expect(articles.items[0]).toMatchObject({
      slug: `${PREFIX}-article-new-0`,
      category: { id: ids.category, name: '首页测试分类', slug: `${PREFIX}-category` },
    })
    expect(itemIds(articles)).not.toContain(ids.articleDraft)
    expect(articles.categories[0]).toEqual({
      id: ids.category,
      name: '首页测试分类',
      slug: `${PREFIX}-category`,
    })
  })
})
