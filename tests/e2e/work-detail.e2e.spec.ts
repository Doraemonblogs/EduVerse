import type { Locator, Page } from '@playwright/test'
import { getPayload } from 'payload'

import { formatCohortDate, toBeijingIsoDate } from '../../src/lib/course/format'
import config from '../../src/payload.config.js'
import type { Course, Discipline, Media, Software, Work } from '../../src/payload-types'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 作品详情 /works/[id]。内容来自种子数据（scripts/seed/data/works.ts）：
 * - 《机甲少女·澜》角色建模：没有视频，作品集 4 张图（灯箱序列含封面共 5 张）；
 * - 《灯塔守望者》角色动画短片：外部播放器视频（哔哩哔哩占位地址）。
 * 作品 ID 每次重置种子都会变，按作品名从数据库查询；期望值也从数据库读取（与页面同一个开发库）。
 * 提交线索的用例用 leadNamespace('work-detail', …) 取本文件专属的手机号与模拟 IP，结束后清理。
 */

const GALLERY_WORK = '《机甲少女·澜》角色建模'
const VIDEO_WORK = '《灯塔守望者》角色动画短片'
const PLAYER_HOST = 'player.bilibili.com'

type WorkFacts = {
  work: Work
  discipline: Discipline
  course: Course
  software: Software[]
  gallery: { image: Media; caption: string | null }[]
  ctaTitle: string
}

async function readWork(title: string): Promise<WorkFacts> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'works',
    where: { title: { equals: title } },
    depth: 1,
    limit: 1,
    pagination: false,
  })
  const work = docs[0]
  if (
    !work ||
    typeof work.discipline !== 'object' ||
    !work.course ||
    typeof work.course !== 'object'
  ) {
    throw new Error(`种子数据缺少作品 ${title}`)
  }
  const settings = await payload.findGlobal({ slug: 'work-pages', depth: 0 })
  return {
    work,
    discipline: work.discipline,
    course: work.course,
    software: (work.software ?? []).filter((item): item is Software => typeof item === 'object'),
    gallery: (work.gallery ?? []).flatMap((entry) =>
      typeof entry.image === 'object'
        ? [{ image: entry.image, caption: entry.caption ?? null }]
        : [],
    ),
    ctaTitle: settings.detail?.ctaTitle || '想做出这样的作品？',
  }
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

/** 灯箱触发按钮水合前不可用：以主媒体区的按钮可用确认页面已接管（页面级留资上下文也已写入） */
async function waitForHydration(page: Page, name: RegExp) {
  await expect(page.getByRole('button', { name }).first()).toBeEnabled()
}

/**
 * 键盘聚焦后焦点描边完整可见：描边画在元素外侧（outline-offset），
 * 每一层裁切内容的祖先（overflow 不是 visible；页面滚动容器 html / body 除外）的内边距盒都要把“元素 + 描边”整个包住。
 */
async function expectFocusRingVisible(page: Page, target: Locator) {
  await expect(target).toBeEnabled()
  // 先按一次 Tab 进入键盘操作模式：随后脚本移动焦点也会命中 :focus-visible
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
      const left = box.left + node.clientLeft
      const top = box.top + node.clientTop
      if (
        rect.left - extent < left - 0.5 ||
        rect.top - extent < top - 0.5 ||
        rect.right + extent > left + node.clientWidth + 0.5 ||
        rect.bottom + extent > top + node.clientHeight + 0.5
      ) {
        clippedBy.push(node.className)
      }
    }
    return {
      focusVisible: el.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      clippedBy,
    }
  })
  expect(ring.focusVisible, '键盘聚焦应命中 :focus-visible').toBe(true)
  expect(ring.outlineStyle).not.toBe('none')
  expect(ring.outlineWidth).toBeGreaterThan(0)
  expect(ring.clippedBy, '焦点描边不应被外层容器裁切').toEqual([])
}

/** 灯箱当前的序号（可见文字；读屏另有“第 N 张，共 M 张”） */
const counter = (page: Page) => page.getByRole('dialog').locator('[aria-live] [aria-hidden="true"]')

