import { test as base, expect } from '@playwright/test'

/**
 * 扩展的 test，每个用例结束时自动断言：
 * 1. 浏览器控制台没有报错、没有未捕获异常；
 * 2. 页面没有请求任何第三方域名（面向中国大陆用户，禁止依赖境外服务 / 外链资源）。
 * 个别用例需要放行时，用 test.use({ allowedConsoleErrors: [...] })
 * 或 test.use({ allowedThirdPartyHosts: [...] })。
 */
type Fixtures = {
  allowedConsoleErrors: RegExp[]
  /**
   * 允许请求的第三方主机（URL 的 host，含端口时写上端口），默认空。
   * 只给“点击后才加载”的场景用，如作品详情点击播放后插入的外部播放器
   * （test.use({ allowedThirdPartyHosts: ['player.bilibili.com'] })，并用 page.route 拦截返回空页面，
   * 测试不真的访问外网）。首屏不请求第三方的断言要在点击前单独做。
   */
  allowedThirdPartyHosts: string[]
  consoleErrors: string[]
  externalRequests: string[]
}

export const test = base.extend<Fixtures>({
  allowedConsoleErrors: [[], { option: true }],
  allowedThirdPartyHosts: [[], { option: true }],

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

  externalRequests: [
    async ({ page, baseURL, allowedThirdPartyHosts }, use) => {
      const siteHost = new URL(baseURL ?? 'http://localhost').host
      const external: string[] = []
      page.on('request', (request) => {
        const url = new URL(request.url())
        if (!url.protocol.startsWith('http')) return
        if (url.host === siteHost || allowedThirdPartyHosts.includes(url.host)) return
        external.push(request.url())
      })
      await use(external)
      expect(external, '页面不应请求第三方域名').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
