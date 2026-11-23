import type { Locator, Page } from '@playwright/test'

import { expect, test } from './fixtures'

/**
 * 学员作品列表 /works：瀑布流、URL 同步的筛选（专业方向 / 软件 / 只看精选）、分页（每页 24 件）、
 * 空状态、收录规则（筛选页 noindex；无筛选的第 N 页可收录）、超出页码 404。
 * 数据来自种子：60 件已发布且已授权的作品（16 件精选），8 个专业方向各 7–8 件。
 */

const TOTAL = 60
const FEATURED = 16
const PER_PAGE = 24

type JsonLdItem = { '@type': string; itemListElement?: { name?: string; item?: string }[] }

function filterNav(page: Page): Locator {
  return page.getByRole('navigation', { name: '作品筛选' })
}

/** 筛选栏中的一行（专业方向 / 软件 / 精选） */
function filterRow(page: Page, label: string): Locator {
  return filterNav(page).getByRole('list', { name: label })
}

/** 筛选项：可见文字是“名称 + 数量”，无障碍名称是“名称（N 件作品）” */
function filterOption(page: Page, row: string, label: string): Locator {
  return filterRow(page, row).getByRole('link', { name: new RegExp(`^${label}\\s*（`) })
}

/** 从筛选项的文字（含读屏补充“（N 件作品）”）读出数量 */
async function optionCount(option: Locator): Promise<number> {
  const name = await option.textContent()
  const match = /（(\d+) 件作品）/.exec(name ?? '')
  if (!match) throw new Error(`筛选项缺少数量：${name}`)
  return Number(match[1])
}

function resultStatus(page: Page): Locator {
  return filterNav(page).getByRole('status')
}

/** 作品卡片（整卡一个链接，指向 /works/{id}；筛选、分页链接是 /works?…，不会匹配） */
function workCards(page: Page): Locator {
  return page.locator('main a[href*="/works/"]')
}

/** 瀑布流列表 */
function masonry(page: Page): Locator {
  return page.locator('main ul').filter({ has: page.locator('a[href*="/works/"]') })
}

function pagination(page: Page): Locator {
  return page.getByRole('navigation', { name: '分页' })
}

function robotsMeta(page: Page): Locator {
  return page.locator('meta[name="robots"]')
}

/** canonical 恰好一个，且指向 path */
async function expectCanonical(page: Page, path: RegExp) {
  const links = page.locator('link[rel="canonical"]')
  await expect(links).toHaveCount(1)
  await expect(links).toHaveAttribute('href', path)
}

async function expectIndexable(page: Page) {
  const robots = robotsMeta(page)
  if ((await robots.count()) > 0) await expect(robots).not.toHaveAttribute('content', /noindex/)
}

async function expectNoindexFollow(page: Page) {
  await expect(robotsMeta(page)).toHaveAttribute('content', /noindex/)
  await expect(robotsMeta(page)).toHaveAttribute('content', /follow/)
  await expect(robotsMeta(page)).not.toHaveAttribute('content', /nofollow/)
}

async function cardHrefs(page: Page): Promise<string[]> {
  return workCards(page).evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
}

async function readJsonLd(page: Page): Promise<JsonLdItem[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
  return scripts.map((text) => JSON.parse(text) as JsonLdItem)
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '页面不应出现横向滚动').toBe(0)
}

