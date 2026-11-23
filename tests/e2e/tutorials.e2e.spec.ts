import type { Locator, Page } from '@playwright/test'
import { getPayload } from 'payload'

import { TUTORIAL_PAGES_DEFAULTS } from '../../src/globals/tutorial-pages-defaults'
import config from '../../src/payload.config.js'
import type { Discipline, Tutorial } from '../../src/payload-types'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 免费教程 /tutorials：列表、筛选（专业方向 / 难度，筛选页 noindex）、播放弹窗（“点击后加载”的外部播放器）、
 * 留资解锁（gated，解锁记录在 localStorage）、`?play=<id>` 深链接。
 * 内容来自种子数据（scripts/seed/data/tutorials.ts）：12 个已发布教程，其中 4 个需要留资解锁。
 * 教程 ID 每次重置种子都会变，按 slug 从数据库查询；期望值也从数据库读取（与页面同一个开发库）。
 * 提交线索的用例用 leadNamespace('tutorials', …) 取本文件专属的手机号与模拟 IP，结束后清理。
 */

const PLAYER_HOST = 'player.bilibili.com'
/** 不需要留资的教程（三维动画 · 入门） */
const OPEN_SLUG = 'blender-low-poly-cabin'
/** 另一个不需要留资的教程（游戏美术），用来确认换教程后播放器重新挂载 */
const OTHER_OPEN_SLUG = 'stylized-prop-texturing'
/** 需要留资解锁的教程（三维动画 · 进阶） */
const GATED_SLUG = 'walk-cycle-key-poses'
/** 另一个需要留资的教程：同一浏览器留资一次后应直接解锁，不再要求留资 */
const OTHER_GATED_SLUG = 'nuke-hair-keying'

type PublishedTutorial = Tutorial & { discipline: Discipline | null }

type TutorialFacts = {
  tutorials: PublishedTutorial[]
  bySlug: (slug: string) => PublishedTutorial
  listTitle: string
  gate: { title: string; submitLabel: string }
}

async function readTutorials(): Promise<TutorialFacts> {
  const payload = await getPayload({ config })
  const [{ docs }, settings] = await Promise.all([
    payload.find({
      collection: 'tutorials',
      where: { _status: { equals: 'published' } },
      depth: 1,
      sort: ['order', 'id'],
      pagination: false,
    }),
    payload.findGlobal({ slug: 'tutorial-pages', depth: 0 }),
  ])
  const tutorials = docs.map((doc) => ({
    ...doc,
    discipline:
      typeof doc.discipline === 'object' && doc.discipline?._status === 'published'
        ? doc.discipline
        : null,
  }))
  return {
    tutorials,
    bySlug: (slug) => {
      const found = tutorials.find((item) => item.slug === slug)
      if (!found) throw new Error(`种子数据缺少教程 ${slug}`)
      return found
    },
    listTitle: settings.list?.title?.trim() || TUTORIAL_PAGES_DEFAULTS.list.title,
    gate: {
      title: settings.gate?.title?.trim() || TUTORIAL_PAGES_DEFAULTS.gate.title,
      submitLabel: settings.gate?.submitLabel?.trim() || TUTORIAL_PAGES_DEFAULTS.gate.submitLabel,
    },
  }
}

/** 筛选栏与卡片显示的专业方向简称（未填写时用全称，同 toDisciplineRef） */
const shortNameOf = (discipline: Discipline) => discipline.shortName?.trim() || discipline.name

const embedUrlOf = (tutorial: Tutorial) =>
  `https://${PLAYER_HOST}/player.html?bvid=${tutorial.videoId}`

/** 卡片上打开播放弹窗的按钮（铺满整张卡片，读屏名称“观看教程：{标题}”） */
function cardButton(page: Page, title: string): Locator {
  return page.getByRole('button', { name: `观看教程：${title}`, exact: true })
}

function allCardButtons(page: Page): Locator {
  return page.getByRole('button', { name: /^观看教程：/ })
}

/** 整张卡片（<article>） */
function card(page: Page, title: string): Locator {
  return page.locator('main article').filter({ has: cardButton(page, title) })
}

function filterNav(page: Page): Locator {
  return page.getByRole('navigation', { name: '教程筛选' })
}

