import type { Locator, Page } from '@playwright/test'

import { zh } from '../../src/i18n/zh'
import { formatMessage } from '../../src/lib/course/format'
import {
  blockingViolations,
  formatViolations,
  headingIssues,
  readHeadings,
  runAxe,
} from '../helpers/axe'
import { expect, test } from './fixtures'

/**
 * 无障碍复查（M8）：
 * 1. 每类页面（桌面 1440 / 移动 390）跑 axe-core（wcag2a + wcag2aa），不得有 serious / critical 违规；
 *    只有一个 h1、标题不跳级；“跳到主要内容”链接是第一个可聚焦元素，获得焦点时可见，回车后焦点进入 <main>。
 * 2. 键盘全流程抽查：头部大菜单、移动端菜单抽屉、留资弹窗、作品灯箱、首页轮播、职业测试答题、教程弹窗——
 *    只用键盘到达并操作；打开状态同样跑 axe；对话框焦点锁定、Esc 关闭后焦点回到打开它的控件。
 * 内容来自种子数据：固定的 slug 取自 scripts/seed（registry.ts 与 data/*）；作品 ID 每次重置种子都会变，从列表页的链接读取。
 * 本文件不提交线索（留资弹窗只验证空表单的前端校验），无需登记 LEAD_SPECS。
 * 减少动态效果：弹窗 / 菜单的淡入动画关闭，axe 不会在半透明的过渡帧上计算对比度。
 */

// 开发服务器首次访问某个路由时要现编译，留足时间
test.describe.configure({ timeout: 120_000 })
test.use({ reducedMotion: 'reduce' })

/**
 * 开发服务器注入的 Next 调试浮层（nextjs-portal，页面有报错提示时会出现可聚焦的按钮）设为 inert，
 * 不参与 Tab 顺序；生产构建没有这个元素，脚本不起作用。
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const neutralize = () => {
      for (const portal of document.querySelectorAll('nextjs-portal')) {
        portal.setAttribute('inert', '')
      }
    }
    new MutationObserver(neutralize).observe(document, { childList: true, subtree: true })
  })
})

const SKIP_LINK = zh.a11y.skipToContent
/** 种子数据中带作品集（多张图）的作品，灯箱用例用它（见 scripts/seed/data/works.ts） */
const GALLERY_WORK = '《机甲少女·澜》角色建模'
/** 种子数据「导航」的 CTA 文案（头部按钮与移动端菜单抽屉里的按钮） */
const TRIAL_CTA = '预约试听'

type PageTarget = {
  name: string
  /** 固定地址，或在列表页上找到的第一个详情链接（ID 会变的内容） */
  path: string | { from: string; linkPrefix: string }
  status?: number
}

const PAGES: PageTarget[] = [
  { name: '首页', path: '/' },
  { name: '课程列表', path: '/courses' },
  { name: '课程列表（筛选）', path: '/courses?discipline=3d-animation&type=short_term' },
  { name: '课程详情', path: '/courses/3d-animation-career' },
  { name: '专业方向页', path: '/majors/3d-animation' },
  { name: '作品列表', path: '/works' },
  { name: '作品列表（第 2 页）', path: '/works?page=2' },
  { name: '作品列表（筛选无结果）', path: '/works?discipline=ui-ux&software=maya' },
  { name: '作品详情', path: { from: '/works', linkPrefix: '/works/' } },
  { name: '讲师列表', path: '/teachers' },
  { name: '讲师详情', path: '/teachers/lin-yuqing' },
  { name: '资讯列表', path: '/articles' },
  { name: '资讯分类', path: { from: '/articles', linkPrefix: '/articles/category/' } },
  { name: '资讯详情', path: '/articles/beijing-campus-autumn-open-day' },
  { name: '校区列表', path: '/campuses' },
  { name: '校区详情', path: '/campuses/beijing-haidian' },
  { name: '就业服务', path: '/careers' },
  { name: '职业测试', path: '/quiz' },
  { name: '免费教程', path: '/tutorials' },
  { name: '站内搜索（未输入）', path: '/search' },
  { name: '站内搜索（有结果）', path: `/search?q=${encodeURIComponent('动画')}` },
  { name: '站内搜索（无结果）', path: `/search?q=${encodeURIComponent('无此关键词zzz')}` },
  { name: '站内搜索（关键词过长）', path: `/search?q=${'a'.repeat(60)}` },
  { name: '关于我们', path: '/about' },
  { name: '隐私政策', path: '/privacy' },
]

