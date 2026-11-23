import type { Locator, Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { HOME_PAGE_DEFAULTS } from '../../src/globals/home-page-defaults'
import { clampSetting, liveBanners, toSectionHeading } from '../../src/lib/home/rules'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 首页 /：区块顺序与标题、主视觉轮播（自动播放、暂停 / 播放、键盘、减少动态效果）、各区块链接可访问、
 * 学员故事不出现薪资、合作企业与校区不外链第三方资源、结构化数据与收录、页内表单提交线索（position=home_form），
 * 移动端横滑容器（可滚动、键盘焦点始终在视口内）与页面无横向滚动。
 * 内容来自种子数据；期望值从数据库读取（与页面同一个开发库），规则与数据层共用 src/lib/home/rules.ts。
 * 自动 fixture 断言控制台无报错、页面不请求第三方域名（高德地图只是链接，不加载脚本）。
 */

// 开发服务器首次访问某个路由时要现编译；轮播用例要等若干个自动轮播间隔
test.describe.configure({ timeout: 120_000 })

const S = HOME_PAGE_DEFAULTS.sections
const SALARY_WORDS = /月薪|年薪|薪资|薪水|工资|底薪|万\/月|k\/月/i

type HomeFacts = {
  brandName: string
  hotline: string | null
  /** 各区块标题（按页面顺序；关闭的区块与学员故事总开关关闭时不在其中） */
  titles: { id: string; title: string }[]
  /** 当前时间窗内的首页轮播图标题（按排序） */
  bannerTitles: string[]
  autoplay: boolean
  intervalMs: number
  submitLabel: string
  seoTitle: string
}

/** 从数据库读取首页配置（与数据层的默认值、开关规则一致） */
async function readHome(): Promise<HomeFacts> {
  const payload = await getPayload({ config })
  const [home, site, banners] = await Promise.all([
    payload.findGlobal({ slug: 'home-page', depth: 0 }),
    payload.findGlobal({ slug: 'site-settings', depth: 0 }),
    payload.find({
      collection: 'banners',
      where: { and: [{ placement: { equals: 'home_hero' } }, { active: { equals: true } }] },
      sort: ['order', 'id'],
      depth: 0,
      pagination: false,
      select: { title: true, startAt: true, endAt: true },
    }),
  ])
  const showStories = site.showStories !== false
  // 种子数据的每个区块都有内容：开启的区块都会渲染（没有内容的区块不渲染由集成测试覆盖）
  const sections = [
    ['home-quick-entries-title', toSectionHeading(home.quickEntries, S.quickEntries)],
    ['home-hot-disciplines-title', toSectionHeading(home.hotDisciplines, S.hotDisciplines)],
    ['home-courses-title', toSectionHeading(home.courses, S.courses)],
    ['home-works-title', toSectionHeading(home.featuredWorks, S.featuredWorks)],
    ['home-stories-title', showStories ? toSectionHeading(home.stories, S.stories) : null],
    ['home-partners-title', toSectionHeading(home.partners, S.partners)],
    ['home-teachers-title', toSectionHeading(home.teachers, S.teachers)],
    ['home-campuses-title', toSectionHeading(home.campuses, S.campuses)],
    ['home-articles-title', toSectionHeading(home.articles, S.articles)],
    ['home-lead-form-title', toSectionHeading(home.leadForm, S.leadForm)],
  ] as const
  const live = liveBanners(
    banners.docs.map((banner) => ({
      title: banner.title,
      startAt: banner.startAt ?? null,
      endAt: banner.endAt ?? null,
    })),
    new Date(),
  )
  const brandName = site.brandName?.trim() || 'EduVerse 数艺学院'
  return {
    brandName,
    hotline: site.hotline?.trim() || null,
    titles: sections.flatMap(([id, heading]) => (heading ? [{ id, title: heading.title }] : [])),
    bannerTitles: live.map((banner) => banner.title),
    autoplay: home.hero?.autoplay ?? HOME_PAGE_DEFAULTS.hero.autoplay,
    intervalMs:
      clampSetting(home.hero?.interval, {
        fallback: HOME_PAGE_DEFAULTS.hero.interval,
        min: HOME_PAGE_DEFAULTS.hero.minInterval,
        max: 60,
      }) * 1000,
    submitLabel: home.leadForm?.submitLabel?.trim() || HOME_PAGE_DEFAULTS.leadForm.submitLabel,
    seoTitle: home.seo?.title || site.defaultSeo?.title || brandName,
  }
}

type JsonLdNode = Record<string, unknown>

async function readJsonLd(page: Page): Promise<JsonLdNode[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
  return scripts.flatMap((text) => {
    const data = JSON.parse(text) as JsonLdNode | JsonLdNode[]
    return Array.isArray(data) ? data : [data]
  })
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '页面不应出现横向滚动').toBe(0)
}

