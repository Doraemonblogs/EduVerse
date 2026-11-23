import type { Locator, Page } from '@playwright/test'
import { getPayload, type Where } from 'payload'

import config from '../../src/payload.config.js'
import { escapeLikeTerm } from '../../src/lib/search/query'
import { expect, test } from './fixtures'

/**
 * 站内搜索 /search?q=：搜索框（role="search"，GET 提交，Enter 提交后 URL 带 q）、按类型分组的结果（数量、高亮）、
 * 结果汇总（role="status"）、点击结果到达对应页面、无结果状态（热门入口 + 在线咨询 search_empty）、
 * 空白 / 超长关键词（不查库，只给提示与热门入口）、XSS 字符串原样显示、收录规则（带 q 时 noindex, follow，canonical /search）、
 * 头部搜索按钮打开搜索页并聚焦搜索框、移动端无横向滚动。
 * 期望值从数据库读取（与页面同一个开发库），过滤条件与数据层 src/lib/data/search.ts 一致，不在测试里写死种子内容。
 * 本文件不提交线索（在线咨询只检查弹窗携带的来源位置与意向）。
 */

// 开发服务器首次访问某个路由时要现编译，留足时间
test.describe.configure({ timeout: 120_000 })

const PATH = '/search'
/** 种子数据里课程、资讯、讲师、作品都提到的软件；大小写与数据不同，顺带验证大小写不敏感 */
const KEYWORD = 'BLENDER'
/** 不会有任何结果的关键词 */
const NO_RESULT = 'zzqq不存在的关键词'
/** 只能显示为文字的 HTML / 脚本字符串（不超过 50 个字） */
const XSS = '<img src=x onerror=alert(1)><b>粗体</b>'

const published = { _status: { equals: 'published' } } as const satisfies Where

type GroupKey = 'courses' | 'disciplines' | 'articles' | 'teachers' | 'works'

const GROUP_LABELS: Record<GroupKey, string> = {
  courses: '课程',
  disciplines: '专业方向',
  articles: '资讯',
  teachers: '讲师',
  works: '学员作品',
}

/** 单个检索词在任一字段中出现（与数据层 termsWhere 一致） */
function matchAny(fields: string[], term: string): Where {
  return { or: fields.map((field) => ({ [field]: { contains: escapeLikeTerm(term) } })) }
}

/** 各类型的匹配总数（只含已发布；课程要求专业方向已发布，作品要求已确认授权） */
async function readGroupTotals(term: string): Promise<Record<GroupKey, number>> {
  const payload = await getPayload({ config })
  const count = async (collection: GroupKey, where: Where) =>
    (await payload.count({ collection, where })).totalDocs
  const [courses, disciplines, articles, teachers, works] = await Promise.all([
    count('courses', {
      and: [
        published,
        { 'discipline._status': { equals: 'published' } },
        matchAny(['title', 'summary'], term),
      ],
    }),
    count('disciplines', { and: [published, matchAny(['name', 'shortName', 'tagline'], term)] }),
    count('articles', { and: [published, matchAny(['title', 'searchText'], term)] }),
    count('teachers', {
      and: [published, matchAny(['name', 'title', 'specialties.text'], term)],
    }),
    count('works', {
      and: [
        published,
        { consentConfirmed: { equals: true } },
        matchAny(['title', 'description'], term),
      ],
    }),
  ])
  return { courses, disciplines, articles, teachers, works }
}

/** 热门专业：已发布且在导航中显示的专业方向（后台排序，最多 8 个） */
async function readHotDisciplines(): Promise<string[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'disciplines',
    where: { and: [published, { showInNav: { equals: true } }] },
    sort: ['order', 'id'],
    limit: 8,
    depth: 0,
    select: { name: true },
  })
  return docs.map((doc) => doc.name)
}

function searchForm(page: Page): Locator {
  return page.getByRole('search')
}

function searchInput(page: Page): Locator {
  return searchForm(page).getByRole('searchbox', { name: '搜索关键词' })
}

