import { beforeEach, describe, expect, it, vi } from 'vitest'

import { siteFallback } from '@/config/site'
import { getPayloadClient } from '@/lib/payload'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => fn,
}))
vi.mock('@/lib/payload', () => ({ getPayloadClient: vi.fn() }))

const { getSiteSettings } = await import('@/lib/data/site')

const findGlobal = vi.fn()

beforeEach(() => {
  findGlobal.mockReset()
  vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal } as unknown as Awaited<
    ReturnType<typeof getPayloadClient>
  >)
})

describe('getSiteSettings', () => {
  it('全新空库（站点设置从未保存）时品牌名兜底为默认品牌名，头部 / 页脚 Logo 不会报错', async () => {
    findGlobal.mockResolvedValue({ id: 1, salaryDisclaimer: '仅供参考' })
    const settings = await getSiteSettings()
    expect(settings.brandName).toBe(siteFallback.name)
  })

  it('后台填写的品牌名原样使用；只有空白时兜底', async () => {
    findGlobal.mockResolvedValue({ id: 1, brandName: '某某学院' })
    expect((await getSiteSettings()).brandName).toBe('某某学院')
    findGlobal.mockResolvedValue({ id: 1, brandName: '   ' })
    expect((await getSiteSettings()).brandName).toBe(siteFallback.name)
  })

  it('不返回第三方脚本相关字段', async () => {
    findGlobal.mockResolvedValue({
      id: 1,
      brandName: '某某学院',
      baiduTongjiId: 'abc',
      baiduSiteVerification: 'code',
      customerService: { enabled: true, scriptUrl: 'https://example.com/a.js' },
    })
    const settings = await getSiteSettings()
    expect(settings).not.toHaveProperty('baiduTongjiId')
    expect(settings).not.toHaveProperty('baiduSiteVerification')
    expect(settings).not.toHaveProperty('customerService')
  })
})