/** 页内表单水合后提交按钮才可用；以此确认客户端组件（轮播、横滑按钮、资讯 Tab）都已接管 */
async function waitForHydration(page: Page, facts: HomeFacts) {
  const form = page.getByRole('region', { name: facts.titles.at(-1)?.title ?? '' })
  await expect(form.getByRole('button', { name: facts.submitLabel })).toBeEnabled()
}

/** 当前轮播到第几张（圆点按钮的 aria-current，从 0 开始） */
async function currentSlide(dots: Locator): Promise<number> {
  const states = await dots.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-current') === 'true'),
  )
  return states.indexOf(true)
}

/** 站内链接（去重，不含锚点与外链） */
async function internalHrefs(scope: Locator): Promise<string[]> {
  const hrefs = await scope
    .locator('a[href^="/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
  return [...new Set(hrefs)]
}

/**
 * 从横滑列表开始逐个按 Tab：每个落在列表里的焦点元素都要（滚动结束后）完整处在视口内，
 * 不能停在只露出一半的下一张卡片上。返回经过的焦点个数。
 */
async function tabThroughScroller(page: Page, list: Locator): Promise<number> {
  await list.focus()
  let visited = 0
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab')
    if (!(await list.evaluate((el) => el.contains(document.activeElement)))) break
    visited++
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const rect = document.activeElement?.getBoundingClientRect()
            return Boolean(rect && rect.left >= -1 && rect.right <= window.innerWidth + 1)
          }),
        { message: `第 ${visited} 个焦点元素应完整处在视口内`, timeout: 3_000 },
      )
      .toBe(true)
  }
  return visited
}

/** 各区块版心（<main> 下每个 <section> 的第一个子元素）的内容右缘（减去右内边距） */
async function sectionContentEdges(page: Page) {
  return page.locator('main > section').evaluateAll((sections) =>
    sections.map((section) => {
      const container = section.firstElementChild as HTMLElement
      const rect = container.getBoundingClientRect()
      const right = rect.right - Number.parseFloat(getComputedStyle(container).paddingRight)
      return {
        name: section.getAttribute('aria-labelledby') ?? section.getAttribute('aria-label') ?? '',
        right: Math.round(right),
      }
    }),
  )
}

/** 把按钮滚到视口垂直居中（悬浮栏所在的高度），返回按钮中心点上最上层的元素是否就是它自己 */
async function isHittable(button: Locator): Promise<boolean> {
  return button.evaluate((element) => {
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
    const rect = element.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return hit !== null && element.contains(hit)
  })
}

/**
 * <main> 里当前看得见的链接与按钮（不含被横滑列表 / 轮播等滚动容器裁掉的项、读屏专用的 1px 元素）中，
 * 右缘越过 limit 的（如快速了解第 4 张、校区卡片的“在地图中打开”），返回其名称与右缘。
 */