/** 结果汇总（role="status"，客户端导航后播报） */
function summary(page: Page): Locator {
  return page.getByRole('status').filter({ hasText: '共找到' })
}

/** 分组区块：h2 为“类型 N 条” */
function groupSection(page: Page, key: GroupKey): Locator {
  return page.getByRole('region', { name: new RegExp(`^${GROUP_LABELS[key]}\\s*\\d+ 条$`) })
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '页面不应出现横向滚动').toBe(0)
}

async function expectCanonicalSearch(page: Page) {
  const links = page.locator('link[rel="canonical"]')
  await expect(links).toHaveCount(1)
  await expect(links).toHaveAttribute('href', /\/search$/)
}

async function expectNoindexFollow(page: Page) {
  const robots = page.locator('meta[name="robots"]')
  await expect(robots).toHaveAttribute('content', /noindex/)
  await expect(robots).toHaveAttribute('content', /follow/)
  await expect(robots).not.toHaveAttribute('content', /nofollow/)
}

/** 打开空搜索页并等待接管：搜索框在挂载后自动获得焦点（水合完成的标志） */
async function openSearch(page: Page) {
  const response = await page.goto(PATH)
  expect(response?.status()).toBe(200)
  await expect(searchInput(page)).toBeFocused()
}

/** 在搜索框输入关键词并按 Enter 提交，等待地址栏带上 q */
async function submitWithEnter(page: Page, keyword: string) {
  const input = searchInput(page)
  await input.fill(keyword)
  await input.press('Enter')
  await expect
    .poll(() => new URL(page.url()).searchParams.get('q'), { message: '地址栏应带上关键词' })
    .toBe(keyword)
}

