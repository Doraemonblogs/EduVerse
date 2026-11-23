import type { Page } from '@playwright/test'
import { getPayload, type Where } from 'payload'

import config from '../../src/payload.config.js'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 就业服务页 /careers：首屏（背景图、预约就业咨询）、服务流程、学员故事（化名说明、展开阅读）、合作企业、
 * 近期招聘活动（北京时间今天及以后、校区链接）、结构化数据、广告法用语、结尾表单提交线索。
 * 内容来自种子数据（scripts/seed/site.ts、scripts/seed/data/{banners,stories,partners,career-events}.ts）；
 * 期望值从数据库读取（与页面同一个开发库），过滤条件与数据层一致，不在测试里写死种子内容。
 * 提交线索的用例用 leadNamespace('careers', …) 取本文件专属的手机号与模拟 IP，结束后清理。
 */

// 开发服务器首次访问某个路由时要现编译，留足时间
test.describe.configure({ timeout: 120_000 })

const PATH = '/careers'

/** 广告法：页面上不得出现的结果性 / 薪资类表述 */
const BANNED = /就业率|包就业|保证|薪资|高薪|月薪|年薪|入职率|承诺/

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 已填充且已发布的关联文档 */
function publishedDoc<T extends { _status?: string | null }>(value: number | T | null | undefined) {
  return value && typeof value === 'object' && value._status === 'published' ? value : null
}

/** 北京时间今天 0 点（UTC 时间戳）：招聘活动从这一刻起显示 */
function beijingDayStart(now: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  )
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) - 8 * 3600_000
}

type SectionKey = 'process' | 'stories' | 'partners' | 'events'

type CareersFacts = {
  intro: { eyebrow: string; title: string; description: string }
  /** 各区块标题（h2，区块的无障碍名称） */
  titles: Record<SectionKey, string>
  steps: string[]
  cta: { title: string; description: string }
  /** 已发布且已授权的学员故事（精选在前 → 排序 → ID，最多 12 个） */
  stories: { displayName: string; hasBody: boolean }[]
  partners: string[]
  /** 尚未过去的招聘活动（时间升序） */
  upcoming: {
    id: number
    title: string
    date: string
    campus: { name: string; slug: string } | null
  }[]
  /** 已经过去的招聘活动（不应出现在页面上） */
  past: string[]
}

/** 从数据库读取就业服务页的各区块内容（与数据层 src/lib/data/careers.ts 的过滤条件一致） */
async function readCareers(): Promise<CareersFacts> {
  const payload = await getPayload({ config })
  const [page, settings, stories, partners, events] = await Promise.all([
    payload.findGlobal({ slug: 'careers-page', depth: 0 }),
    payload.findGlobal({ slug: 'site-settings', depth: 0, select: { showStories: true } }),
    payload.find({
      collection: 'stories',
      where: { and: [published, { consentConfirmed: { equals: true } }] },
      sort: ['-featured', 'order', 'id'],
      limit: 12,
      depth: 0,
      select: { displayName: true, story: true },
    }),
    payload.find({
      collection: 'partners',
      sort: ['order', 'id'],
      limit: 48,
      depth: 0,
      select: { name: true },
    }),
    payload.find({
      collection: 'career-events',
      sort: ['date', 'id'],
      pagination: false,
      depth: 1,
      select: { title: true, date: true, campus: true },
      populate: { campuses: { name: true, slug: true, _status: true } },
    }),
  ])
  expect(settings.showStories, '种子数据应开启学员故事模块').not.toBe(false)
  const keys = ['process', 'stories', 'partners', 'events'] as const satisfies SectionKey[]
  for (const key of keys) {
    expect(page[key]?.enabled, `种子数据应开启「${key}」区块`).not.toBe(false)
    expect(page[key]?.title?.trim(), `种子数据应填写「${key}」区块标题`).toBeTruthy()
  }

  const from = beijingDayStart(new Date())
  const upcoming = events.docs.filter((event) => Date.parse(event.date) >= from)
  return {
    intro: {
      eyebrow: page.intro?.eyebrow?.trim() ?? '',
      title: page.intro?.title?.trim() ?? '',
      description: page.intro?.description?.trim() ?? '',
    },
    titles: Object.fromEntries(keys.map((key) => [key, page[key]!.title!.trim()])) as Record<
      SectionKey,
      string
    >,
    steps: (page.process?.steps ?? []).map((step) => step.title.trim()).filter(Boolean),
    cta: { title: page.cta?.title?.trim() ?? '', description: page.cta?.description?.trim() ?? '' },
    stories: stories.docs.map((story) => ({
      displayName: story.displayName,
      hasBody: Boolean(story.story?.root.children.length),
    })),
    partners: partners.docs.map((partner) => partner.name),
    upcoming: upcoming.map((event) => {
      const campus = publishedDoc(event.campus)
      return {
        id: event.id,
        title: event.title,
        date: event.date,
        campus: campus ? { name: campus.name, slug: campus.slug } : null,
      }
    }),
    past: events.docs.filter((event) => Date.parse(event.date) < from).map((event) => event.title),
  }
}