async function controlsPastEdge(page: Page, limit: number) {
  return page.locator('main').evaluate((main, edge) => {
    const clippedByScroller = (element: Element) => {
      const rect = element.getBoundingClientRect()
      for (
        let parent = element.parentElement;
        parent && parent !== main;
        parent = parent.parentElement
      ) {
        if (getComputedStyle(parent).overflowX === 'visible') continue
        const box = parent.getBoundingClientRect()
        if (rect.right > box.right + 1 || rect.left < box.left - 1) return true
      }
      return false
    }
    return [...main.querySelectorAll('a, button')].flatMap((element) => {
      const rect = element.getBoundingClientRect()
      if (rect.width <= 1 || rect.height <= 1 || clippedByScroller(element)) return []
      if (rect.right <= edge) return []
      const name = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? ''
      return [`${name.slice(0, 30)} → ${Math.round(rect.right)}`]
    })
  }, limit)
}

/**
 * 学员故事卡片的“岗位 · 公司”：逐字测量每个字所在的行（Range 的矩形），
 * 返回“·”是否与岗位最后一个字同行、公司名是否整段在同一行。
 */
async function storyRoleLineBreaks(region: Locator) {
  return region.locator('article p').evaluateAll((paragraphs) =>
    paragraphs.flatMap((paragraph) => {
      const node = [...paragraph.childNodes].find(
        (child): child is Text => child instanceof Text && child.data.includes('·'),
      )
      if (!node) return []
      const text = node.data
      const dot = text.indexOf('·')
      const lineOf = (index: number) => {
        const range = document.createRange()
        range.setStart(node, index)
        range.setEnd(node, index + 1)
        const rect = range.getClientRects()[0]
        return rect ? Math.round(rect.top + rect.height / 2) : null
      }
      const roleEnd = text.slice(0, dot).trimEnd().length - 1
      const companyLines = new Set<number | null>()
      for (let index = dot + 1; index < text.length; index++) {
        if (text[index]!.trim()) companyLines.add(lineOf(index))
      }
      return [
        {
          text,
          dotWithRole: lineOf(dot) === lineOf(roleEnd),
          companyOnOneLine: companyLines.size === 1,
        },
      ]
    }),
  )
}