test.describe('站内搜索', () => {
  test('空搜索页：搜索框（role="search"、有标签、最多 50 个字）自动获得焦点，显示热门专业与热门课程；可收录，canonical /search', async ({
    page,
  }) => {
    const hot = await readHotDisciplines()
    await openSearch(page)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('站内搜索')
    await expect(page).toHaveTitle(/^站内搜索/)
    const input = searchInput(page)
    await expect(input).toHaveAttribute('name', 'q')
    await expect(input).toHaveAttribute('maxlength', '50')
    await expect(input).toHaveValue('')
    // GET 提交到 /search（next/form 渲染的原生表单，水合前也能提交）
    await expect(searchForm(page)).toHaveAttribute('action', /\/search$/)

    const hotSection = page.getByRole('region', { name: '热门专业' })
    expect(hot.length, '种子数据应有在导航中显示的专业方向').toBeGreaterThan(0)
    await expect(hotSection.getByRole('link')).toHaveText(hot)
    await expect(
      page.getByRole('region', { name: '热门课程' }).getByRole('link').first(),
    ).toBeVisible()
    // 没有关键词：不显示结果汇总与分组
    await expect(summary(page)).toHaveCount(0)

    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expectCanonicalSearch(page)
    await expectNoHorizontalOverflow(page)
  })

  test('输入关键词按 Enter 提交：地址栏带 q，按类型分组显示数量，标题与摘要高亮关键词；汇总播报结果数；noindex, follow', async ({
    page,
  }) => {
    const totals = await readGroupTotals(KEYWORD)
    const expected = (Object.keys(GROUP_LABELS) as GroupKey[]).filter((key) => totals[key] > 0)
    const total = expected.reduce((sum, key) => sum + totals[key], 0)
    expect(totals.courses, `种子数据应有提到 ${KEYWORD} 的课程`).toBeGreaterThan(0)
    expect(expected.length, `种子数据应有两类以上内容提到 ${KEYWORD}`).toBeGreaterThan(1)

    await openSearch(page)
    await submitWithEnter(page, KEYWORD)

    // 客户端导航：搜索框保留焦点，汇总（role="status"）更新为结果数
    await expect(summary(page)).toHaveText(`“${KEYWORD}”共找到 ${total} 条结果`)
    await expect(searchInput(page)).toBeFocused()
    await expect(searchInput(page)).toHaveValue(KEYWORD)

    // 分组：只显示有结果的类型，顺序固定，h2 带数量
    const headings = page.locator('main section[id^="search-group-"] > h2')
    await expect(headings).toHaveText(
      expected.map((key) => new RegExp(`^${GROUP_LABELS[key]}\\s*${totals[key]} 条$`)),
    )
    // 按类型跳转的链接
    const jump = page.getByRole('navigation', { name: '按类型查看结果' })
    await expect(jump.getByRole('link')).toHaveCount(expected.length)
    await jump.getByRole('link', { name: new RegExp(`^${GROUP_LABELS[expected[1]!]}`) }).click()
    await expect(page).toHaveURL(new RegExp(`#search-group-${expected[1]}$`))

    for (const key of expected) {
      const items = groupSection(page, key).getByRole('listitem')
      await expect(items).toHaveCount(Math.min(totals[key], 10))
    }

    // 高亮：<mark> 保留原文大小写，大小写不敏感匹配
    const firstCourse = groupSection(page, 'courses').getByRole('listitem').first()
    const marks = firstCourse.locator('mark')
    expect(await marks.count()).toBeGreaterThan(0)
    for (const text of await marks.allTextContents()) expect(text.toLowerCase()).toBe('blender')

    await expect(page).toHaveTitle(new RegExp(`^搜索：${KEYWORD}`))
    await expectNoindexFollow(page)
    await expectCanonicalSearch(page)
    await expectNoHorizontalOverflow(page)
  })

  test('点击结果到达对应页面（200），每个类型的结果链接都可访问', async ({ page }) => {
    const totals = await readGroupTotals(KEYWORD)
    const response = await page.goto(`${PATH}?q=${encodeURIComponent(KEYWORD)}`)
    expect(response?.status()).toBe(200)

    for (const key of Object.keys(GROUP_LABELS) as GroupKey[]) {
      if (totals[key] === 0) continue
      const link = groupSection(page, key).getByRole('link').first()
      const href = await link.getAttribute('href')
      expect(href, `${GROUP_LABELS[key]}的结果应链接到站内页面`).toMatch(/^\/[a-z]+\/[^/?#]+$/)
      const target = await page.request.get(href!)
      expect(target.status(), `${href} 应返回 200`).toBe(200)
    }

    // 点击第一门课程：到达课程详情，h1 为课程名称
    const course = groupSection(page, 'courses').getByRole('link').first()
    const title = (await course.getByRole('heading', { level: 3 }).textContent())!.trim()
    const href = (await course.getAttribute('href'))!
    await course.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  })

  test('无结果：说明与换关键词建议、热门专业、在线咨询（来源 search_empty、意向 consult）；读屏汇总为 0 条', async ({
    page,
  }) => {
    const hot = await readHotDisciplines()
    await openSearch(page)
    await submitWithEnter(page, NO_RESULT)

    const noResults = page.getByRole('region', { name: `没有找到与“${NO_RESULT}”相关的内容` })
    await expect(noResults.getByRole('heading', { level: 2 })).toBeVisible()
    await expect(noResults.getByText(/^换个关键词试试/)).toBeVisible()
    await expect(summary(page)).toHaveText(`“${NO_RESULT}”共找到 0 条结果`)
    await expect(page.locator('main section[id^="search-group-"]')).toHaveCount(0)
    await expect(page.getByRole('region', { name: '热门专业' }).getByRole('link')).toHaveText(hot)

    // 页面右侧 / 底部的悬浮栏也有“在线咨询”，这里点的是无结果区块里的按钮
    await noResults.getByRole('button', { name: '在线咨询', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input[name="position"]')).toHaveValue('search_empty')
    await expect(dialog.locator('input[name="intent"]')).toHaveValue('consult')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await expectNoindexFollow(page)
    await expectNoHorizontalOverflow(page)
  })

  test('HTML / 脚本字符串原样显示为文字，不会被执行或插入元素', async ({ page }) => {
    const dialogs: string[] = []
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message())
      void dialog.dismiss()
    })
    await openSearch(page)
    await submitWithEnter(page, XSS)

    await expect(
      page.getByRole('heading', { level: 2, name: `没有找到与“${XSS}”相关的内容` }),
    ).toBeVisible()
    await expect(searchInput(page)).toHaveValue(XSS)
    await expect(page).toHaveTitle(new RegExp(`^搜索：${XSS.replace(/[()]/g, '\\$&')}`))
    await expect(page.locator('main img[src="x"]')).toHaveCount(0)
    await expect(page.locator('main b', { hasText: '粗体' })).toHaveCount(0)
    // 首屏直接打开同样的地址（服务端渲染）也只是文字
    await page.goto(`${PATH}?q=${encodeURIComponent(XSS)}`)
    await expect(summary(page)).toContainText(XSS)
    await expect(page.locator('img[src="x"]')).toHaveCount(0)
    expect(dialogs, '不应弹出任何对话框').toEqual([])
  })

  test('超长关键词：不查询，提示不能超过 50 个字（输入框 aria-invalid 并关联提示），回填截断后的关键词；输入框最多只能输入 50 个字', async ({
    page,
  }) => {
    const long = 'a'.repeat(60)
    const response = await page.goto(`${PATH}?q=${long}`)
    expect(response?.status()).toBe(200)

    const input = searchInput(page)
    await expect(input).toHaveValue('a'.repeat(50))
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveAccessibleDescription('关键词不能超过 50 个字，请精简后再搜索')
    await expect(input).toBeFocused()
    await expect(summary(page)).toHaveCount(0)
    await expect(page.locator('main section[id^="search-group-"]')).toHaveCount(0)
    await expect(page.getByRole('region', { name: '热门专业' })).toBeVisible()
    await expect(page).toHaveTitle(/^站内搜索/)
    await expectNoindexFollow(page)
    await expectCanonicalSearch(page)

    // 输入框限制 50 个字
    await input.fill('')
    await input.pressSequentially('b'.repeat(55))
    await expect(input).toHaveValue('b'.repeat(50))
    await expectNoHorizontalOverflow(page)
  })

  test('空白关键词：不查询，提示输入关键词；直接按 Enter 提交空搜索框得到同样的提示', async ({
    page,
  }) => {
    await page.goto(`${PATH}?q=%20%20%20`)
    const input = searchInput(page)
    await expect(input).toHaveValue('')
    await expect(input).toBeFocused()
    await expect(input).toHaveAccessibleDescription('请输入要搜索的关键词')
    await expect(input).not.toHaveAttribute('aria-invalid', 'true')
    await expect(summary(page)).toHaveCount(0)
    await expectNoindexFollow(page)

    await openSearch(page)
    await expect(input).not.toHaveAccessibleDescription(/请输入/)
    await input.press('Enter')
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('')
    await expect(page.getByText('请输入要搜索的关键词')).toBeVisible()
    await expect(input).toBeFocused()
    await expectNoHorizontalOverflow(page)
  })

  test('头部搜索按钮：打开搜索页并聚焦搜索框；在结果页点击回到空搜索页并清空搜索框', async ({
    page,
  }) => {
    await page.goto('/')
    const headerSearch = page.getByRole('banner').getByRole('link', { name: '搜索', exact: true })
    await headerSearch.click()
    await expect(page).toHaveURL(/\/search$/)
    await expect(searchInput(page)).toBeFocused()
    await expect(headerSearch).toHaveAttribute('aria-current', 'page')

    await submitWithEnter(page, KEYWORD)
    await expect(summary(page)).toBeVisible()
    await headerSearch.click()
    await expect(page).toHaveURL(/\/search$/)
    await expect(searchInput(page)).toHaveValue('')
    await expect(searchInput(page)).toBeFocused()
    await expect(summary(page)).toHaveCount(0)

    // 浏览器后退：搜索框跟随地址栏回到上一次的关键词
    await page.goBack()
    await expect(summary(page)).toBeVisible()
    await expect(searchInput(page)).toHaveValue(KEYWORD)
    await expectNoHorizontalOverflow(page)
  })
})
