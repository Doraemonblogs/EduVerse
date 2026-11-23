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

test.describe('全站框架', () => {
  test('桌面端：专业课程大菜单按专业方向列出课程', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属')
    await page.goto('/')
    await page.getByRole('button', { name: '专业课程' }).hover()
    const menu = page.getByRole('navigation', { name: '主导航' })
    await expect(menu.getByRole('link', { name: '三维动画设计长期就业班' })).toBeVisible()
    await expect(menu.locator('a[href$="/majors/arch-viz"]')).toBeVisible()
    await expect(menu.getByRole('link', { name: '查看全部课程 →' })).toHaveAttribute(
      'href',
      /\/courses$/,
    )
    // 键盘：Esc 关闭大菜单
    await page.keyboard.press('Escape')
    await expect(menu.getByRole('link', { name: '三维动画设计长期就业班' })).toBeHidden()
  })

  test.describe('大菜单按钮的键盘焦点', () => {
    // 课程列表页在后续里程碑上线，目前访问会得到 404；浏览器会把 404 响应记为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('键盘聚焦“专业课程”按钮时有可见的焦点描边（课程页上文字本就是强调色，同样有描边）', async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, '桌面端专属')
      for (const path of ['/', '/courses']) {
        await page.goto(path)
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