test.describe('首页', () => {
  test('各区块标题按后台顺序出现：主视觉第一张为 h1，区块标题为 h2', async ({ page }) => {
    const facts = await readHome()
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)

    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toHaveCount(1)
    await expect(h1).toHaveText(facts.bannerTitles[0] ?? facts.brandName)

    const headings = page.locator('main h2[id^="home-"]')
    await expect(headings).toHaveText(facts.titles.map((section) => section.title))
    expect(await headings.evaluateAll((elements) => elements.map((el) => el.id))).toEqual(
      facts.titles.map((section) => section.id),
    )
    // 每个区块都是以标题命名的区域（landmark）
    for (const { title } of facts.titles) {
      await expect(page.getByRole('region', { name: title, exact: true })).toHaveCount(1)
    }
  })

  test('收录与 TDK：不再 noindex，标题不套模板，canonical 为站点首页', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const facts = await readHome()
    await page.goto('/')
    await expect(page).toHaveTitle(facts.seoTitle)
    const robots = page.locator('meta[name="robots"]')
    if ((await robots.count()) > 0) await expect(robots).not.toHaveAttribute('content', /noindex/)
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toMatch(/^https?:\/\/[^/]+(\/[\w-]+)*$/)
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical!)
  })

  test('结构化数据：Organization（Logo、咨询热线）与 WebSite（站内搜索），地址均为绝对地址', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const facts = await readHome()
    await page.goto('/')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    const nodes = await readJsonLd(page)

    const organization = nodes.find((node) => node['@type'] === 'Organization')
    expect(organization).toMatchObject({ name: facts.brandName, url: canonical })
    if (organization?.logo !== undefined) expect(organization.logo).toMatch(/^https?:\/\//)
    if (facts.hotline) {
      expect(organization?.contactPoint).toEqual([
        expect.objectContaining({
          '@type': 'ContactPoint',
          telephone: facts.hotline,
          contactType: '课程咨询',
        }),
      ])
    }

    const website = nodes.find((node) => node['@type'] === 'WebSite')
    expect(website).toMatchObject({
      name: facts.brandName,
      url: canonical,
      publisher: { '@id': organization?.['@id'] },
      potentialAction: {
        '@type': 'SearchAction',
        target: { urlTemplate: `${canonical}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    })
  })

  test.describe('主视觉轮播', () => {
    test('自动播放；暂停按钮停住轮播，鼠标移开也不再切换', async ({ page, isMobile }) => {
      test.skip(isMobile, '轮播控件的行为与视口无关，桌面端验证')
      const facts = await readHome()
      test.skip(
        !facts.autoplay || facts.bannerTitles.length < 2,
        '种子数据应有 2 张以上并开启自动轮播',
      )
      await page.goto('/')
      await waitForHydration(page, facts)

      const hero = page.getByRole('region', { name: '主视觉' })
      await expect(hero).toHaveAttribute('aria-roledescription', '轮播')
      const dots = hero.getByRole('group', { name: '选择轮播图' }).getByRole('button')
      await expect(dots).toHaveCount(facts.bannerTitles.length)
      await expect(dots.first()).toHaveAttribute('aria-current', 'true')
      await expect(dots.first()).toHaveAccessibleName(`第 1 张：${facts.bannerTitles[0]}`)

      // 自动播放：一个间隔后切到第 2 张
      await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true', {
        timeout: facts.intervalMs + 5_000,
      })

      // 暂停：按钮变为“开始自动轮播”；指针移出轮播区域后超过一个间隔，仍停在当前这张
      await hero.getByRole('button', { name: '暂停自动轮播' }).click()
      const play = hero.getByRole('button', { name: '开始自动轮播' })
      await expect(play).toBeVisible()
      await page.mouse.move(0, 0)
      const paused = await currentSlide(dots)
      await page.waitForTimeout(facts.intervalMs + 1_500)
      expect(await currentSlide(dots)).toBe(paused)
      await expect(hero.locator('[data-slot="hero-countdown"]')).toHaveCount(0)
    })

    test('键盘：上一张 / 下一张 / 圆点切换并播报；焦点停在轮播内时不自动切换', async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, '键盘操作在桌面端验证')
      const facts = await readHome()
      const total = facts.bannerTitles.length
      test.skip(!facts.autoplay || total < 2, '种子数据应有 2 张以上并开启自动轮播')
      await page.goto('/')
      await waitForHydration(page, facts)

      const hero = page.getByRole('region', { name: '主视觉' })
      const dots = hero.getByRole('group', { name: '选择轮播图' }).getByRole('button')
      const live = hero.locator('[aria-live="polite"]')
      const next = hero.getByRole('button', { name: '下一张' })
      const previous = hero.getByRole('button', { name: '上一张' })

      // 从“上一张”开始用键盘操作（Shift+Tab 回到“上一张”，确保是键盘焦点；焦点进入轮播后自动轮播暂停）
      await next.focus()
      await page.keyboard.press('Shift+Tab')
      await expect(previous).toBeFocused()
      // 开发服务器水合较慢时，自动轮播可能已经切过一张：以此刻的这一张为起点
      const start = await currentSlide(dots)
      expect(start).toBeGreaterThanOrEqual(0)
      const at = (offset: number) => (((start + offset) % total) + total) % total
      const announce = (index: number) =>
        `第 ${index + 1} 张，共 ${total} 张：${facts.bannerTitles[index]}`

      // 上一张（从第 1 张往前是最后一张：首尾环绕）
      await page.keyboard.press('Enter')
      await expect(dots.nth(at(-1))).toHaveAttribute('aria-current', 'true')
      await expect(live).toHaveText(announce(at(-1)))
      await page.keyboard.press('Tab')
      await expect(next).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(dots.nth(at(0))).toHaveAttribute('aria-current', 'true')
      await page.keyboard.press('Enter')
      await expect(dots.nth(at(1))).toHaveAttribute('aria-current', 'true')
      await expect(live).toHaveText(announce(at(1)))

      // 圆点：Enter 直接跳到对应的一张（选一张不是当前的）
      const target = dots.nth(at(0))
      await target.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      await expect(target).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(target).toHaveAttribute('aria-current', 'true')
      await expect(live).toHaveText(announce(at(0)))

      // 键盘焦点停在轮播里（圆点上）：超过一个自动轮播间隔也不切换
      await page.mouse.move(0, 0)
      await page.waitForTimeout(facts.intervalMs + 1_500)
      await expect(target).toHaveAttribute('aria-current', 'true')
      await expect(target).toBeFocused()
    })

    test('系统开启“减少动态效果”时不自动播放，可手动开始', async ({ page, isMobile }) => {
      test.skip(isMobile, '与视口无关，桌面端验证一次')
      const facts = await readHome()
      test.skip(
        !facts.autoplay || facts.bannerTitles.length < 2,
        '种子数据应有 2 张以上并开启自动轮播',
      )
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/')
      await waitForHydration(page, facts)

      const hero = page.getByRole('region', { name: '主视觉' })
      const dots = hero.getByRole('group', { name: '选择轮播图' }).getByRole('button')
      await expect(hero.getByRole('button', { name: '开始自动轮播' })).toBeVisible()
      await page.waitForTimeout(facts.intervalMs + 1_500)
      await expect(dots.first()).toHaveAttribute('aria-current', 'true')
      await expect(hero.locator('[data-slot="hero-countdown"]')).toHaveCount(0)
    })
  })

  test('热门专业、精选课程、学员作品、师资团队、校区分布与最新资讯的链接和“查看全部”都可访问（200）', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '链接与视口无关，桌面端验证一次')
    const facts = await readHome()
    await page.goto('/')
    const ids = [
      'home-hot-disciplines-title',
      'home-courses-title',
      'home-works-title',
      'home-teachers-title',
      'home-campuses-title',
      'home-articles-title',
    ]
    const hrefs = new Set<string>()
    for (const { id, title } of facts.titles.filter((section) => ids.includes(section.id))) {
      const found = await internalHrefs(page.getByRole('region', { name: title, exact: true }))
      expect(found.length, `${title} 应有站内链接`).toBeGreaterThan(1)
      for (const href of found) hrefs.add(href)
      if (id === 'home-hot-disciplines-title') {
        expect(found.filter((href) => href.startsWith('/majors/')).length).toBeGreaterThan(0)
      }
    }
    for (const prefix of [
      '/majors/',
      '/courses/',
      '/works/',
      '/teachers/',
      '/campuses/',
      '/articles/',
    ]) {
      expect(
        [...hrefs].some((href) => href.startsWith(prefix)),
        prefix,
      ).toBe(true)
    }
    // “查看全部”（校区分布区块没有“查看全部”，校区卡片直接进入各校区详情）
    for (const href of ['/courses', '/works', '/teachers', '/articles']) {
      expect(hrefs.has(href), href).toBe(true)
    }
    for (const href of hrefs) {
      const res = await page.request.get(href)
      expect(res.status(), href).toBe(200)
    }
  })

  test('留资入口：快速了解与课程卡片打开的弹窗分别记录 home_quick / home_course', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const facts = await readHome()
    await page.goto('/')
    await waitForHydration(page, facts)

    const quick = page.getByRole('region', { name: facts.titles[0]?.title ?? '' })
    const leadTile = quick.getByRole('listitem').getByRole('button')
    if ((await leadTile.count()) > 0) {
      await leadTile.first().click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.locator('input[name="position"]')).toHaveValue('home_quick')
      await expect(dialog.locator('input[name="intent"]')).toHaveValue('consult')
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
    }

    const courses = page.getByRole('region', {
      name: facts.titles.find((section) => section.id === 'home-courses-title')?.title ?? '',
    })
    await courses
      .getByRole('button', { name: /^预约试听：/ })
      .first()
      .click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('input[name="position"]')).toHaveValue('home_course')
    await expect(dialog.locator('input[name="intent"]')).toHaveValue('trial')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('学员故事：注明化名，不出现任何薪资字样；卡片只链接到课程', async ({ page }) => {
    const facts = await readHome()
    const title = facts.titles.find((section) => section.id === 'home-stories-title')?.title
    test.skip(!title, '学员故事区块已关闭')
    await page.goto('/')
    const stories = page.getByRole('region', { name: title!, exact: true })
    await expect(stories.getByText('学员姓名为化名')).toBeVisible()
    expect(await stories.innerText()).not.toMatch(SALARY_WORDS)
    expect(await stories.getByRole('heading', { level: 3 }).count()).toBeGreaterThan(0)
    for (const href of await stories
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))) {
      expect(href).toMatch(/^\/courses\/[\w-]+$/)
    }
  })

  test('合作企业不链接外站；校区“在地图中打开”新窗口打开高德地图；资讯 Tab 可用键盘切换', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const facts = await readHome()
    const titleOf = (id: string) => facts.titles.find((section) => section.id === id)?.title ?? ''
    await page.goto('/')
    await waitForHydration(page, facts)

    const partners = page.getByRole('region', { name: titleOf('home-partners-title') })
    await expect(partners.getByRole('link')).toHaveCount(0)
    const logos = partners.getByRole('img')
    expect(await logos.count()).toBeGreaterThan(0)
    for (const alt of await logos.evaluateAll((images) =>
      images.map((image) => image.getAttribute('alt') ?? ''),
    )) {
      expect(alt.trim()).not.toBe('')
    }

    const campuses = page.getByRole('region', { name: titleOf('home-campuses-title') })
    const maps = campuses.getByRole('link', { name: /^在地图中打开/ })
    expect(await maps.count()).toBeGreaterThan(0)
    for (const map of await maps.all()) {
      await expect(map).toHaveAttribute('href', /^https:\/\/uri\.amap\.com\/marker\?position=/)
      await expect(map).toHaveAttribute('target', '_blank')
      await expect(map).toHaveAttribute('rel', 'noopener noreferrer')
    }
    await expect(campuses.locator('a[href^="tel:"]').first()).toBeVisible()

    const articles = page.getByRole('region', { name: titleOf('home-articles-title') })
    const tabs = articles.getByRole('tab')
    const count = await tabs.count()
    test.skip(count < 2, '资讯分类不足 2 个时没有 Tab')
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')
    await tabs.first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.nth(1)).toBeFocused()
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
    // 选中的分类下只列出该分类的文章
    const category = (await tabs.nth(1).innerText()).trim()
    const rows = articles.getByRole('tabpanel').getByRole('link')
    expect(await rows.count()).toBeGreaterThan(0)
    for (const row of await rows.all()) await expect(row).toContainText(category)
    await page.keyboard.press('End')
    await expect(tabs.nth(count - 1)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Home')
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')
  })

  test('预约试听区块：页内表单提交后线索记录 position=home_form，页脚行动号召横幅隐藏', async ({
    page,
  }, testInfo) => {
    const ns = leadNamespace('home', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const facts = await readHome()
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto('/')
    try {
      await waitForHydration(page, facts)
      await expect(page.locator('[data-footer-cta]')).toBeHidden()

      const form = page.getByRole('region', { name: facts.titles.at(-1)?.title ?? '' })
      await expect(form.locator('input[name="position"]')).toHaveValue('home_form')
      await form.getByLabel('姓名').fill('首页测试')
      await form.getByLabel('手机号').fill(phone)
      await form.getByLabel('所在城市').selectOption('北京')
      await form.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await form.getByRole('button', { name: facts.submitLabel }).click()
      await expect(form.getByRole('heading', { name: '提交成功' })).toBeVisible()

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '首页测试',
        intent: 'trial',
        city: '北京',
        source: { position: 'home_form' },
        client: { ip },
      })
      expect(lead?.source?.pageUrl).toMatch(/^https?:\/\/[^/]+\/?$/)
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('1024–1366px：各区块右缘对齐并给悬浮操作栏让位，贴着右缘的轮播 / 横滑按钮不被悬浮栏盖住', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '悬浮操作栏只在 ≥ 1024px 显示')
    const facts = await readHome()
    for (const width of [1024, 1280, 1366]) {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      await waitForHydration(page, facts)
      const bar = await page.getByRole('complementary', { name: '快捷咨询' }).boundingBox()
      expect(bar, `${width}px 应显示悬浮操作栏`).not.toBeNull()

      const edges = await sectionContentEdges(page)
      // 主视觉 + 各区块
      expect(edges.length).toBe(facts.titles.length + (facts.bannerTitles.length > 0 ? 1 : 0))
      const rights = new Set(edges.map((edge) => edge.right))
      expect(rights.size, `${width}px 各区块右缘：${JSON.stringify(edges)}`).toBe(1)
      expect(edges[0]!.right, `${width}px 内容右缘应在悬浮栏左侧`).toBeLessThan(bar!.x)
      // 所有看得见的链接与按钮（卡片、“在地图中打开”等，不只是轮播 / 横滑按钮）都在悬浮栏左侧
      expect(await controlsPastEdge(page, bar!.x), `${width}px 越过悬浮栏左缘的控件`).toEqual([])

      const buttons = page
        .locator('main')
        .getByRole('button', { name: /^(下一张|上一张)$|：(上一组|下一组)$/ })
      let checked = 0
      for (const button of await buttons.all()) {
        // 禁用的按钮（滚到头的“上一组”）pointer-events: none，命中测试会穿过它，只检查可用的按钮
        if (!(await button.isVisible()) || !(await button.isEnabled())) continue
        expect(
          await isHittable(button),
          `${width}px「${await button.getAttribute('aria-label')}」不应被悬浮栏盖住`,
        ).toBe(true)
        checked++
      }
      expect(checked, `${width}px 检查的按钮个数`).toBeGreaterThan(2)
    }
  })

  test('学员故事：“岗位 · 公司”只在“·”之后换行，公司名不被拆开（窄卡片宽度下）', async ({
    page,
    isMobile,
  }) => {
    const facts = await readHome()
    const title = facts.titles.find((section) => section.id === 'home-stories-title')?.title
    test.skip(!title, '学员故事区块已关闭')
    // 1024：继续横滑（每屏 3 张）；1280：一行 4 列，卡片最窄；移动端为当前视口
    for (const width of isMobile ? [null] : [1024, 1280, 1440]) {
      if (width) await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      const stories = page.getByRole('region', { name: title!, exact: true })
      await stories.scrollIntoViewIfNeeded()
      const lines = await storyRoleLineBreaks(stories)
      expect(lines.length, '应有带公司名的岗位行').toBeGreaterThan(0)
      for (const line of lines) {
        expect(line.dotWithRole, `${width ?? '移动端'}「${line.text}」的“·”不应出现在行首`).toBe(
          true,
        )
        expect(line.companyOnOneLine, `${width ?? '移动端'}「${line.text}」的公司名不应拆行`).toBe(
          true,
        )
      }
    }
  })

  test.describe('移动端', () => {
    test('触控目标：轮播与横滑按钮不小于 44px；360px 宽时轮播控件一行放得下，页面无横向滚动', async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, '移动端专属')
      const facts = await readHome()
      for (const width of [390, 360]) {
        await page.setViewportSize({ width, height: 800 })
        await page.goto('/')
        await waitForHydration(page, facts)

        const hero = page.getByRole('region', { name: '主视觉' })
        if (facts.bannerTitles.length > 1) {
          const controls = [
            // 后台关闭自动轮播时没有暂停 / 播放按钮
            ...(facts.autoplay ? [hero.getByRole('button', { name: /自动轮播$/ })] : []),
            ...(await hero.getByRole('group', { name: '选择轮播图' }).getByRole('button').all()),
            hero.getByRole('button', { name: '上一张' }),
            hero.getByRole('button', { name: '下一张' }),
          ]
          const boxes = []
          for (const control of controls) {
            if (!(await control.isVisible())) continue
            const box = (await control.boundingBox())!
            expect(box.width, `${width}px 轮播控件宽度`).toBeGreaterThanOrEqual(44)
            expect(box.height, `${width}px 轮播控件高度`).toBeGreaterThanOrEqual(44)
            boxes.push(box)
          }
          // 种子数据不超过 4 张：暂停、圆点、上一张 / 下一张同在一行，且不超出版心
          if (facts.bannerTitles.length <= 4) {
            expect(boxes).toHaveLength(controls.length)
            expect(
              new Set(boxes.map((box) => Math.round(box.y))).size,
              `${width}px 控件应在一行`,
            ).toBe(1)
            expect(Math.max(...boxes.map((box) => box.x + box.width))).toBeLessThanOrEqual(width)
          }
        }

        // 滚动整页（触发各横滑容器的测量）后检查上一组 / 下一组
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 600) {
            window.scrollTo(0, y)
            await new Promise((resolve) => setTimeout(resolve, 30))
          }
        })
        const pagers = page.locator('main').getByRole('button', { name: /：(上一组|下一组)$/ })
        expect(await pagers.count()).toBeGreaterThan(0)
        for (const pager of await pagers.all()) {
          const box = (await pager.boundingBox())!
          expect(box.width).toBeGreaterThanOrEqual(44)
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
        await expectNoHorizontalOverflow(page)
      }
    })

    test('页面无横向滚动；横滑容器可滚动，“下一组”按钮可用', async ({ page, isMobile }) => {
      test.skip(!isMobile, '移动端专属')
      const facts = await readHome()
      await page.goto('/')
      await waitForHydration(page, facts)
      // 滚动整页（触发懒加载与各横滑容器的测量）后再检查
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y)
          await new Promise((resolve) => setTimeout(resolve, 30))
        }
      })
      await expectNoHorizontalOverflow(page)

      const title = facts.titles.find((section) => section.id === 'home-courses-title')?.title ?? ''
      const courses = page.getByRole('region', { name: title, exact: true })
      const list = courses.getByRole('list', { name: title, exact: true })
      await list.scrollIntoViewIfNeeded()
      const size = await list.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }))
      expect(size.scroll).toBeGreaterThan(size.client)
      await courses.getByRole('button', { name: `${title}：下一组` }).click()
      await expect.poll(() => list.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
      await expectNoHorizontalOverflow(page)
    })

    test('键盘逐个 Tab 经过课程与讲师横滑列表时，焦点元素始终完整处在视口内', async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, '移动端专属（390px 下卡片只露出一部分）')
      const facts = await readHome()
      await page.goto('/')
      await waitForHydration(page, facts)
      for (const id of ['home-courses-title', 'home-teachers-title']) {
        const title = facts.titles.find((section) => section.id === id)?.title
        if (!title) continue
        const list = page
          .getByRole('region', { name: title, exact: true })
          .getByRole('list', { name: title, exact: true })
        await list.scrollIntoViewIfNeeded()
        const visited = await tabThroughScroller(page, list)
        expect(visited, `${title} 的焦点元素个数`).toBeGreaterThan(3)
      }
      await expectNoHorizontalOverflow(page)
    })
  })
})