/** 媒体文档的 hero 尺寸地址（没有该尺寸时用原图）；只用于和页面上的图片地址比对文件名 */
function heroFile(media: unknown): string | null {
  if (!media || typeof media !== 'object') return null
  const doc = media as { url?: string | null; sizes?: { hero?: { url?: string | null } } }
  const url = doc.sizes?.hero?.url || doc.url
  return url ? url.split('/').pop()! : null
}

/**
 * 首屏背景图：投放位置为“就业服务页顶部”、已启用、当前在投放时间窗内的第一张轮播图（按排序 → ID，
 * 与数据层 + liveCareersHeroBanner 一致）；返回桌面图与移动端图（未上传时为桌面图）的文件名，没有时为 null
 */
async function readHeroBanner(): Promise<{ desktop: string; mobile: string } | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'banners',
    where: { and: [{ placement: { equals: 'careers_hero' } }, { active: { equals: true } }] },
    sort: ['order', 'id'],
    depth: 1,
    pagination: false,
    select: { image: true, mobileImage: true, startAt: true, endAt: true },
  })
  const now = Date.now()
  const live = docs.find(
    (doc) =>
      heroFile(doc.image) &&
      (!doc.startAt || Date.parse(doc.startAt) <= now) &&
      (!doc.endAt || Date.parse(doc.endAt) > now),
  )
  if (!live) return null
  const desktop = heroFile(live.image)!
  return { desktop, mobile: heroFile(live.mobileImage) ?? desktop }
}

type JsonLdNode = { '@type': string; [key: string]: unknown }

async function readJsonLd(page: Page): Promise<JsonLdNode[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
  return scripts.map((text) => JSON.parse(text) as JsonLdNode)
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '页面不应出现横向滚动').toBe(0)
}

/** 结尾表单水合后提交按钮才可用；以此确认页面已接管 */
async function waitForHydration(page: Page) {
  await expect(page.locator('#careers-cta').getByRole('button', { name: '立即预约' })).toBeEnabled()
}

const region = (page: Page, name: string) => page.getByRole('region', { name, exact: true })