/** 筛选项：可见文字是“名称 + 数量”，无障碍名称是“名称（N 个教程）” */
function filterOption(page: Page, row: string, label: string): Locator {
  return filterNav(page)
    .getByRole('list', { name: row })
    .getByRole('link', { name: new RegExp(`^${label}\\s*（`) })
}

function robotsMeta(page: Page): Locator {
  return page.locator('meta[name="robots"]')
}

async function expectCanonical(page: Page) {
  const links = page.locator('link[rel="canonical"]')
  await expect(links).toHaveCount(1)
  await expect(links).toHaveAttribute('href', /\/tutorials$/)
}

async function expectNoindexFollow(page: Page) {
  await expect(robotsMeta(page)).toHaveAttribute('content', /noindex/)
  await expect(robotsMeta(page)).not.toHaveAttribute('content', /nofollow/)
  await expectCanonical(page)
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '页面不应出现横向滚动').toBe(0)
}

/** 卡片按钮水合前不可用：以第一张卡片的按钮可用确认页面已接管 */
async function waitForHydration(page: Page) {
  await expect(allCardButtons(page).first()).toBeEnabled()
}

type JsonLdNode = { '@type': string; [key: string]: unknown }

async function readJsonLd(page: Page): Promise<JsonLdNode[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
  return scripts.flatMap((text) => {
    const data = JSON.parse(text) as JsonLdNode | JsonLdNode[]
    return Array.isArray(data) ? data : [data]
  })
}

