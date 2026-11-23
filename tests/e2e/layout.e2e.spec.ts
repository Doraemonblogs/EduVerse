import type { Locator, Page } from '@playwright/test'

import { expect, test } from './fixtures'

/** 从页面顶部开始按 Tab，直到焦点落到目标元素上（键盘操作才会命中 :focus-visible） */
async function tabTo(page: Page, target: Locator, maxPresses = 20) {
  for (let i = 0; i < maxPresses; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  await expect(target).toBeFocused()
}

/** 元素实际渲染的宽高（取整到像素） */
async function renderedSize(target: Locator) {
  const box = await target.boundingBox()
  if (!box) throw new Error('元素没有尺寸')
  return { width: Math.round(box.width), height: Math.round(box.height) }
}

test.describe('全站框架', () => {
  test('桌面端：专业课程大菜单按专业方向列出课程', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属')
    await page.goto('/')
    const menu = page.getByRole('navigation', { name: '主导航' })
    // 大菜单靠指针移动打开：水合前的悬停不会生效（开发服务器上水合较慢），移开再悬停直到展开
    await expect(async () => {
      await page.mouse.move(0, 0)
      await page.getByRole('button', { name: '专业课程' }).hover()
      await expect(menu.getByRole('link', { name: '三维动画设计长期就业班' })).toBeVisible({
        timeout: 1_000,
      })
    }).toPass({ timeout: 15_000 })
    await expect(menu.locator('a[href$="/majors/arch-viz"]')).toBeVisible()
    await expect(menu.getByRole('link', { name: '查看全部课程 →' })).toHaveAttribute(
      'href',
      /\/courses$/,
    )
    // 键盘：Esc 关闭大菜单
    await page.keyboard.press('Escape')
    await expect(menu.getByRole('link', { name: '三维动画设计长期就业班' })).toBeHidden()
  })

  test('键盘聚焦“专业课程”按钮时有可见的焦点描边（课程页上文字本就是强调色，同样有描边）', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '桌面端专属')
    for (const path of ['/', '/courses']) {
      // 两个页面都已上线：必须正常返回，不能落到 404 页（404 页同样有头部，会让本用例误通过）
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(200)
      const trigger = page.getByRole('banner').getByRole('button', { name: '专业课程' })
      await tabTo(page, trigger)
      await expect(trigger).toBeFocused()
      const outline = await trigger.evaluate((el) => {
        const style = getComputedStyle(el)
        return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) }
      })
      expect(outline.style, `${path} 上的焦点描边`).not.toBe('none')
      expect(outline.width, `${path} 上的焦点描边宽度`).toBeGreaterThan(0)
    }
  })

  test('桌面悬浮栏：电话详情可以移入查看，按 Esc 关闭', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属')
    await page.goto('/')
    const quick = page.getByRole('complementary', { name: '快捷咨询' })
    await quick.getByRole('link', { name: '电话' }).hover()
    const tooltip = quick.getByRole('tooltip').filter({ hasText: '咨询热线' })
    await expect(tooltip).toBeVisible()

    // 指针从按钮向左移到详情上（经过两者之间的间隙）：详情保持显示
    const box = await tooltip.boundingBox()
    if (!box) throw new Error('详情浮层没有尺寸')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 })
    await expect(tooltip).toBeVisible()

    // 指针不动，按 Esc 关闭
    await page.keyboard.press('Escape')
    await expect(tooltip).toBeHidden()
  })

  test('微信二维码保持正方形：悬浮栏详情 / 移动端弹窗与页脚的二维码都按设定尺寸显示', async ({
    page,
    isMobile,
  }) => {
    // 开发模式下 next/image 发现图片只被 CSS 改了宽或高（变形）时告警；生产构建不输出，此时只靠尺寸断言
    const resized: string[] = []
    page.on('console', (msg) => {
      if (/width or height modified/.test(msg.text())) resized.push(msg.text())
    })
    await page.goto('/')

    // 弹窗 / 浮层要水合后才响应：水合前的点击、悬停不生效，重试直到出现
    if (isMobile) {
      const qr = page.getByRole('dialog').getByRole('img', { name: '课程顾问微信二维码' })
      await expect(async () => {
        await page
          .getByRole('navigation', { name: '快捷咨询' })
          .getByRole('button', { name: '微信' })
          .click()
        await expect(qr).toBeVisible({ timeout: 1_000 })
      }).toPass({ timeout: 15_000 })
      expect(await renderedSize(qr)).toEqual({ width: 192, height: 192 })
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toBeHidden()
    } else {
      // 浮层定位在按钮左侧、按最小内容宽度收缩：二维码不能被压成说明文字的宽度
      const quick = page.getByRole('complementary', { name: '快捷咨询' })
      const qr = quick.getByRole('tooltip').getByRole('img', { name: '课程顾问微信二维码' })
      await expect(async () => {
        await page.mouse.move(0, 0)
        await quick.getByRole('button', { name: '微信' }).hover()
        await expect(qr).toBeVisible({ timeout: 1_000 })
      }).toPass({ timeout: 15_000 })
      expect(await renderedSize(qr)).toEqual({ width: 128, height: 128 })
    }

    const footerQrs = page.getByRole('contentinfo').locator('figure img')
    const seeded = await footerQrs.count()
    expect(seeded, '种子数据的页脚应有二维码').toBeGreaterThan(0)
    await footerQrs.first().scrollIntoViewIfNeeded()
    for (const qr of await footerQrs.all()) {
      expect(await renderedSize(qr)).toEqual({ width: 112, height: 112 })
    }

    // 后台可配置多个二维码：一行放不下时换行，不能被压窄（390px 下 4 个曾被压成 78×112）。
    // 上面的浮层 / 弹窗依赖水合才会打开，此时页面已水合，复制出的节点不会被 React 回收
    await page
      .getByRole('contentinfo')
      .locator('figure')
      .first()
      .evaluate((figure) => {
        for (let i = 0; i < 3; i++) figure.parentElement?.append(figure.cloneNode(true))
      })
    await expect(footerQrs).toHaveCount(seeded + 3)
    for (const qr of await footerQrs.all()) {
      expect(await renderedSize(qr)).toEqual({ width: 112, height: 112 })
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, '多个二维码不应撑出横向滚动').toBe(0)
    expect(resized, '图片不应只被改了宽或高').toEqual([])
  })

  test('桌面端显示右侧悬浮栏，不显示底部操作条', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属')
    await page.goto('/')
    const quick = page.getByRole('complementary', { name: '快捷咨询' })
    await expect(quick.getByRole('button', { name: '在线咨询' })).toBeVisible()
    await expect(quick.getByRole('link', { name: '电话' })).toHaveAttribute('href', /^tel:/)
    await expect(page.getByRole('navigation', { name: '快捷咨询' })).toBeHidden()
  })

  test('移动端：菜单抽屉按专业方向列出课程与校区，可关闭', async ({ page, isMobile }) => {
    test.skip(!isMobile, '移动端专属')
    await page.goto('/')
    await page.getByRole('button', { name: '打开菜单' }).click()
    const drawer = page.getByRole('dialog', { name: '网站导航' })
    await expect(drawer.getByRole('link', { name: '三维动画设计长期就业班' })).toBeVisible()
    await expect(drawer.getByRole('link', { name: '北京海淀' })).toBeVisible()
    await drawer.getByRole('button', { name: '关闭菜单' }).click()
    await expect(drawer).toBeHidden()
  })

  test('移动端显示底部操作条，不显示桌面悬浮栏', async ({ page, isMobile }) => {
    test.skip(!isMobile, '移动端专属')
    await page.goto('/')
    const bar = page.getByRole('navigation', { name: '快捷咨询' })
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('link', { name: '电话' })).toHaveAttribute('href', /^tel:/)
    await expect(page.getByRole('complementary', { name: '快捷咨询' })).toBeHidden()
  })

  test('页脚展示后台配置的备案号、隐私政策与用户协议链接', async ({ page }) => {
    await page.goto('/')
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByText(/京ICP备/)).toBeVisible()
    await expect(footer.getByRole('link', { name: '隐私政策' })).toHaveAttribute(
      'href',
      /\/privacy$/,
    )
    await expect(footer.getByRole('link', { name: '用户协议' })).toHaveAttribute('href', /\/terms$/)
  })

  test('页面没有横向滚动', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
})