const NOT_FOUND_PAGES: PageTarget[] = [
  { name: '404（详情不存在）', path: '/courses/not-a-real-course', status: 404 },
  { name: '404（未匹配任何路由）', path: '/no/such/deep/path', status: 404 },
]

/**
 * 打开页面并等到网络空闲（客户端组件已水合：水合前禁用的按钮此时已可用，axe 检查的是访客实际操作的状态）
 */
async function gotoReady(page: Page, path: string, status = 200) {
  const response = await page.goto(path, { waitUntil: 'networkidle' })
  expect(response?.status(), `${path} 的状态码`).toBe(status)
}

async function resolvePath(page: Page, target: PageTarget): Promise<string> {
  if (typeof target.path === 'string') return target.path
  await gotoReady(page, target.path.from)
  const href = await page
    .getByRole('main')
    .locator(`a[href*="${target.path.linkPrefix}"]`)
    .first()
    .getAttribute('href')
  if (!href) throw new Error(`${target.path.from} 上没有 ${target.path.linkPrefix} 链接`)
  return href
}

/** 当前页面（或打开的弹窗）没有 serious / critical 级别的 WCAG A / AA 违规 */
async function expectNoBlockingViolations(page: Page, label: string) {
  const blocking = blockingViolations(await runAxe(page))
  expect(formatViolations(blocking), `${label}：axe serious / critical 违规`).toEqual([])
}

/** 焦点当前在容器内 */
async function focusIsInside(container: Locator): Promise<boolean> {
  return container.evaluate((node) => node.contains(document.activeElement))
}

/** 连续按 Tab（或 Shift+Tab）直到焦点落到目标上（键盘操作才会命中 :focus-visible，也验证了它在 Tab 顺序中） */
async function tabTo(page: Page, target: Locator, maxPresses = 80, key = 'Tab') {
  for (let i = 0; i < maxPresses; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press(key)
  }
  await expect(target, `按 ${maxPresses} 次 ${key} 内应能到达`).toBeFocused()
}

/** 当前焦点元素是否在辅助技术不可见的子树里（aria-hidden） */
async function focusIsAriaHidden(page: Page): Promise<boolean> {
  return page.evaluate(() => Boolean(document.activeElement?.closest('[aria-hidden="true"]')))
}

/** 用“跳到主要内容”跳过头部导航：之后按 Tab 从主要内容开始 */
async function skipToMain(page: Page) {
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: SKIP_LINK })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main#main')).toBeFocused()
}

/** 对话框的焦点锁定：正反向各按若干次 Tab，焦点始终在对话框内 */
async function expectFocusTrapped(page: Page, dialog: Locator) {
  const focusable = await dialog
    .locator('a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea')
    .count()
  const presses = Math.min(focusable + 2, 60)
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < presses; i++) {
      await page.keyboard.press(key)
      expect(await focusIsInside(dialog), `按 ${key} 第 ${i + 1} 次后焦点应仍在对话框内`).toBe(true)
    }
  }
}

/**
 * 跳过链接：第一个可聚焦元素；获得焦点时出现在视口内；回车后焦点进入 <main>，再按 Tab 停在主要内容里。
 * 打开时已自动聚焦某个控件的页面（搜索页的搜索框）从该控件按 Shift+Tab 往回找到它。
 */
async function expectSkipLinkWorks(page: Page) {
  const skip = page.getByRole('link', { name: SKIP_LINK })
  const autofocused = await page.evaluate(() => document.activeElement !== document.body)
  if (autofocused) {
    await tabTo(page, skip, 40, 'Shift+Tab')
  } else {
    await page.keyboard.press('Tab')
    await expect(skip, '第一个可聚焦元素应是跳过链接').toBeFocused()
  }
  await expect(skip).toBeInViewport()
  const box = await skip.boundingBox()
  expect(box?.width ?? 0, '跳过链接获得焦点时应可见').toBeGreaterThan(40)
  expect(box?.height ?? 0, '跳过链接获得焦点时应可见').toBeGreaterThan(16)
  await page.keyboard.press('Enter')
  const main = page.locator('main#main')
  await expect(main).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await focusIsInside(main), '跳过后按 Tab 应进入主要内容').toBe(true)
}

