// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { exportContentDisposition } from '@/lib/lead/csv'
import { zh } from '@/i18n/zh'

/**
 * 导出按钮的交互：进行中禁用、失败时用后台提示条显示服务端原因、截断时提示、成功后按服务端文件名下载。
 * Payload 的 toast / useConfig 与 Next 的 useSearchParams 用 mock 代替（不加载后台样式与路由）。
 */
const toast = vi.hoisted(() => ({
  loading: vi.fn(() => 'toast-1'),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  toast,
  useConfig: () => ({ config: { routes: { api: '/api' } } }),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('page=2&where[status][equals]=new&search=138'),
}))

const { ExportLeadsButton } = await import('@/components/admin/export-leads-button')

type Deferred = { resolve: (response: Response) => void }

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>
let downloads: { href: string; download: string }[]

beforeEach(() => {
  downloads = []
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/export-1')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ href: this.href, download: this.download })
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  for (const fn of Object.values(toast)) fn.mockClear()
})

const csv = (headers: Record<string, string> = {}) =>
  new Response('﻿"姓名"\r\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': exportContentDisposition(new Date('2026-11-23T06:05:00.000Z')),
      'X-Export-Count': '3',
      'X-Export-Total': '3',
      ...headers,
    },
  })

/** fetch 先挂起，便于检查进行中的状态 */
function deferFetch(): Deferred {
  let resolve: Deferred['resolve'] = () => {}
  fetchMock.mockImplementationOnce(
    () =>
      new Promise<Response>((r) => {
        resolve = r
      }),
  )
  return { resolve: (response) => resolve(response) }
}

const button = () => screen.getByRole('button')

describe('线索导出按钮', () => {
  it('带上列表筛选条件与登录 Cookie 请求导出，成功后按服务端文件名下载', async () => {
    fetchMock.mockResolvedValueOnce(csv())
    render(<ExportLeadsButton />)
    expect(button().textContent).toBe(zh.export.menuLabel)

    await act(async () => {
      fireEvent.click(button())
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toBe('/api/leads/export')
    expect(parsed.searchParams.get('where[status][equals]')).toBe('new')
    expect(parsed.searchParams.get('search')).toBe('138')
    expect(parsed.searchParams.has('page')).toBe(false)
    expect(init?.credentials).toBe('include')

    expect(downloads).toEqual([
      { href: 'blob:http://localhost/export-1', download: '线索导出-20261123-1405.csv' },
    ])
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('3'), { id: 'toast-1' })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('导出进行中按钮禁用并显示进度，重复点击不会重复请求', async () => {
    const pending = deferFetch()
    render(<ExportLeadsButton />)

    await act(async () => {
      fireEvent.click(button())
    })
    expect(toast.loading).toHaveBeenCalledWith(zh.export.busy)
    expect(button()).toHaveProperty('disabled', true)
    expect(button().getAttribute('aria-busy')).toBe('true')
    expect(button().textContent).toBe(zh.export.busy)

    await act(async () => {
      fireEvent.click(button())
      fireEvent.click(button())
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve(csv())
    })
    expect(button()).toHaveProperty('disabled', false)
    expect(button().getAttribute('aria-busy')).toBe('false')
    expect(button().textContent).toBe(zh.export.menuLabel)
  })

  it('失败时在提示条中显示服务端返回的原因，不下载、不离开页面', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ errors: [{ message: zh.export.unauthorized }] }, { status: 401 }),
    )
    render(<ExportLeadsButton />)
    await act(async () => {
      fireEvent.click(button())
    })
    expect(toast.error).toHaveBeenCalledWith(zh.export.unauthorized, { id: 'toast-1' })
    expect(downloads).toEqual([])
    expect(button()).toHaveProperty('disabled', false)
  })

  it('超出单次上限被截断时显示需手动关闭的警告，说明导出条数与匹配总数', async () => {
    fetchMock.mockResolvedValueOnce(
      csv({ 'X-Export-Count': '10000', 'X-Export-Total': '25000', 'X-Export-Truncated': 'true' }),
    )
    render(<ExportLeadsButton />)
    await act(async () => {
      fireEvent.click(button())
    })
    expect(downloads).toHaveLength(1)
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.warning).toHaveBeenCalledTimes(1)
    const [message, options] = toast.warning.mock.calls[0] ?? []
    expect(message).toContain('25000')
    expect(message).toContain('10000')
    expect(options).toEqual({ id: 'toast-1', duration: Infinity })
  })

  it('网络错误时提示网络异常', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    render(<ExportLeadsButton />)
    await act(async () => {
      fireEvent.click(button())
    })
    expect(toast.error).toHaveBeenCalledWith(zh.export.networkError, { id: 'toast-1' })
    expect(button()).toHaveProperty('disabled', false)
  })
})