/** 拦截外部播放器地址（不真的访问外网），并记录对它的请求 */
async function interceptPlayer(page: Page): Promise<string[]> {
  await page.route(`https://${PLAYER_HOST}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>player</title>',
    }),
  )
  const requested: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).host === PLAYER_HOST) requested.push(request.url())
  })
  return requested
}

test.describe('免费教程', () => {
  test('列表：标题区、全部教程卡片（专业、难度、平台、留资徽标），可收录，结构化数据', async ({
    page,
  }) => {
    const { tutorials, listTitle } = await readTutorials()
    expect(tutorials.length, '种子数据应有已发布的教程').toBeGreaterThan(8)
    const gated = tutorials.filter((item) => item.gated)
    expect(gated.length, '种子数据应有需要留资解锁的教程').toBeGreaterThan(0)

    const response = await page.goto('/tutorials')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(listTitle)
    await expect(page).toHaveTitle(new RegExp(listTitle))
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByRole('link', { name: '首页' })).toBeVisible()
    await expect(breadcrumbs.getByText(listTitle, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // 卡片：按后台排序，标题是 h2；平台“哔哩哔哩”；只有 gated 的显示“留资解锁”
    await expect(allCardButtons(page)).toHaveCount(tutorials.length)
    await expect(page.locator('main article h2')).toHaveText(tutorials.map((item) => item.title))
    await expect(page.locator('main article').getByText('留资解锁')).toHaveCount(gated.length)
    for (const item of gated)
      await expect(card(page, item.title).getByText('留资解锁')).toBeVisible()
    const first = tutorials[0]!
    const firstCard = card(page, first.title)
    await expect(firstCard.getByText('哔哩哔哩')).toBeVisible()
    if (first.discipline)
      await expect(firstCard.getByText(shortNameOf(first.discipline))).toBeVisible()
    // 卡片按钮的描述包含专业、难度、时长与平台
    await expect(cardButton(page, first.title)).toHaveAccessibleDescription(
      new RegExp(`难度.*${first.duration ? `时长 ${first.duration}.*` : ''}`),
    )
    await expect(cardButton(page, first.title)).toHaveAttribute('aria-haspopup', 'dialog')
    // 只有第一张封面提高加载优先级，其余懒加载
    await expect(page.locator('main article img[loading="lazy"]')).toHaveCount(tutorials.length - 1)

    // 收录：可收录，canonical /tutorials；不请求第三方（fixtures 自动断言）
    const robots = robotsMeta(page)
    if ((await robots.count()) > 0) await expect(robots).not.toHaveAttribute('content', /noindex/)
    await expectCanonical(page)

    const nodes = await readJsonLd(page)
    const breadcrumbList = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumbList?.itemListElement).toHaveLength(2)
    // VideoObject：只有不需要留资的教程；uploadDate（搜索引擎要求的必填项）为后台收录时间
    const videos = nodes.filter((node) => node['@type'] === 'VideoObject')
    const openTutorials = tutorials.filter((item) => !item.gated)
    expect(videos.map((node) => node.name)).toEqual(openTutorials.map((item) => item.title))
    for (const [index, video] of videos.entries()) {
      expect(video.embedUrl).toEqual(expect.stringMatching(new RegExp(`^https://${PLAYER_HOST}/`)))
      expect(video.thumbnailUrl).toEqual(expect.stringMatching(/^https?:\/\/.+\/api\/media\//))
      expect(video.uploadDate).toBe(openTutorials[index]!.createdAt)
    }
  })

  test('筛选：专业方向与难度组合、URL 同步、noindex，清除筛选；无结果时显示空状态', async ({
    page,
  }) => {
    const { tutorials, bySlug } = await readTutorials()
    const discipline = bySlug(OPEN_SLUG).discipline
    expect(discipline, '种子教程应属于已发布的专业方向').not.toBeNull()
    const inDiscipline = tutorials.filter((item) => item.discipline?.id === discipline!.id)
    const beginner = inDiscipline.filter((item) => item.level === 'beginner')
    expect(beginner.length).toBeGreaterThan(0)
    expect(beginner.length).toBeLessThan(inDiscipline.length)

    await page.goto('/tutorials')
    for (const row of ['专业方向', '难度']) {
      await expect(filterOption(page, row, '全部')).toHaveAttribute('aria-current', 'true')
    }
    await expect(filterNav(page).getByRole('status')).toHaveText(`共 ${tutorials.length} 个教程`)
    await expect(filterNav(page).getByRole('link', { name: '清除筛选' })).toHaveCount(0)

    await filterOption(page, '专业方向', shortNameOf(discipline!)).click()
    await expect(page).toHaveURL(new RegExp(`/tutorials\\?discipline=${discipline!.slug}$`))
    await expect(allCardButtons(page)).toHaveCount(inDiscipline.length)
    await expect(filterNav(page).getByRole('status')).toHaveText(`共 ${inDiscipline.length} 个教程`)

    await filterOption(page, '难度', '入门').click()
    await expect(page).toHaveURL(
      new RegExp(`/tutorials\\?discipline=${discipline!.slug}&level=beginner$`),
    )
    await expect(allCardButtons(page)).toHaveCount(beginner.length)
    for (const item of beginner) await expect(cardButton(page, item.title)).toBeVisible()
    await expect(filterOption(page, '难度', '入门')).toHaveAttribute('aria-current', 'true')

    // 收录相关的元数据按整页加载检查
    await page.goto(`/tutorials?discipline=${discipline!.slug}&level=beginner`)
    await expectNoindexFollow(page)

    await filterNav(page).getByRole('link', { name: '清除筛选' }).click()
    await expect(page).toHaveURL(/\/tutorials$/)
    await expect(allCardButtons(page)).toHaveCount(tutorials.length)

    // 合法但不存在的专业方向：空状态 + 清除筛选
    await page.goto('/tutorials?discipline=no-such-discipline')
    await expectNoindexFollow(page)
    const empty = page.getByRole('region', { name: '没有符合条件的教程' })
    await expect(empty).toBeVisible()
    await expect(allCardButtons(page)).toHaveCount(0)
    await expect(empty.getByRole('link', { name: '查看专业课程' })).toHaveAttribute(
      'href',
      /\/courses$/,
    )
    await empty.getByRole('link', { name: '清除筛选' }).click()
    await expect(page).toHaveURL(/\/tutorials$/)
    await expect(allCardButtons(page)).toHaveCount(tutorials.length)
  })

  test.describe('播放弹窗', () => {
    test.use({ allowedThirdPartyHosts: [PLAYER_HOST] })

    test('键盘打开不需要留资的教程：地址同步 ?play=，不请求第三方；Esc 关闭后焦点回到卡片', async ({
      page,
    }) => {
      const { bySlug } = await readTutorials()
      const tutorial = bySlug(OPEN_SLUG)
      const requested = await interceptPlayer(page)
      await page.goto('/tutorials')
      await waitForHydration(page)

      const opener = cardButton(page, tutorial.title)
      await opener.focus()
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog', { name: tutorial.title })
      await expect(dialog).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/tutorials\\?play=${tutorial.id}$`))
      if (tutorial.description) {
        await expect(dialog).toHaveAccessibleDescription(tutorial.description)
      }
      await expect(dialog.getByText('哔哩哔哩')).toBeVisible()
      if (tutorial.duration) await expect(dialog.getByText(tutorial.duration)).toBeVisible()
      if (tutorial.discipline) {
        await expect(
          dialog.getByRole('link', { name: `了解${tutorial.discipline.name}专业` }),
        ).toHaveAttribute('href', new RegExp(`/majors/${tutorial.discipline.slug}$`))
      }
      // 不需要留资：没有留资表单，直接是“点击后加载”的播放器外观
      await expect(dialog.getByRole('textbox')).toHaveCount(0)
      await expect(
        dialog.getByRole('button', { name: `播放视频：${tutorial.title}` }),
      ).toBeEnabled()
      await expect(dialog.getByText('点击播放后才会加载播放器')).toBeVisible()
      await page.waitForLoadState('networkidle')
      expect(requested, '点击播放前不应请求第三方').toEqual([])
      await expect(page.locator('iframe')).toHaveCount(0)

      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(opener).toBeFocused()
      await expect(page).toHaveURL(/\/tutorials$/)
    })

    test('点击播放后才插入白名单 iframe；关闭后换一个教程不沿用正在播放的播放器', async ({
      page,
    }) => {
      const { bySlug } = await readTutorials()
      const tutorial = bySlug(OPEN_SLUG)
      const other = bySlug(OTHER_OPEN_SLUG)
      const requested = await interceptPlayer(page)
      await page.goto('/tutorials')
      await waitForHydration(page)

      const opener = cardButton(page, tutorial.title)
      await opener.click()
      const dialog = page.getByRole('dialog', { name: tutorial.title })
      const play = dialog.getByRole('button', { name: `播放视频：${tutorial.title}` })
      await expect(play).toBeEnabled()
      const embedUrl = embedUrlOf(tutorial)
      const frameRequest = page.waitForRequest((request) => request.url() === embedUrl)
      await play.click()
      await frameRequest
      const frame = dialog.locator('iframe')
      await expect(frame).toHaveCount(1)
      await expect(frame).toHaveAttribute('src', embedUrl)
      await expect(frame).toHaveAttribute('title', `${tutorial.title}（视频播放器）`)
      await expect(frame).toBeFocused()
      expect(requested).toEqual([embedUrl])

      // 焦点在跨域 iframe 里时 Esc 不会传到页面：用关闭按钮
      await dialog.getByRole('button', { name: '关闭' }).click()
      await expect(dialog).toBeHidden()
      await expect(opener).toBeFocused()
      await expect(page.locator('iframe')).toHaveCount(0)

      await cardButton(page, other.title).click()
      const otherDialog = page.getByRole('dialog', { name: other.title })
      await expect(otherDialog).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/tutorials\\?play=${other.id}$`))
      await expect(
        otherDialog.getByRole('button', { name: `播放视频：${other.title}` }),
      ).toBeVisible()
      await expect(page.locator('iframe')).toHaveCount(0)
      expect(requested, '换教程后不应自动加载播放器').toEqual([embedUrl])
    })
  })

  test('深链接 ?play=<id>：直接打开对应弹窗（不受筛选影响），noindex，标题为教程名；不存在时提示', async ({
    page,
  }) => {
    const { bySlug, tutorials, gate } = await readTutorials()
    const tutorial = bySlug(OPEN_SLUG)
    const gated = bySlug(GATED_SLUG)

    await page.goto(`/tutorials?play=${tutorial.id}`)
    const dialog = page.getByRole('dialog', { name: tutorial.title })
    await expect(dialog).toBeVisible()
    await expect(page).toHaveTitle(
      new RegExp(tutorial.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    )
    await expectNoindexFollow(page)
    await expect(dialog.getByRole('button', { name: `播放视频：${tutorial.title}` })).toBeVisible()
    // 没有“打开它的按钮”：关闭后焦点落到对应卡片上
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(cardButton(page, tutorial.title)).toBeFocused()
    await expect(page).toHaveURL(/\/tutorials$/)
    // 深链接不影响列表：仍是全部教程
    await expect(allCardButtons(page)).toHaveCount(tutorials.length)

    // 筛选结果里没有这个教程时也能打开；关闭后保留筛选条件
    const otherDiscipline = tutorials.find(
      (item) => item.discipline && item.discipline.id !== gated.discipline?.id,
    )!.discipline!
    await page.goto(`/tutorials?discipline=${otherDiscipline.slug}&play=${gated.id}`)
    const gatedDialog = page.getByRole('dialog', { name: gated.title })
    await expect(gatedDialog).toBeVisible()
    // 未解锁的 gated 教程先显示留资区，没有播放按钮
    await expect(gatedDialog.getByRole('heading', { name: gate.title })).toBeVisible()
    await expect(gatedDialog.getByRole('button', { name: /^播放视频/ })).toHaveCount(0)
    await gatedDialog.getByRole('button', { name: '关闭' }).click()
    await expect(gatedDialog).toBeHidden()
    await expect(page).toHaveURL(new RegExp(`/tutorials\\?discipline=${otherDiscipline.slug}$`))

    // 不存在 / 已下线 / 格式不对：不打开弹窗，显示提示
    for (const value of ['2147483647', 'abc']) {
      const response = await page.goto(`/tutorials?play=${value}`)
      expect(response?.status()).toBe(200)
      await expect(
        page.getByRole('status').filter({ hasText: '这个教程暂时无法观看' }),
      ).toBeVisible()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expectNoindexFollow(page)
    }
  })

  test('留资解锁：先填表单，提交后记录线索并原地解锁；其它需留资的教程一并解锁；刷新后仍解锁', async ({
    page,
  }, testInfo) => {
    const ns = leadNamespace('tutorials', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const { bySlug, gate, tutorials } = await readTutorials()
    const tutorial = bySlug(GATED_SLUG)
    const other = bySlug(OTHER_GATED_SLUG)
    const gatedCount = tutorials.filter((item) => item.gated).length
    expect(tutorial.gated).toBe(true)
    expect(other.gated).toBe(true)
    expect(tutorial.discipline, '种子教程应属于已发布的专业方向').not.toBeNull()
    expect(tutorial.id, '教程与专业的 ID 相同时，断言发现不了两者被传反').not.toBe(
      tutorial.discipline!.id,
    )
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto('/tutorials')
    try {
      await waitForHydration(page)
      await expect(card(page, tutorial.title).getByText('留资解锁')).toBeVisible()
      await cardButton(page, tutorial.title).click()

      const dialog = page.getByRole('dialog', { name: tutorial.title })
      const gateRegion = dialog.getByRole('region', { name: gate.title })
      await expect(gateRegion).toBeVisible()
      await expect(dialog.getByRole('button', { name: /^播放视频/ })).toHaveCount(0)
      await expect(page.locator('iframe')).toHaveCount(0)
      await expect(dialog.locator('input[name="intent"]')).toHaveValue('tutorial')
      await expect(dialog.locator('input[name="position"]')).toHaveValue('tutorial_gate')
      await expect(dialog.locator('input[name="tutorial"]')).toHaveValue(String(tutorial.id))
      await expect(dialog.getByLabel('意向专业')).toHaveValue(String(tutorial.discipline!.id))

      await dialog.getByLabel('姓名').fill('教程解锁测试')
      await dialog.getByLabel('手机号').fill(phone)
      await dialog.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await dialog.getByRole('button', { name: gate.submitLabel }).click()

      // 原地解锁：提示 + 播放按钮（获得焦点），留资区消失
      await expect(
        dialog.getByRole('status').filter({ hasText: '已解锁，可以观看了' }),
      ).toBeVisible()
      const play = dialog.getByRole('button', { name: `播放视频：${tutorial.title}` })
      await expect(play).toBeFocused()
      await expect(gateRegion).toHaveCount(0)
      await expect(page.locator('iframe')).toHaveCount(0)

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '教程解锁测试',
        intent: 'tutorial',
        discipline: tutorial.discipline!.id,
        source: { position: 'tutorial_gate' },
        context: { tutorial: tutorial.id },
        client: { ip },
      })
      expect(lead?.source?.pageUrl).toContain(`/tutorials?play=${tutorial.id}`)

      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(card(page, tutorial.title).getByText('已解锁')).toBeVisible()

      // 留资一次即可：其它需留资的教程徽标也改为“已解锁”，打开后直接显示播放器，不再要求留资
      // （否则每个教程一条线索，同一手机号很快触发每日提交上限）
      const gatedBadges = page.locator('main article').getByText('已解锁', { exact: true })
      await expect(gatedBadges).toHaveCount(gatedCount)
      await expect(page.locator('main article').getByText('留资解锁')).toHaveCount(0)
      await cardButton(page, other.title).click()
      const otherDialog = page.getByRole('dialog', { name: other.title })
      await expect(
        otherDialog.getByRole('button', { name: `播放视频：${other.title}` }),
      ).toBeVisible()
      await expect(otherDialog.getByRole('region', { name: gate.title })).toHaveCount(0)
      await expect(otherDialog.getByRole('textbox')).toHaveCount(0)
      await page.keyboard.press('Escape')
      await expect(otherDialog).toBeHidden()

      // 刷新（深链接）后仍解锁：直接显示播放器
      await page.goto(`/tutorials?play=${tutorial.id}`)
      const reopened = page.getByRole('dialog', { name: tutorial.title })
      await expect(
        reopened.getByRole('button', { name: `播放视频：${tutorial.title}` }),
      ).toBeVisible()
      await expect(reopened.getByRole('region', { name: gate.title })).toHaveCount(0)
      await page.keyboard.press('Escape')
      await expect(card(page, tutorial.title).getByText('已解锁')).toBeVisible()
      await expect(gatedBadges).toHaveCount(gatedCount)
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('卡片按钮键盘聚焦时焦点描边完整可见；移动端列表与留资弹窗无横向滚动', async ({
    page,
    isMobile,
  }) => {
    const { bySlug } = await readTutorials()
    const gated = bySlug(GATED_SLUG)
    await page.goto('/tutorials')
    await waitForHydration(page)
    await expectNoHorizontalOverflow(page)

    const target = cardButton(page, gated.title)
    await page.keyboard.press('Tab')
    await target.focus()
    const ring = await target.evaluate((el) => {
      const style = getComputedStyle(el)
      const extent = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset)
      const rect = el.getBoundingClientRect()
      const clippedBy: string[] = []
      for (let node = el.parentElement; node; node = node.parentElement) {
        if (node === document.body || node === document.documentElement) break
        const overflow = getComputedStyle(node)
        if (overflow.overflowX === 'visible' && overflow.overflowY === 'visible') continue
        const box = node.getBoundingClientRect()
        if (
          rect.left - extent < box.left + node.clientLeft - 0.5 ||
          rect.top - extent < box.top + node.clientTop - 0.5 ||
          rect.right + extent > box.left + node.clientLeft + node.clientWidth + 0.5 ||
          rect.bottom + extent > box.top + node.clientTop + node.clientHeight + 0.5
        ) {
          clippedBy.push(node.className)
        }
      }
      return {
        focusVisible: el.matches(':focus-visible'),
        outlineStyle: style.outlineStyle,
        clippedBy,
      }
    })
    expect(ring.focusVisible).toBe(true)
    expect(ring.outlineStyle).not.toBe('none')
    expect(ring.clippedBy, '焦点描边不应被外层容器裁切').toEqual([])

    // 不等弹出动画：直接量最终位置
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await target.click()
    const dialog = page.getByRole('dialog', { name: gated.title })
    await expect(dialog).toBeVisible()
    await expectNoHorizontalOverflow(page)
    const viewport = page.viewportSize()!
    const box = await dialog.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    if (isMobile) {
      // 移动端为底部面板：贴底、通栏
      await expect
        .poll(async () => {
          const current = await dialog.boundingBox()
          return Math.round((current?.y ?? 0) + (current?.height ?? 0))
        })
        .toBe(viewport.height)
      expect(Math.round(box!.width)).toBe(viewport.width)
    }
  })
})
