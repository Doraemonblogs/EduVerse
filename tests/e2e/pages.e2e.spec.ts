import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'

/**
 * 通用页面 /[pageSlug]（pages 集合）。内容来自种子数据 scripts/seed/data/pages.ts。
 */

type BreadcrumbJsonLd = {
  '@type': string
  itemListElement: { '@type': string; position: number; name: string; item: string }[]
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '页面不应出现横向滚动').toBe(0)
}

async function readBreadcrumbJsonLd(page: Page): Promise<BreadcrumbJsonLd | undefined> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
  return scripts
    .map((text) => JSON.parse(text) as BreadcrumbJsonLd)
    .find((data) => data['@type'] === 'BreadcrumbList')
}

const LEGAL_PAGES = [
  { path: '/privacy', title: '隐私政策', heading: '一、我们收集哪些信息' },
  { path: '/terms', title: '用户协议', heading: '一、服务说明' },
] as const

test.describe('通用页面', () => {
  for (const legal of LEGAL_PAGES) {
    test(`${legal.title}：标题、面包屑、正文排版来自后台，正文使用窄版心`, async ({
      page,
      viewport,
    }) => {
      const response = await page.goto(legal.path)
      expect(response?.status()).toBe(200)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(legal.title)
      await expect(page).toHaveTitle(new RegExp(legal.title))
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`${legal.path}$`),
      )

      // 面包屑：首页可点击，当前页不可点击并标注 aria-current
      const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
      await expect(breadcrumbs.getByRole('link', { name: '首页' })).toHaveAttribute('href', /\/$/)
      await expect(breadcrumbs.getByText(legal.title, { exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await expect(breadcrumbs.getByRole('link', { name: legal.title })).toHaveCount(0)

      // 富文本：h2 小标题、草稿提示引用块
      const prose = page.locator('.prose-zh').first()
      await expect(prose.getByRole('heading', { level: 2, name: legal.heading })).toBeVisible()
      await expect(prose.locator('blockquote')).toContainText('正式上线前须经法务审核')

      // 法律文本使用正文版心（736px），移动端扣除左右留白
      const box = await prose.boundingBox()
      expect(box).not.toBeNull()
      const maxWidth = Math.min(736, (viewport?.width ?? 1440) - 32)
      expect(box!.width).toBeLessThanOrEqual(maxWidth + 1)

      await expectNoHorizontalOverflow(page)
    })
  }

  test('面包屑输出 BreadcrumbList 结构化数据（绝对地址）', async ({ page }) => {
    await page.goto('/privacy')
    const data = await readBreadcrumbJsonLd(page)
    expect(data, '页面应包含 BreadcrumbList').toBeDefined()
    expect(data!.itemListElement).toHaveLength(2)
    expect(data!.itemListElement[0]).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      name: '首页',
      item: expect.stringMatching(/^https?:\/\//),
    })
    expect(data!.itemListElement[1]).toMatchObject({
      '@type': 'ListItem',
      position: 2,
      name: '隐私政策',
      item: expect.stringMatching(/^https?:\/\/.+\/privacy$/),
    })
  })

  test('可从页脚进入隐私政策，再经面包屑回到首页', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: '隐私政策' }).click()
    await expect(page).toHaveURL(/\/privacy$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('隐私政策')

    await page
      .getByRole('navigation', { name: '面包屑' })
      .getByRole('link', { name: '首页' })
      .click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('关于我们：数据区块展示数值、名称与口径说明', async ({ page }) => {
    const response = await page.goto('/about')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('关于我们')

    const stats = page.locator('dl').filter({ hasText: '在招课程' })
    await expect(stats).toBeVisible()
    await expect(stats.getByText('24 门', { exact: true })).toBeVisible()
    await expect(stats.getByText('在招课程', { exact: true })).toBeVisible()

    // 每一项都有口径与统计时间（广告法）
    const notes = stats.getByText(/截至 2026 年 11 月/)
    await expect(notes).toHaveCount(4)

    // 第一项：大号数值在上，名称居中，小号说明在最下方
    const value = stats.getByText('8 个', { exact: true })
    const label = stats.getByText('专业方向', { exact: true })
    const note = notes.first()
    await expect(note).toBeVisible()
    const fontSize = (el: Element) => Number.parseFloat(getComputedStyle(el).fontSize)
    const noteSize = await note.evaluate(fontSize)
    const valueSize = await value.evaluate(fontSize)
    expect(noteSize).toBeLessThan(14)
    expect(valueSize).toBeGreaterThan(noteSize * 2)

    const valueBox = await value.boundingBox()
    const labelBox = await label.boundingBox()
    const noteBox = await note.boundingBox()
    expect(valueBox!.y, '数值在名称上方').toBeLessThan(labelBox!.y)
    expect(noteBox!.y, '说明在名称下方').toBeGreaterThan(labelBox!.y)

    await expectNoHorizontalOverflow(page)
  })

  test('关于我们：时间线与图文区块', async ({ page, isMobile }) => {
    await page.goto('/about')

    const timeline = page.getByRole('list').filter({ hasText: '在北京海淀成立' })
    await expect(timeline.getByRole('listitem')).toHaveCount(5)
    await expect(timeline.getByText('2018', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: '在北京海淀成立' })).toBeVisible()

    const heading = page.getByRole('heading', { level: 2, name: '在项目中学习，在讲评中成长' })
    const image = page.getByRole('img', { name: '在项目中学习，在讲评中成长（占位图）' })
    await image.scrollIntoViewIfNeeded()
    await expect(image).toBeVisible()
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => (el.complete ? el.naturalWidth : 0)))
      .toBeGreaterThan(0)

    const imageBox = await image.boundingBox()
    const headingBox = await heading.boundingBox()
    if (isMobile) {
      expect(imageBox!.y, '移动端图片在文字上方').toBeLessThan(headingBox!.y)
    } else {
      expect(imageBox!.x, '桌面端按后台设置图片在右侧').toBeGreaterThan(headingBox!.x)
    }
  })

  test('关于我们：行动号召区块内嵌页内留资表单，前端校验必填项', async ({ page }) => {
    await page.goto('/about')
    const cta = page.getByRole('region', { name: '来校区看看，或先听一节课' })
    await expect(cta).toBeVisible()
    await expect(cta.getByText(/课程顾问会根据你的兴趣与时间/)).toBeVisible()

    await expect(cta.getByLabel('姓名')).toBeVisible()
    await expect(cta.getByLabel('手机号')).toBeVisible()
    await expect(cta.getByLabel('意向专业')).toBeVisible()
    await expect(cta.getByLabel('所在城市')).toBeVisible()
    await expect(cta.getByLabel('留言（选填）')).toBeVisible()
    await expect(cta.getByRole('checkbox')).toBeVisible()
    await expect(cta.getByRole('link', { name: '《隐私政策》' })).toHaveAttribute(
      'href',
      /\/privacy$/,
    )

    // 意向类型与位置标识来自区块配置
    await expect(cta.locator('input[name="intent"]')).toHaveValue('trial')
    await expect(cta.locator('input[name="position"]')).toHaveValue('page_cta')

    // 不填写直接提交：前端校验拦截，不会产生线索
    await cta.getByRole('button', { name: '预约试听' }).click()
    await expect(cta.getByText('请填写姓名')).toBeVisible()
    await expect(cta.getByText('请先阅读并同意《隐私政策》')).toBeVisible()
    await expect(cta.getByLabel('姓名')).toBeFocused()

    await expectNoHorizontalOverflow(page)
  })

  test('页面以行动号召区块收尾时，不再重复页脚的行动号召横幅', async ({ page }) => {
    const footerCta = page.locator('[data-footer-cta]')
    await page.goto('/about')
    await expect(page.getByRole('region', { name: '来校区看看，或先听一节课' })).toBeVisible()
    await expect(footerCta).toBeHidden()

    // 正文页没有行动号召区块：页脚横幅照常显示
    await page.goto('/privacy')
    await expect(footerCta).toBeVisible()
  })

  test('联系我们：正文与咨询表单（按钮文字、意向类型来自后台）', async ({ page }) => {
    const response = await page.goto('/contact')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('联系我们')
    await expect(page.getByRole('heading', { level: 2, name: '咨询热线' })).toBeVisible()

    const cta = page.getByRole('region', { name: '有问题？直接问课程顾问' })
    await expect(cta.getByRole('button', { name: '咨询顾问' })).toBeVisible()
    await expect(cta.locator('input[name="intent"]')).toHaveValue('consult')

    await expectNoHorizontalOverflow(page)
  })

  test.describe('不存在的页面', () => {
    // 浏览器会把 404 响应本身记录为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('未发布或不存在的 slug 返回 404 和中文提示页', async ({ page }) => {
      const response = await page.goto('/no-such-page')
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面不存在或已下线')
      await expect(page.getByRole('link', { name: '返回首页', exact: true })).toBeVisible()
    })

    test('不符合 slug 格式的路径返回 404', async ({ page }) => {
      const response = await page.goto('/About')
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面不存在或已下线')
    })
  })
})
