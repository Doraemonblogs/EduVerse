// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SiteConfig from '@/config/site'

/**
 * 资讯详情的阅读量上报（src/components/articles/detail/article-view-beacon.tsx，jsdom）：
 * 同一会话同一文章只报一次、sendBeacon 优先 / fetch keepalive 兜底、失败静默、静态预览站不上报。
 * 模块内记录已上报的文章：每个用例重新加载模块。
 */

const site = vi.hoisted(() => ({ isStaticPreview: false }))
vi.mock('@/config/site', async (importOriginal) => {
  const actual = await importOriginal<typeof SiteConfig>()
  return {
    ...actual,
    get isStaticPreview() {
      return site.isStaticPreview
    },
  }
})

async function load() {
  vi.resetModules()
  return import('@/components/articles/detail/article-view-beacon')
}

const sendBeacon = vi.fn<(url: string) => boolean>()
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>()

beforeEach(() => {
  site.isStaticPreview = false
  window.sessionStorage.clear()
  sendBeacon.mockReset().mockReturnValue(true)
  fetchMock.mockReset().mockResolvedValue(new Response('{}'))
  Object.defineProperty(window.navigator, 'sendBeacon', {
    configurable: true,
    value: sendBeacon,
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('阅读量上报', () => {
  it('用 sendBeacon 上报一次，地址为 /api/articles/:id/view；同一会话再次调用不重复', async () => {
    const { reportArticleView } = await load()
    expect(reportArticleView(12)).toBe(true)
    expect(sendBeacon).toHaveBeenCalledExactlyOnceWith('/api/articles/12/view')
    expect(window.sessionStorage.getItem('eduverse:article-viewed:12')).toBe('1')

    expect(reportArticleView(12)).toBe(false)
    expect(sendBeacon).toHaveBeenCalledTimes(1)
    // 另一篇文章单独上报
    expect(reportArticleView(13)).toBe(true)
    expect(sendBeacon).toHaveBeenLastCalledWith('/api/articles/13/view')
  })

  it('刷新后（模块重新加载）会话存储里已有标记时不再上报', async () => {
    window.sessionStorage.setItem('eduverse:article-viewed:12', '1')
    const { reportArticleView } = await load()
    expect(reportArticleView(12)).toBe(false)
    expect(sendBeacon).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sendBeacon 不可用或排队失败时改用 fetch keepalive（POST），请求失败也不抛错', async () => {
    sendBeacon.mockReturnValue(false)
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { reportArticleView } = await load()
    expect(reportArticleView(5)).toBe(true)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/articles/5/view', {
      method: 'POST',
      keepalive: true,
    })
    // 让被拒绝的 Promise 结算：已被 catch 吞掉，不会产生未处理的拒绝
    await Promise.resolve()
  })

  it('会话存储不可用时仍只按本次页面会话上报一次', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const { reportArticleView } = await load()
    expect(reportArticleView(8)).toBe(true)
    expect(reportArticleView(8)).toBe(false)
    expect(sendBeacon).toHaveBeenCalledTimes(1)
  })

  it('静态预览站不上报', async () => {
    site.isStaticPreview = true
    const { reportArticleView } = await load()
    expect(reportArticleView(12)).toBe(false)
    expect(sendBeacon).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('组件挂载后上报一次（StrictMode 重复执行 effect 也只报一次），不渲染任何内容', async () => {
    const { ArticleViewBeacon } = await load()
    const { StrictMode } = await import('react')
    const { container } = render(
      <StrictMode>
        <ArticleViewBeacon articleId={21} />
      </StrictMode>,
    )
    expect(container.innerHTML).toBe('')
    expect(sendBeacon).toHaveBeenCalledExactlyOnceWith('/api/articles/21/view')
  })
})
