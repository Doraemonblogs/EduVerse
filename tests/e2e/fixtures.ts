import { test as base, expect } from '@playwright/test'

/**
 * 扩展的 test：自动收集浏览器控制台错误与未捕获异常，用例结束时断言为空。
 * 个别用例需要放行时，可在 test.use({ allowedConsoleErrors: [/pattern/] }) 中声明。
 */
type Fixtures = {
  allowedConsoleErrors: RegExp[]
  consoleErrors: string[]
}

export const test = base.extend<Fixtures>({
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (!allowedConsoleErrors.some((re) => re.test(text))) errors.push(text)
      })
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
      await use(errors)
      expect(errors, '浏览器控制台不应有报错').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
