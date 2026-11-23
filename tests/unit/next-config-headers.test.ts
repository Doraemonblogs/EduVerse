import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server'
import { describe, expect, it } from 'vitest'

import nextConfig, { FRONTEND_CACHE_CONTROL, MEDIA_CACHE_CONTROL } from '../../next.config'

/** 按 next.config 的 headers() 计算某个地址得到的响应头 */
async function headersFor(path: string): Promise<Headers> {
  const response = await unstable_getResponseFromNextConfig({
    url: `https://www.example.com${path}`,
    nextConfig,
  })
  return response.headers
}

describe('next.config 响应头', () => {
  it('前台页面：Cache-Control 含 no-transform（百度不转码），nginx 不缓冲流式响应', async () => {
    for (const path of [
      '/',
      '/courses',
      '/courses/ui-ux-career',
      '/courses?discipline=3d',
      '/about',
      '/administration',
      '/apis-guide',
      '/sitemap.xml',
    ]) {
      const headers = await headersFor(path)
      expect(headers.get('cache-control'), path).toBe(FRONTEND_CACHE_CONTROL)
      expect(headers.get('x-accel-buffering'), path).toBe('no')
    }
    expect(FRONTEND_CACHE_CONTROL).toContain('no-transform')
    expect(FRONTEND_CACHE_CONTROL).not.toContain('public')
  })

  it('后台、接口与构建产物不加前台页面的响应头', async () => {
    for (const path of [
      '/admin',
      '/admin/collections/leads',
      '/api/health',
      '/api/leads/export',
      '/_next/static/chunks/main.js',
      '/_next/image',
    ]) {
      const headers = await headersFor(path)
      expect(headers.get('x-accel-buffering'), path).toBeNull()
      expect(headers.get('cache-control'), path).not.toBe(FRONTEND_CACHE_CONTROL)
    }
  })

  it('Payload 的深浅色客户端提示（Critical-CH）只发给后台：前台首次访问不会被浏览器重发一遍', async () => {
    for (const path of [
      '/',
      '/courses/ui-ux-career',
      '/articles',
      '/administration',
      '/api/health',
    ]) {
      const headers = await headersFor(path)
      expect(headers.get('critical-ch'), path).toBeNull()
      expect(headers.get('accept-ch'), path).toBeNull()
    }
    for (const path of ['/admin', '/admin/login', '/admin/collections/leads']) {
      const headers = await headersFor(path)
      expect(headers.get('critical-ch'), path).toBe('Sec-CH-Prefers-Color-Scheme')
      expect(headers.get('accept-ch'), path).toBe('Sec-CH-Prefers-Color-Scheme')
      expect(headers.get('vary'), path).toContain('Sec-CH-Prefers-Color-Scheme')
    }
  })

  it('媒体文件：缓存 1 天并允许过期后先用旧文件（文件名不含内容哈希，不用 immutable）', async () => {
    const headers = await headersFor('/api/media/file/course-cover-800x450.webp')
    expect(headers.get('cache-control')).toBe(MEDIA_CACHE_CONTROL)
    expect(MEDIA_CACHE_CONTROL).toContain('max-age=86400')
    expect(MEDIA_CACHE_CONTROL).not.toContain('immutable')
  })

  it('服务端缓存有上限：内存 LRU 与图片磁盘缓存都设置了大小', () => {
    expect(nextConfig.cacheMaxMemorySize).toBeGreaterThan(0)
    expect(nextConfig.images?.maximumDiskCacheSize).toBeGreaterThan(0)
  })
})