test.describe('学员作品列表', () => {
  test('默认显示第 1 页 24 件作品，筛选栏默认“全部”，可收录', async ({ page }) => {
    const response = await page.goto('/works')
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('学员作品')
    await expect(page).toHaveTitle(/学员作品/)
    await expect(page).not.toHaveTitle(/第 \d+ 页/)
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByRole('link', { name: '首页' })).toBeVisible()
    await expect(breadcrumbs.getByText('学员作品', { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // 瀑布流：24 张卡片，作品名是 h2，整卡链接到详情
    await expect(workCards(page)).toHaveCount(PER_PAGE)
    await expect(masonry(page).getByRole('heading', { level: 2 })).toHaveCount(PER_PAGE)
    await expect(workCards(page).first()).toHaveAttribute('href', /\/works\/\d+$/)
    // 只有第一张封面高优先级加载，其余懒加载
    await expect(masonry(page).locator('img[loading="lazy"]')).toHaveCount(PER_PAGE - 1)

    // 筛选栏：三行，每行“全部”为当前项；结果数带页码；没有“清除筛选”
    for (const row of ['专业方向', '软件', '精选']) {
      await expect(filterOption(page, row, '全部')).toHaveAttribute('aria-current', 'true')
      await expect(filterRow(page, row).locator('[aria-current]')).toHaveCount(1)
    }
    await expect(resultStatus(page)).toHaveText(`共 ${TOTAL} 件作品 · 第 1 / 3 页`)
    await expect(filterNav(page).getByRole('link', { name: '清除筛选' })).toHaveCount(0)
    await expect(filterOption(page, '精选', '只看精选')).toHaveAccessibleName(
      new RegExp(`^只看精选\\s*（${FEATURED} 件作品）$`),
    )

    // 各专业方向的数量之和 = 全部作品数（每件作品都属于一个已发布的专业方向）
    const disciplineOptions = filterRow(page, '专业方向').getByRole('link')
    const names = await disciplineOptions.evaluateAll((links) =>
      links.map((a) => a.textContent ?? ''),
    )
    const counts = names.slice(1).map((name) => Number(/（(\d+) 件作品）/.exec(name)?.[1]))
    expect(counts).toHaveLength(8)
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(TOTAL)

    // 筛选链接一律 nofollow；分页链接可抓取
    const links = filterNav(page).getByRole('link')
    const linkCount = await links.count()
    expect(linkCount).toBeGreaterThan(20)
    for (let i = 0; i < linkCount; i += 1) {
      await expect(links.nth(i)).toHaveAttribute('rel', 'nofollow')
    }
    const next = pagination(page).getByRole('link', { name: '下一页' })
    await expect(next).toHaveAttribute('href', /\/works\?page=2$/)
    await expect(next).toHaveAttribute('rel', 'next')
    await expect(pagination(page).getByRole('link', { name: '上一页' })).toHaveCount(0)

    // 收录：可收录，canonical /works；面包屑结构化数据
    await expectIndexable(page)
    await expectCanonical(page, /\/works$/)
    const breadcrumbList = (await readJsonLd(page)).find((d) => d['@type'] === 'BreadcrumbList')
    expect(breadcrumbList?.itemListElement?.map((item) => item.name)).toEqual(['首页', '学员作品'])
    expect(breadcrumbList?.itemListElement?.[1]?.item).toMatch(/^https?:\/\/.+\/works$/)

    await expectNoHorizontalOverflow(page)
  })

  test('分页：翻到第 3 页共 60 件不重复，第 N 页可收录且标题带页码', async ({ page, isMobile }) => {
    await page.goto('/works')
    const seen = new Set(await cardHrefs(page))

    await pagination(page).getByRole('link', { name: '下一页' }).click()
    await expect(page).toHaveURL(/\/works\?page=2$/)
    await expect(resultStatus(page)).toHaveText(`共 ${TOTAL} 件作品 · 第 2 / 3 页`)
    await expect(workCards(page)).toHaveCount(PER_PAGE)
    for (const href of await cardHrefs(page)) seen.add(href)
    await expect(pagination(page).getByRole('link', { name: '上一页' })).toHaveAttribute(
      'href',
      /\/works$/,
    )
    if (isMobile) {
      // 移动端紧凑：页码换成“2 / 3”
      await expect(pagination(page).getByText('2 / 3')).toBeVisible()
    } else {
      await expect(pagination(page).getByRole('link', { name: '第 2 页' })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await expect(pagination(page).locator('[aria-current="page"]')).toHaveCount(1)
    }

    // 第 2 页：标题与第 1 页不同；可收录，canonical 带页码
    // （收录相关的元数据按整页加载检查：搜索引擎看到的是整页加载的结果）
    await expect(page).toHaveTitle(/第 2 页/)
    await page.goto('/works?page=2')
    await expectIndexable(page)
    await expectCanonical(page, /\/works\?page=2$/)

    if (isMobile) {
      await pagination(page).getByRole('link', { name: '下一页' }).click()
    } else {
      await pagination(page).getByRole('link', { name: '第 3 页' }).click()
    }
    await expect(page).toHaveURL(/\/works\?page=3$/)
    await expect(workCards(page)).toHaveCount(TOTAL - PER_PAGE * 2)
    for (const href of await cardHrefs(page)) seen.add(href)
    expect(seen.size).toBe(TOTAL)
    // 最后一页没有“下一页”
    await expect(pagination(page).getByRole('link', { name: '下一页' })).toHaveCount(0)
    await expect(pagination(page).getByRole('link', { name: '上一页' })).toHaveAttribute(
      'href',
      /\/works\?page=2$/,
    )
    await expect(page).toHaveTitle(/第 3 页/)
    await expectNoHorizontalOverflow(page)
  })

  test('筛选同步到 URL：选专业方向、叠加精选、再点同一项取消、清除筛选', async ({ page }) => {
    await page.goto('/works')

    // 选专业方向：数量与筛选项一致，只有 1 页时不显示分页
    const animation = filterOption(page, '专业方向', '三维动画')
    const animationCount = await optionCount(animation)
    await animation.click()
    await expect(page).toHaveURL(/\/works\?discipline=3d-animation$/)
    await expect(filterOption(page, '专业方向', '三维动画')).toHaveAttribute('aria-current', 'true')
    await expect(filterOption(page, '专业方向', '全部')).not.toHaveAttribute('aria-current')
    await expect(workCards(page)).toHaveCount(animationCount)
    await expect(resultStatus(page)).toHaveText(`共 ${animationCount} 件作品`)
    await expect(pagination(page)).toHaveCount(0)
    for (const card of await workCards(page).all()) {
      await expect(card).toContainText('三维动画')
    }

    // 叠加“只看精选”：结果是三维动画中的精选作品，每张卡片都有精选徽标
    const featured = filterOption(page, '精选', '只看精选')
    const featuredCount = await optionCount(featured)
    expect(featuredCount).toBeGreaterThan(0)
    expect(featuredCount).toBeLessThan(animationCount)
    await featured.click()
    await expect(page).toHaveURL(/\/works\?discipline=3d-animation&featured=1$/)
    await expect(filterOption(page, '精选', '只看精选')).toHaveAttribute('aria-current', 'true')
    await expect(workCards(page)).toHaveCount(featuredCount)
    await expect(resultStatus(page)).toHaveText(`共 ${featuredCount} 件作品`)
    for (const card of await workCards(page).all()) {
      await expect(card.getByText('精选', { exact: true })).toBeVisible()
    }
    // “全部”的数量按其它维度的当前选择计算
    await expect(filterOption(page, '精选', '全部')).toHaveAccessibleName(
      new RegExp(`^全部\\s*（${animationCount} 件作品）$`),
    )

    // 再点同一项：取消该条件
    await filterOption(page, '精选', '只看精选').click()
    await expect(page).toHaveURL(/\/works\?discipline=3d-animation$/)
    await expect(filterOption(page, '精选', '全部')).toHaveAttribute('aria-current', 'true')
    await expect(workCards(page)).toHaveCount(animationCount)

    // 切换到软件：单选替换，专业方向保留
    const maya = filterOption(page, '软件', 'Maya')
    const mayaCount = await optionCount(maya)
    await maya.click()
    await expect(page).toHaveURL(/\/works\?discipline=3d-animation&software=maya$/)
    await expect(workCards(page)).toHaveCount(mayaCount)

    // 清除筛选
    await filterNav(page).getByRole('link', { name: '清除筛选' }).click()
    await expect(page).toHaveURL(/\/works$/)
    await expect(workCards(page)).toHaveCount(PER_PAGE)
    await expect(filterOption(page, '专业方向', '全部')).toHaveAttribute('aria-current', 'true')
    await expect(filterNav(page).getByRole('link', { name: '清除筛选' })).toHaveCount(0)
  })

  test('在第 2 页改变筛选条件时回到第 1 页', async ({ page }) => {
    await page.goto('/works?page=2')
    // 所有筛选链接都不带 page
    const hrefs = await filterNav(page)
      .getByRole('link')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
    expect(hrefs.length).toBeGreaterThan(20)
    for (const href of hrefs) expect(href).not.toContain('page=')

    await filterOption(page, '精选', '只看精选').click()
    await expect(page).toHaveURL(/\/works\?featured=1$/)
    await expect(workCards(page)).toHaveCount(FEATURED)
    await expect(resultStatus(page)).toHaveText(`共 ${FEATURED} 件作品`)
  })

  test('有筛选参数时 noindex, follow，规范地址是 /works', async ({ page }) => {
    await page.goto('/works?discipline=game-art&featured=1')
    await expectNoindexFollow(page)
    await expectCanonical(page, /\/works$/)

    // 非法取值也算带参数：按“全部”展示，但同样 noindex
    await page.goto('/works?software=Bad_Value!')
    await expectNoindexFollow(page)
    await expectCanonical(page, /\/works$/)
    await expect(workCards(page)).toHaveCount(PER_PAGE)
    await expect(resultStatus(page)).toHaveText(`共 ${TOTAL} 件作品 · 第 1 / 3 页`)

    // 非法页码按第 1 页处理，canonical /works
    const invalidPage = await page.goto('/works?page=abc')
    expect(invalidPage?.status()).toBe(200)
    await expectIndexable(page)
    await expectCanonical(page, /\/works$/)
    await expect(resultStatus(page)).toHaveText(`共 ${TOTAL} 件作品 · 第 1 / 3 页`)
  })

  test.describe('超出页码', () => {
    // 浏览器会把 404 响应本身记录为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('页码超出总页数返回 404；没有结果时只有第 1 页（空状态）', async ({ page }) => {
      const beyond = await page.goto('/works?page=4')
      expect(beyond?.status()).toBe(404)

      // 筛选后只有 1 页：第 2 页超出
      const filtered = await page.goto('/works?featured=1&page=2')
      expect(filtered?.status()).toBe(404)

      // 结果为空时第 1 页显示空状态，第 2 页起同样超出（避免任意页码都返回 200 的空页面）
      const empty = await page.goto('/works?discipline=unknown')
      expect(empty?.status()).toBe(200)
      await expect(
        page.getByRole('heading', { level: 2, name: '没有符合条件的作品' }),
      ).toBeVisible()
      const emptyBeyond = await page.goto('/works?discipline=unknown&page=5')
      expect(emptyBeyond?.status()).toBe(404)
    })
  })

  test('没有符合条件的作品时显示空状态，可预约试听或清除筛选', async ({ page }) => {
    await page.goto('/works?discipline=ui-ux&software=maya')
    const empty = page.getByRole('region', { name: '没有符合条件的作品' })
    await expect(empty).toBeVisible()
    await expect(workCards(page)).toHaveCount(0)
    await expect(pagination(page)).toHaveCount(0)
    await expect(resultStatus(page)).toHaveText('共 0 件作品')
    // 当前选择即使数量为 0 也保留，便于取消
    await expect(filterOption(page, '软件', 'Maya')).toHaveAttribute('aria-current', 'true')
    await expect(filterOption(page, '软件', 'Maya')).toHaveAccessibleName(/^Maya\s*（0 件作品）$/)

    // 预约试听：留资弹窗，位置标识 works_list_empty
    await empty.getByRole('button', { name: '预约试听' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input[name="position"]')).toHaveValue('works_list_empty')
    await expect(dialog.locator('input[name="intent"]')).toHaveValue('trial')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await empty.getByRole('link', { name: '清除筛选' }).click()
    await expect(page).toHaveURL(/\/works$/)
    await expect(workCards(page)).toHaveCount(PER_PAGE)
  })

  test('作品卡片链接到作品详情，详情页可访问', async ({ page }) => {
    await page.goto('/works')
    const card = workCards(page).first()
    const title = (await card.getByRole('heading', { level: 2 }).textContent())?.trim() ?? ''
    expect(title).not.toBe('')
    await expect(card).toHaveAccessibleName(title)
    const href = await card.getAttribute('href')
    expect(href).toMatch(/^\/works\/\d+$/)

    // 详情页整页请求返回 200
    const response = await page.request.get(href!)
    expect(response.status()).toBe(200)

    await card.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  })

  test('移动端：瀑布流 2 列、无横向滚动、分页紧凑且触控目标不小于 44px', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, '移动端专属')
    await page.goto('/works')
    await expectNoHorizontalOverflow(page)

    const columns = await masonry(page).evaluate((el) => getComputedStyle(el).columnCount)
    expect(columns).toBe('2')
    // 卡片实际分布在两列
    const xs = await workCards(page).evaluateAll((links) =>
      links.map((a) => Math.round(a.getBoundingClientRect().left)),
    )
    expect(new Set(xs).size).toBe(2)

    // 筛选行可横向滚动
    const scroll = await filterRow(page, '软件').evaluate((el) => ({
      overflowX: getComputedStyle(el).overflowX,
      scrollable: el.scrollWidth > el.clientWidth,
    }))
    expect(scroll).toEqual({ overflowX: 'auto', scrollable: true })

    // 分页：只显示“1 / 3”与下一页箭头
    const nav = pagination(page)
    await nav.scrollIntoViewIfNeeded()
    await expect(nav.getByText('1 / 3')).toBeVisible()
    await expect(nav.getByRole('link', { name: '第 2 页' })).toBeHidden()
    const next = await nav.getByRole('link', { name: '下一页' }).boundingBox()
    expect(next!.height).toBeGreaterThanOrEqual(44)
    expect(next!.width).toBeGreaterThanOrEqual(44)
    await expectNoHorizontalOverflow(page)
  })

  test('桌面端：瀑布流 4 列，筛选项自动换行不横向滚动', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属')
    await page.goto('/works')
    const columns = await masonry(page).evaluate((el) => getComputedStyle(el).columnCount)
    expect(columns).toBe('4')
    for (const label of ['专业方向', '软件', '精选']) {
      const scrollable = await filterRow(page, label).evaluate(
        (el) => el.scrollWidth > el.clientWidth,
      )
      expect(scrollable, `${label}行不应横向滚动`).toBe(false)
    }
    await expectNoHorizontalOverflow(page)
  })
})