function pageTest(target: PageTarget) {
  test(`${target.name}：axe 无严重问题，单一 h1、标题不跳级，跳过链接可用`, async ({ page }) => {
    const path = await resolvePath(page, target)
    await gotoReady(page, path, target.status)
    await expectSkipLinkWorks(page)
    expect(headingIssues(await readHeadings(page)), '标题结构').toEqual([])
    await expectNoBlockingViolations(page, target.name)
  })
}

test.describe('无障碍：各类页面', () => {
  for (const target of PAGES) pageTest(target)
})

test.describe('无障碍：404 页面', () => {
  // 404 状态码本身会让浏览器在控制台记一条资源加载失败
  test.use({ allowedConsoleErrors: [/status of 404/] })
  for (const target of NOT_FOUND_PAGES) pageTest(target)
})

test.describe('无障碍：键盘操作抽查', () => {
  test('头部大菜单：回车展开，Tab 进出菜单链接（焦点从不停在隐藏的焦点代理上），Esc 收起并回到触发按钮', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '桌面端专属（移动端为菜单抽屉）')
    await gotoReady(page, '/')
    const trigger = page.getByRole('banner').getByRole('button', { name: '专业课程' })
    await tabTo(page, trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const contentId = await trigger.getAttribute('aria-controls')
    expect(contentId, '展开后触发按钮通过 aria-controls 指向菜单内容').toBeTruthy()
    const content = page.locator(`[id="${contentId}"]`)
    const links = content.getByRole('link')
    await expect(links.first()).toBeVisible()
    await expectNoBlockingViolations(page, '大菜单展开')

    // 触发按钮 → Tab：进入菜单内容的第一个链接
    await page.keyboard.press('Tab')
    await expect(links.first()).toBeFocused()
    // 第一个链接 → Shift+Tab：经焦点代理回到触发按钮（菜单保持展开），再 Tab 回到第一个链接
    await page.keyboard.press('Shift+Tab')
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Tab')
    await expect(links.first()).toBeFocused()
    // 菜单内容的最后一个链接 → Tab：离开菜单内容，落到下一个导航项（不停在焦点代理上）
    const last = links.last()
    await tabTo(page, last)
    await page.keyboard.press('Tab')
    expect(await focusIsInside(content), 'Tab 应离开菜单内容').toBe(false)
    expect(await focusIsAriaHidden(page), '焦点不应停在 aria-hidden 元素上').toBe(false)
    const nav = page.getByRole('navigation', { name: zh.layout.mainNav })
    expect(await focusIsInside(nav), '焦点应在主导航的下一项上').toBe(true)
    // 下一个导航项 → Shift+Tab：回到菜单内容的最后一个链接
    await page.keyboard.press('Shift+Tab')
    await expect(last).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(content).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('移动端菜单抽屉：回车打开，焦点进入并锁定在抽屉内，Esc 关闭后回到菜单按钮', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, '移动端专属')
    await gotoReady(page, '/')
    const trigger = page.getByRole('button', { name: zh.layout.openMenu })
    await tabTo(page, trigger)
    await page.keyboard.press('Enter')
    const drawer = page.getByRole('dialog', { name: zh.layout.menuTitle })
    await expect(drawer).toBeVisible()
    await expect.poll(() => focusIsInside(drawer), { message: '打开后焦点在抽屉内' }).toBe(true)
    await expectNoBlockingViolations(page, '菜单抽屉')
    await expectFocusTrapped(page, drawer)

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('留资弹窗：键盘打开，焦点锁定；空表单提交给出关联的错误提示并聚焦第一个错误字段；Esc 关闭后焦点归还', async ({
    page,
    isMobile,
  }) => {
    await gotoReady(page, '/')
    // 桌面端：头部“预约试听”；移动端：菜单抽屉里的“预约试听”（抽屉随之关闭，焦点归还给菜单按钮）
    let returnTo: Locator
    if (isMobile) {
      returnTo = page.getByRole('button', { name: zh.layout.openMenu })
      await tabTo(page, returnTo)
      await page.keyboard.press('Enter')
      const drawer = page.getByRole('dialog', { name: zh.layout.menuTitle })
      await expect(drawer).toBeVisible()
      await tabTo(page, drawer.getByRole('button', { name: TRIAL_CTA }))
    } else {
      returnTo = page.getByRole('banner').getByRole('button', { name: TRIAL_CTA })
      await tabTo(page, returnTo)
    }
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: zh.lead.dialogTitle })
    await expect(dialog).toBeVisible()
    await expect.poll(() => focusIsInside(dialog), { message: '打开后焦点在弹窗内' }).toBe(true)
    await expectNoBlockingViolations(page, '留资弹窗')
    await expectFocusTrapped(page, dialog)

    // 空表单：Tab 到提交按钮回车，只做前端校验（不会提交线索）
    await tabTo(page, dialog.getByRole('button', { name: zh.lead.submit }), 30)
    await page.keyboard.press('Enter')
    const invalid = dialog.locator('[aria-invalid="true"]')
    await expect(invalid.first()).toBeFocused()
    for (const field of await invalid.all()) {
      const describedBy = await field.getAttribute('aria-describedby')
      expect(describedBy, '出错的字段应通过 aria-describedby 关联错误信息').toBeTruthy()
      for (const id of describedBy!.split(/\s+/)) {
        await expect(page.locator(`[id="${id}"]`)).not.toBeEmpty()
      }
    }
    await expectNoBlockingViolations(page, '留资弹窗（校验错误）')

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(returnTo).toBeFocused()
  })

  test('作品灯箱：Tab 到缩略图回车打开，← / → 切换，焦点锁定，Esc 关闭后回到缩略图', async ({
    page,
  }) => {
    await gotoReady(page, '/works')
    const href = await page
      .getByRole('main')
      .locator('a[href*="/works/"]')
      .filter({ hasText: GALLERY_WORK })
      .first()
      .getAttribute('href')
    expect(href, `作品列表第一页应有种子作品 ${GALLERY_WORK}`).toBeTruthy()
    await gotoReady(page, href!)

    await skipToMain(page)
    const thumbs = page
      .getByRole('list', { name: zh.works.detail.galleryLabel })
      .getByRole('button')
    expect(await thumbs.count(), '作品集应有多张图').toBeGreaterThan(2)
    const opener = thumbs.nth(1)
    await tabTo(page, opener, 30)
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: GALLERY_WORK })
    await expect(dialog).toBeVisible()
    const counter = dialog.locator('[aria-live] [aria-hidden="true"]')
    await expect(counter).toHaveText(/^2 \/ \d+$/)
    await expect.poll(() => focusIsInside(dialog), { message: '打开后焦点在灯箱内' }).toBe(true)
    await page.keyboard.press('ArrowRight')
    await expect(counter).toHaveText(/^3 \/ \d+$/)
    await page.keyboard.press('ArrowLeft')
    await expect(counter).toHaveText(/^2 \/ \d+$/)
    await expectNoBlockingViolations(page, '灯箱')
    await expectFocusTrapped(page, dialog)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('首页轮播：焦点进入其它张时切换到该张；Tab 到控件回车切换并播报；暂停 / 播放可用键盘操作', async ({
    page,
    isMobile,
  }) => {
    const t = zh.home.top.hero
    await gotoReady(page, '/')
    const carousel = page.getByRole('region', { name: t.label })
    const dots = carousel.getByRole('group', { name: t.dotsLabel }).getByRole('button')
    const total = await dots.count()
    expect(total, '种子数据的轮播应有多张').toBeGreaterThan(1)
    const currentDot = async () =>
      dots.evaluateAll((buttons) => buttons.findIndex((b) => b.getAttribute('aria-current')))

    // 跳过头部后第一个焦点是第 1 张的按钮；再按 Tab 到第 2 张的按钮，轮播随焦点切到第 2 张，按钮在可视区域内
    await skipToMain(page)
    await page.keyboard.press('Tab')
    const slideName = (n: number) => formatMessage(t.slideLabel, { index: n, total })
    const slide = (n: number) => carousel.getByRole('group', { name: slideName(n), exact: true })
    expect(await focusIsInside(slide(1)), '第一个焦点在第 1 张内').toBe(true)
    await page.keyboard.press('Tab')
    expect(await focusIsInside(slide(2)), '第二个焦点在第 2 张内').toBe(true)
    await expect.poll(currentDot).toBe(1)
    await expect(page.locator(':focus')).toBeInViewport({ ratio: 1 })

    // 暂停 / 播放（减少动态效果时默认不自动播放）
    const play = carousel.getByRole('button', { name: t.play })
    await tabTo(page, play, 20)
    await page.keyboard.press('Enter')
    const pause = carousel.getByRole('button', { name: t.pause })
    await expect(pause).toBeFocused()
    await page.keyboard.press('Space')
    await expect(play).toBeFocused()

    // 圆点：回车切到对应的一张并播报
    const lastDot = dots.nth(total - 1)
    await tabTo(page, lastDot, 20)
    await page.keyboard.press('Enter')
    await expect.poll(currentDot).toBe(total - 1)
    const live = carousel.locator('[aria-live="polite"]').last()
    await expect(live).toContainText(slideName(total))

    // 下一张（首尾环绕）；移动端张数多时箭头隐藏，只验证桌面端
    const next = carousel.getByRole('button', { name: t.next })
    if (!isMobile || (await next.isVisible())) {
      await tabTo(page, next, 10)
      await page.keyboard.press('Enter')
      await expect.poll(currentDot).toBe(0)
      await expect(live).toContainText(slideName(1))
    }
    await expectNoBlockingViolations(page, '首页轮播（键盘操作后）')
  })

  test('职业测试：全程键盘答题，焦点随换屏移动；答题页与结果页无严重问题、标题结构正确', async ({
    page,
  }) => {
    await gotoReady(page, '/quiz')
    await skipToMain(page)
    await tabTo(page, page.getByRole('main').getByRole('button', { name: /开始/ }).first(), 20)
    await page.keyboard.press('Enter')

    const radios = page.getByRole('radio')
    const progress = page.getByRole('progressbar')
    await expect(radios.first()).toBeFocused()
    const total = Number(
      /\/\s*(\d+)/.exec((await progress.getAttribute('aria-valuetext')) ?? '')?.[1],
    )
    expect(total, '题目数量').toBeGreaterThan(1)
    await expectNoBlockingViolations(page, '答题页')
    expect(headingIssues(await readHeadings(page)), '答题页标题结构').toEqual([])

    // 每题：↓ 选中第二个选项，回车进入下一题；换题后焦点回到选项上
    for (let n = 1; n <= total; n++) {
      await expect(progress).toHaveAttribute('aria-valuetext', new RegExp(`第 ${n} / ${total} 题`))
      await expect(radios.first()).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(radios.nth(1)).toBeChecked()
      await page.keyboard.press('Enter')
    }

    // 结果页：焦点移到结果标题上（读屏从结果开始朗读）
    await expect(progress).toHaveCount(0)
    const focusedHeading = page.locator(':focus')
    await expect(focusedHeading).toHaveRole('heading')
    await expectNoBlockingViolations(page, '测试结果页')
    expect(headingIssues(await readHeadings(page)), '结果页标题结构').toEqual([])
  })

  test('教程弹窗：键盘打开免费与需留资的教程，焦点锁定，Esc 关闭后回到卡片按钮', async ({
    page,
  }) => {
    await gotoReady(page, '/tutorials')
    await skipToMain(page)
    const cards = page.getByRole('main').locator('article')
    const gated = zh.tutorials.card.gated
    const openers = [
      cards
        .filter({ hasNotText: gated })
        .getByRole('button', { name: /^观看教程：/ })
        .first(),
      cards
        .filter({ hasText: gated })
        .getByRole('button', { name: /^观看教程：/ })
        .first(),
    ]

    for (const [index, opener] of openers.entries()) {
      const label = index === 0 ? '免费教程弹窗' : '需留资教程弹窗'
      await tabTo(page, opener)
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect
        .poll(() => focusIsInside(dialog), { message: `${label}：打开后焦点在弹窗内` })
        .toBe(true)
      if (index === 1) await expect(dialog.getByRole('textbox').first()).toBeVisible()
      await expectNoBlockingViolations(page, label)
      await expectFocusTrapped(page, dialog)

      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(opener).toBeFocused()
    }
  })
})