test.describe('作品详情', () => {
  test('信息与链接：面包屑、作品名、化名说明、专业方向与课程链接、软件、发布时间', async ({
    page,
  }) => {
    const { work, discipline, course, software } = await readWork(GALLERY_WORK)
    const response = await page.goto(`/works/${work.id}`)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(work.title)
    await expect(page).toHaveTitle(new RegExp(work.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/works/${work.id}$`),
    )
    if (work.description) {
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        work.description,
      )
    }

    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByRole('link', { name: '学员作品' })).toHaveAttribute(
      'href',
      /\/works$/,
    )
    await expect(breadcrumbs.getByText(work.title, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    const hero = page.getByRole('region', { name: work.title })
    await expect(
      hero.getByText(`${work.author.displayName} · ${work.author.cohortLabel}`, { exact: true }),
    ).toBeVisible()
    await expect(hero.getByText('作者署名为学员化名')).toBeVisible()

    const fact = (label: string) =>
      hero.locator('dl > div').filter({ has: page.locator('dt', { hasText: label }) })
    const disciplineLink = fact('专业方向').getByRole('link', { name: discipline.name })
    await expect(disciplineLink).toHaveAttribute('href', new RegExp(`/majors/${discipline.slug}$`))
    const courseLink = fact('所属课程').getByRole('link', { name: course.title })
    await expect(courseLink).toHaveAttribute('href', new RegExp(`/courses/${course.slug}$`))
    // 课程链接可访问
    const courseHref = await courseLink.getAttribute('href')
    expect((await page.request.get(courseHref ?? '')).status()).toBe(200)

    expect(software.length, '种子作品应关联软件').toBeGreaterThan(0)
    await expect(fact('所用软件').getByRole('listitem')).toHaveText(software.map((s) => s.name))
    await expect(fact('所用软件').getByRole('link')).toHaveCount(0)
    await expect(fact('发布时间').locator('time')).toHaveText(formatCohortDate(work.publishedAt))
    await expect(fact('发布时间').locator('time')).toHaveAttribute(
      'datetime',
      toBeijingIsoDate(work.publishedAt),
    )

    // 首屏大图是唯一预加载、不懒加载的图片；缩略图与相关作品都懒加载
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1)
    const eager = await page
      .locator('main img')
      .evaluateAll((imgs) => imgs.filter((img) => img.getAttribute('loading') !== 'lazy').length)
    expect(eager, '只有首屏大图立即加载').toBe(1)
  })

  test('结构化数据：CreativeWork（化名作者、专业方向、绝对图片地址）与 BreadcrumbList', async ({
    page,
  }) => {
    const { work, discipline } = await readWork(GALLERY_WORK)
    await page.goto(`/works/${work.id}`)
    const nodes = await readJsonLd(page)

    const creative = nodes.find((node) => node['@type'] === 'CreativeWork')
    expect(creative, '页面应包含 CreativeWork').toBeDefined()
    expect(creative).toMatchObject({
      name: work.title,
      url: expect.stringMatching(new RegExp(`^https?://.+/works/${work.id}$`)),
      image: expect.stringMatching(/^https?:\/\/.+\/api\/media\/file\//),
      creator: { '@type': 'Person', name: work.author.displayName },
      genre: discipline.name,
      dateCreated: toBeijingIsoDate(work.publishedAt),
    })

    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb!.itemListElement).toHaveLength(3)
  })

  test('灯箱：键盘打开缩略图，→ / ← 切换并更新序号，Esc 关闭后焦点回到缩略图', async ({ page }) => {
    const { work, gallery } = await readWork(GALLERY_WORK)
    expect(gallery.length, '种子作品应有 4 张作品集图片').toBe(4)
    const total = gallery.length + 1
    await page.goto(`/works/${work.id}`)
    await waitForHydration(page, /^查看大图/)

    const thumbs = page.getByRole('list', { name: '作品图集' }).getByRole('button')
    await expect(thumbs).toHaveCount(total)
    const opener = thumbs.nth(1)
    await opener.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: work.title })
    await expect(dialog).toBeVisible()
    await expect(counter(page)).toHaveText(`2 / ${total}`)
    await expect(dialog.getByText(`第 2 张，共 ${total} 张`)).toBeAttached()
    await expect(dialog.locator('figcaption')).toHaveText(gallery[0]!.caption ?? '')
    await expect(dialog.getByRole('img', { name: gallery[0]!.image.alt })).toBeVisible()
    // 焦点锁定在灯箱内
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)

    await page.keyboard.press('ArrowRight')
    await expect(counter(page)).toHaveText(`3 / ${total}`)
    await expect(dialog.getByRole('img', { name: gallery[1]!.image.alt })).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(counter(page)).toHaveText(`1 / ${total}`)
    // 首尾循环
    await page.keyboard.press('ArrowLeft')
    await expect(counter(page)).toHaveText(`${total} / ${total}`)
    await dialog.getByRole('button', { name: '下一张' }).click()
    await expect(counter(page)).toHaveText(`1 / ${total}`)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('灯箱：点击主图从第 1 张打开，关闭按钮关闭；减少动态效果时不播放动画', async ({ page }) => {
    const { work } = await readWork(GALLERY_WORK)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/works/${work.id}`)
    await waitForHydration(page, /^查看大图/)

    const stage = page.getByRole('button', { name: /^查看大图/ })
    await stage.click()
    const dialog = page.getByRole('dialog', { name: work.title })
    await expect(dialog).toBeVisible()
    await expect(counter(page)).toHaveText('1 / 5')
    const duration = await dialog.evaluate((node) => getComputedStyle(node).animationDuration)
    expect(Number.parseFloat(duration), '减少动态效果时动画时长接近 0').toBeLessThan(0.001)
    await expectNoHorizontalOverflow(page)

    await dialog.getByRole('button', { name: '关闭大图' }).click()
    await expect(dialog).toBeHidden()
    await expect(stage).toBeFocused()
  })

  test('主媒体区的大图、缩略图与视频播放按钮：键盘聚焦时焦点描边完整可见（不被外层容器裁切）', async ({
    page,
  }) => {
    const [gallery, video] = await Promise.all([readWork(GALLERY_WORK), readWork(VIDEO_WORK)])
    await page.goto(`/works/${gallery.work.id}`)
    await expectFocusRingVisible(page, page.getByRole('button', { name: /^查看大图/ }))
    await expectFocusRingVisible(
      page,
      page.getByRole('list', { name: '作品图集' }).getByRole('button').first(),
    )

    // 播放按钮铺满带圆角的容器：容器裁切时描边整圈都看不到
    await page.goto(`/works/${video.work.id}`)
    await expectFocusRingVisible(
      page,
      page.getByRole('button', { name: `播放视频：${video.work.title}` }),
    )
  })

  test.describe('外部播放器', () => {
    test.use({ allowedThirdPartyHosts: [PLAYER_HOST] })

    test('首屏不请求第三方；点击播放后才插入白名单域名的播放器 iframe', async ({ page }) => {
      const { work } = await readWork(VIDEO_WORK)
      expect(work.video?.kind, '种子作品应有外部播放器视频').toBe('embed')
      const embedUrl = work.video?.embedUrl ?? ''
      // 不真的访问外网：拦截播放器地址，返回空页面
      await page.route(`https://${PLAYER_HOST}/**`, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<!doctype html><title>player</title>',
        }),
      )
      const thirdParty: string[] = []
      page.on('request', (request) => {
        if (new URL(request.url()).host === PLAYER_HOST) thirdParty.push(request.url())
      })

      await page.goto(`/works/${work.id}`)
      const play = page.getByRole('button', { name: `播放视频：${work.title}` })
      await expect(play).toBeEnabled()
      await page.waitForLoadState('networkidle')
      expect(thirdParty, '点击播放前不应请求第三方').toEqual([])
      await expect(page.locator('iframe')).toHaveCount(0)
      await expect(page.getByText('点击播放后才会加载播放器')).toBeVisible()

      const requested = page.waitForRequest((request) => request.url() === embedUrl)
      await play.click()
      await requested
      const frame = page.locator('iframe')
      await expect(frame).toHaveCount(1)
      await expect(frame).toHaveAttribute('src', embedUrl)
      expect(new URL(embedUrl).host).toBe(PLAYER_HOST)
      await expect(frame).toHaveAttribute('title', `${work.title}（视频播放器）`)
      await expect(frame).toHaveAttribute('allow', 'fullscreen')
      await expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
      await expect(frame).toBeFocused()
      await expect(play).toHaveCount(0)

      // 有视频时作品图片仍可从缩略图打开灯箱
      await page.getByRole('list', { name: '作品图集' }).getByRole('button').first().click()
      await expect(page.getByRole('dialog', { name: work.title })).toBeVisible()
    })
  })

  test('相关作品：排除本作品，最多 8 件，链接到各自详情', async ({ page }) => {
    const { work } = await readWork(GALLERY_WORK)
    await page.goto(`/works/${work.id}`)
    const related = page.getByRole('region', { name: '相关作品' })
    await related.scrollIntoViewIfNeeded()
    const links = related.getByRole('listitem').getByRole('link')
    const hrefs = await links.evaluateAll((items) => items.map((a) => a.getAttribute('href') ?? ''))
    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.length).toBeLessThanOrEqual(8)
    for (const href of hrefs) expect(href).toMatch(/\/works\/\d+$/)
    expect(
      hrefs.some((href) => href.endsWith(`/works/${work.id}`)),
      '不应包含本作品',
    ).toBe(false)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    await expect(related.getByRole('link', { name: /查看全部作品/ })).toHaveAttribute(
      'href',
      /\/works$/,
    )

    await links.first().click()
    await expect(page).toHaveURL(new RegExp(`${hrefs[0]}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('从行动号召提交线索：记录位置 work_detail、课程与专业', async ({ page }, testInfo) => {
    const ns = leadNamespace('work-detail', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const { work, discipline, course, ctaTitle } = await readWork(GALLERY_WORK)
    expect(course.id, '课程与专业的 ID 相同时，断言发现不了两者被传反').not.toBe(discipline.id)
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto(`/works/${work.id}`)
    try {
      await waitForHydration(page, /^查看大图/)
      const cta = page.getByRole('region', { name: ctaTitle })
      await cta.getByRole('button', { name: '预约试听' }).click()

      const dialog = page.getByRole('dialog', { name: '预约免费试听' })
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('input[name="position"]')).toHaveValue('work_detail')
      await expect(dialog.locator('input[name="course"]')).toHaveValue(String(course.id))
      await expect(dialog.getByLabel('意向专业')).toHaveValue(String(discipline.id))

      await dialog.getByLabel('姓名').fill('作品页测试')
      await dialog.getByLabel('手机号').fill(phone)
      await dialog.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await dialog.getByRole('button', { name: '立即预约' }).click()
      await expect(dialog.getByRole('heading', { name: '提交成功' })).toBeVisible()

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '作品页测试',
        intent: 'trial',
        discipline: discipline.id,
        source: { position: 'work_detail' },
        context: { course: course.id },
        client: { ip },
      })
      expect(lead?.source?.pageUrl).toContain(`/works/${work.id}`)
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('版式：桌面端主媒体在左、信息栏在右；移动端作品名在主媒体之前；无横向滚动', async ({
    page,
    isMobile,
  }) => {
    const { work } = await readWork(GALLERY_WORK)
    await page.goto(`/works/${work.id}`)
    const title = await page.getByRole('heading', { level: 1 }).boundingBox()
    const stage = await page.getByRole('button', { name: /^查看大图/ }).boundingBox()
    expect(title && stage).toBeTruthy()
    if (isMobile) {
      expect(title!.y + title!.height, '移动端作品名在主媒体之前').toBeLessThanOrEqual(stage!.y)
    } else {
      expect(title!.x, '桌面端作品名在右栏').toBeGreaterThanOrEqual(stage!.x + stage!.width)
    }
    await expectNoHorizontalOverflow(page)
  })

  test.describe('不存在的作品', () => {
    // 浏览器会把 404 响应本身记录为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('格式不合法或不存在的 ID 返回 404', async ({ page }) => {
      for (const id of ['abc', '0', '012', '2147483648', '999999999']) {
        const response = await page.goto(`/works/${id}`)
        expect(response?.status(), id).toBe(404)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面不存在或已下线')
      }
    })
  })
})