test.describe('就业服务页', () => {
  test('首屏：面包屑、眉标、标题（h1）与描述来自后台，规范地址可收录；桌面端提示最近一场活动', async ({
    page,
    isMobile,
  }) => {
    const { intro, upcoming } = await readCareers()
    const response = await page.goto(PATH)
    expect(response?.status()).toBe(200)

    const hero = region(page, intro.title)
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(intro.title)
    await expect(hero.getByText(intro.eyebrow, { exact: true })).toBeVisible()
    await expect(hero.getByText(intro.description, { exact: true })).toBeVisible()
    await expect(hero.getByRole('button', { name: '预约就业咨询' })).toBeVisible()

    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByRole('link', { name: '首页' })).toBeVisible()
    await expect(breadcrumbs.getByText(intro.title, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // 最近一场活动：桌面端在首屏右侧，链接到页内的活动列表；移动端不显示（活动列表紧随其后）
    const next = upcoming[0]
    expect(next, '种子数据应有尚未举办的招聘活动').toBeTruthy()
    const teaser = hero.getByText('最近一场活动')
    if (isMobile) {
      await expect(teaser).toBeHidden()
    } else {
      await expect(teaser).toBeVisible()
      await expect(hero.getByText(next!.title, { exact: true })).toBeVisible()
      await hero.getByRole('link', { name: /查看全部活动/ }).click()
      await expect(page).toHaveURL(/#careers-events$/)
    }

    // 元数据：canonical 为 /careers，可收录；标题与描述来自后台 SEO
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/careers$/)
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expect(page).toHaveTitle(/就业服务/)
    await expectNoHorizontalOverflow(page)
  })

  test('首屏背景图：投放中的“就业服务页顶部”轮播图铺满首屏（石墨遮罩下、纯装饰），立即加载、高优先级、不插入 preload', async ({
    page,
    isMobile,
  }) => {
    const [{ intro }, banner] = await Promise.all([readCareers(), readHeroBanner()])
    await page.goto(PATH)
    const hero = region(page, intro.title)
    const img = hero.locator('picture img')

    if (!banner) {
      // 没有投放中的背景图：纯深色首屏
      await expect(img).toHaveCount(0)
      return
    }

    await expect(img).toHaveCount(1)
    await expect(img).toHaveAttribute('alt', '')
    await expect(img).toHaveAttribute('loading', 'eager')
    await expect(img).toHaveAttribute('fetchpriority', 'high')
    // 背景层对读屏隐藏，首屏里没有可读的图片
    await expect(hero.getByRole('img')).toHaveCount(0)
    // 美术指导：≥ 640px 下载桌面图，以下下载移动端图（只下载匹配的一张）
    await expect
      .poll(() =>
        img.evaluate((element: HTMLImageElement) => decodeURIComponent(element.currentSrc)),
      )
      .toContain(isMobile ? banner.mobile : banner.desktop)
    // 图片铺满整个首屏区块
    const [heroBox, imgBox] = await Promise.all([hero.boundingBox(), img.boundingBox()])
    expect(Math.round(imgBox!.width)).toBe(Math.round(heroBox!.width))
    expect(Math.round(imgBox!.height)).toBe(Math.round(heroBox!.height))
    // 不用 ReactDOM.preload（否则预取本页时提示会插入其它页面），靠 <picture> 被预加载扫描器发现
    const preloads = await page
      .locator('link[rel="preload"][as="image"]')
      .evaluateAll((links) =>
        links.map((link) => `${link.getAttribute('href')} ${link.getAttribute('imagesrcset')}`),
      )
    expect(
      preloads.filter((link) => link.includes(banner.desktop) || link.includes(banner.mobile)),
    ).toEqual([])
    await expectNoHorizontalOverflow(page)
  })

  test('首屏遮罩：两栏时文案栏不超过首屏宽度的 55%（遮罩在此范围内保持文字对比度）', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '两栏版式只在 ≥ 1024px')
    const [{ intro, upcoming }, banner] = await Promise.all([readCareers(), readHeroBanner()])
    test.skip(!banner || upcoming.length === 0, '没有背景图或没有近期活动时首屏是单栏、整体压暗')
    for (const width of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(PATH)
      const hero = region(page, intro.title)
      const ratio = await hero.evaluate((section) => {
        const column = section.querySelector('h1')!.parentElement!
        const box = section.getBoundingClientRect()
        return (column.getBoundingClientRect().right - box.left) / box.width
      })
      expect(ratio, `${width}px 文案栏右缘占首屏宽度的比例`).toBeLessThanOrEqual(0.55)
    }
  })

  test('“预约就业咨询”打开留资弹窗：标题为后台行动号召，来源 careers_hero、意向 consult', async ({
    page,
  }) => {
    const { intro, cta } = await readCareers()
    await page.goto(PATH)
    await waitForHydration(page)

    await region(page, intro.title).getByRole('button', { name: '预约就业咨询' }).click()
    const dialog = page.getByRole('dialog', { name: cta.title })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(cta.description, { exact: true })).toBeVisible()
    await expect(dialog.locator('input[name="position"]')).toHaveValue('careers_hero')
    await expect(dialog.locator('input[name="intent"]')).toHaveValue('consult')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('服务流程：按后台顺序列出各步骤（有序列表，步骤名称为 h3）', async ({ page }) => {
    const { steps, titles } = await readCareers()
    expect(steps.length).toBeGreaterThan(0)
    await page.goto(PATH)

    const section = region(page, titles.process)
    const items = section.locator('ol > li')
    await expect(items).toHaveCount(steps.length)
    await expect(section.getByRole('heading', { level: 3 })).toHaveText(steps)
    await expect(items.first()).toContainText('01')
    await expectNoHorizontalOverflow(page)
  })

  test('学员故事：只展示已发布且已授权的故事（精选在前），注明化名、没有薪资；可展开阅读完整故事再收起', async ({
    page,
  }) => {
    const { stories, titles } = await readCareers()
    expect(stories.length).toBeGreaterThan(0)
    await page.goto(PATH)

    const section = region(page, titles.stories)
    await expect(section.getByRole('heading', { level: 3 })).toHaveText(
      stories.map((story) => story.displayName),
    )
    await expect(section.getByText('学员姓名为化名，经历均已取得本人授权后展示。')).toBeVisible()
    expect(await section.textContent()).not.toMatch(/薪资|月薪|年薪|万元/)

    // 展开第一个有正文的故事：摘要行变为“收起”，正文可见；再点收起
    const index = stories.findIndex((story) => story.hasBody)
    expect(index, '种子数据应有带正文的故事').toBeGreaterThanOrEqual(0)
    const card = section.locator('article').nth(index)
    const details = card.locator('details')
    const summary = details.locator('summary')
    // 无障碍名称：可见文字“阅读完整故事 / 收起”+ 读屏补充的化名（隐藏的另一种状态不计入；
    // 读屏文字是绝对定位的块级元素，名称计算会在两者之间补一个空格）
    const name = stories[index]!.displayName
    await expect(summary).toHaveAccessibleName(new RegExp(`^阅读完整故事\\s?：${name}$`))
    const body = details.locator('.prose-zh p').first()
    await expect(body).toBeHidden()

    await summary.click()
    await expect(details).toHaveJSProperty('open', true)
    await expect(body).toBeVisible()
    await expect(summary).toHaveAccessibleName(new RegExp(`^收起\\s?：${name}$`))
    await expect(details.locator('h1, h2, h3')).toHaveCount(0)

    await summary.click()
    await expect(details).toHaveJSProperty('open', false)
    await expect(body).toBeHidden()
    await expectNoHorizontalOverflow(page)
  })

  test('合作企业：Logo 墙按后台排序列出全部合作企业（alt 为企业名称），不链接外站', async ({
    page,
  }) => {
    const { partners, titles } = await readCareers()
    expect(partners.length).toBeGreaterThan(0)
    await page.goto(PATH)

    const section = region(page, titles.partners)
    const logos = section.getByRole('list', { name: '合作企业名单' }).getByRole('img')
    await expect(logos).toHaveCount(partners.length)
    const alts = await logos.evaluateAll((images) =>
      images.map((image) => image.getAttribute('alt') ?? ''),
    )
    alts.forEach((alt, i) => expect(alt).toContain(partners[i]!))
    await expect(section.getByRole('link')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })

  test('近期招聘活动：只显示北京时间今天及以后的活动（按时间先后），已结束的不显示；举办校区链接到校区详情', async ({
    page,
  }) => {
    const { upcoming, past, titles } = await readCareers()
    expect(upcoming.length, '种子数据应有尚未举办的活动').toBeGreaterThan(0)
    expect(past.length, '种子数据应有已经结束的活动').toBeGreaterThan(0)
    await page.goto(PATH)

    const section = region(page, titles.events)
    const cards = section.locator('article')
    await expect(cards).toHaveCount(upcoming.length)
    await expect(section.getByRole('heading', { level: 3 })).toHaveText(
      upcoming.map((event) => event.title),
    )
    for (const title of past) {
      await expect(section.getByRole('heading', { name: title, exact: true })).toHaveCount(0)
    }

    // 时间：<time dateTime> 为活动时间，不早于北京时间今天 0 点，按先后排列
    const times = await cards
      .locator('time')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('datetime') ?? ''))
    expect(times).toEqual(upcoming.map((event) => event.date))
    const from = beijingDayStart(new Date())
    for (const time of times) expect(Date.parse(time)).toBeGreaterThanOrEqual(from)
    await expect(cards.first().locator('time')).toHaveText(
      /^\d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}$/,
    )

    // 举办校区：已发布的校区链接到校区详情（可访问）；没有校区的活动（如线上直播）不显示该项
    const withCampus = upcoming.filter((event) => event.campus)
    expect(withCampus.length, '种子数据应有在校区举办的活动').toBeGreaterThan(0)
    for (const event of upcoming) {
      const card = section.locator(`#career-event-${event.id}`)
      if (event.campus) {
        await expect(card.getByRole('link', { name: event.campus.name })).toHaveAttribute(
          'href',
          new RegExp(`/campuses/${event.campus.slug}$`),
        )
      } else {
        await expect(card.getByText('举办校区')).toHaveCount(0)
        await expect(card.getByRole('link')).toHaveCount(0)
      }
    }
    const first = withCampus[0]!
    const res = await page.request.get(`/campuses/${first.campus!.slug}`)
    expect(res.status(), `/campuses/${first.campus!.slug}`).toBe(200)
    await expectNoHorizontalOverflow(page)
  })

  test('广告法：页面（含折叠的故事正文与结构化数据）与标题、描述都不出现就业率、包就业、保证、薪资等表述', async ({
    page,
  }) => {
    await page.goto(PATH)
    const main = await page.getByRole('main').evaluate((node) => node.textContent ?? '')
    expect(main.length).toBeGreaterThan(0)
    expect(main).not.toMatch(BANNED)
    expect(await page.title()).not.toMatch(BANNED)
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description ?? '').not.toMatch(BANNED)
  })

  test('结构化数据：BreadcrumbList（2 级）与在校区举办的近期活动 Event（地点、开始时间、主办方）', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const { intro, upcoming } = await readCareers()
    await page.goto(PATH)
    const nodes = await readJsonLd(page)

    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb?.itemListElement).toHaveLength(2)
    expect(breadcrumb?.itemListElement).toEqual(
      expect.arrayContaining([expect.objectContaining({ position: 2, name: intro.title })]),
    )

    const events = nodes.filter((node) => node['@type'] === 'Event')
    const expected = upcoming.filter((event) => event.campus)
    expect(events.map((event) => event.name)).toEqual(expected.map((event) => event.title))
    for (const [i, event] of events.entries()) {
      expect(event).toMatchObject({
        startDate: expected[i]!.date,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          address: { '@type': 'PostalAddress', addressCountry: 'CN' },
        },
        organizer: { '@type': 'Organization' },
      })
      expect(new URL(String(event.url)).hash).toBe(`#career-event-${expected[i]!.id}`)
      if (event.image) {
        expect(String((event.image as string[])[0])).toMatch(/^https?:\/\/.+\/api\/media\/file\//)
      }
    }
  })

  test('结尾表单：来源 careers_cta、意向 consult，页脚行动号召横幅隐藏；提交后线索记录来源与页面', async ({
    page,
  }, testInfo) => {
    const ns = leadNamespace('careers', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const { cta } = await readCareers()
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto(PATH)
    try {
      await waitForHydration(page)
      // 页面以表单收尾：页脚的行动号召横幅隐藏
      await expect(page.locator('[data-footer-cta]')).toHaveCount(1)
      await expect(page.locator('[data-footer-cta]')).toBeHidden()

      const form = region(page, cta.title)
      await expect(form).toHaveClass(/surface-dark/)
      await expect(form.locator('input[name="position"]')).toHaveValue('careers_cta')
      await expect(form.locator('input[name="intent"]')).toHaveValue('consult')

      await form.getByLabel('姓名').fill('就业页测试')
      await form.getByLabel('手机号').fill(phone)
      await form.getByLabel('所在城市').selectOption('上海')
      await form.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await form.getByRole('button', { name: '立即预约' }).click()
      await expect(form.getByRole('heading', { name: '提交成功' })).toBeVisible()

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '就业页测试',
        intent: 'consult',
        city: '上海',
        source: { position: 'careers_cta' },
        client: { ip },
      })
      expect(lead?.context?.course ?? null).toBeNull()
      expect(lead?.source?.pageUrl).toContain(PATH)
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('预取就业服务页不会把首屏背景图的 preload 插入当前页面（生产构建下导航链接会预取）', async ({
    page,
  }) => {
    const banner = await readHeroBanner()
    test.skip(!banner, '没有投放中的背景图')
    await page.goto('/')
    // 预取在空闲时发生：等网络静止后再检查当前页面的 <head>
    await page.waitForLoadState('networkidle')
    const preloads = await page
      .locator('link[rel="preload"]')
      .evaluateAll((links) =>
        links.map((link) => `${link.getAttribute('href')} ${link.getAttribute('imagesrcset')}`),
      )
    expect(
      preloads.filter((link) => link.includes(banner!.desktop) || link.includes(banner!.mobile)),
    ).toEqual([])
  })

  test('从主导航进入就业服务页', async ({ page, isMobile }) => {
    const { intro } = await readCareers()
    await page.goto('/')
    if (isMobile) {
      await page.getByRole('button', { name: '打开菜单' }).click()
      await page
        .getByRole('dialog', { name: '网站导航' })
        .getByRole('link', { name: '就业服务', exact: true })
        .click()
    } else {
      await page
        .getByRole('navigation', { name: '主导航' })
        .getByRole('link', { name: '就业服务', exact: true })
        .click()
    }
    await expect(page).toHaveURL(/\/careers$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(intro.title)
  })
})
