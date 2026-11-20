import { expect, test } from './fixtures'

test.describe('前台基础', () => {
  test('首页可访问，语言为简体中文', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('包含百度移动适配声明', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="applicable-device"]')).toHaveAttribute(
      'content',
      'pc,mobile',
    )
  })

  test('“跳到主要内容”链接可通过键盘使用', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: '跳到主要内容' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
  })

  test.describe('不存在的页面', () => {
    // 浏览器会把 404 响应本身记录为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('返回 404 状态码和中文提示页', async ({ page }) => {
      const response = await page.goto('/this-page-does-not-exist')
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面不存在或已下线')
      await expect(page.getByRole('link', { name: '返回首页' })).toBeVisible()
    })

    test('生产环境默认不开放设计规范页', async ({ page }) => {
      test.skip(process.env.ENABLE_STYLEGUIDE === 'true', '已显式开放设计规范页')
      const response = await page.goto('/styleguide')
      expect(response?.status()).toBe(404)
    })
  })
})
