import { existsSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

/** 按指定 NODE_ENV 重新加载 next.config（模块顶层读取环境变量） */
async function loadConfig(nodeEnv: string) {
  vi.resetModules()
  vi.stubEnv('NODE_ENV', nodeEnv)
  const mod = await import('../../next.config')
  return mod.default
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('next.config 服务端缓存上限', () => {
  it('生产环境使用 cache-handler.mjs（404 页面不写盘），内存 LRU 有上限', async () => {
    const config = await loadConfig('production')
    expect(config.cacheHandler).toMatch(/[/\\]cache-handler\.mjs$/)
    expect(existsSync(config.cacheHandler as string)).toBe(true)
    expect(config.cacheMaxMemorySize).toBe(64 * 1024 * 1024)
    expect(config.images?.maximumDiskCacheSize).toBe(500 * 1000 * 1000)
  })

  it('开发环境沿用 Next 默认的缓存（不影响开发服务器）', async () => {
    const config = await loadConfig('development')
    expect(config.cacheHandler).toBeUndefined()
  })
})
