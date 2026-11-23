import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildExportUrl,
  exportNotice,
  FALLBACK_FILENAME,
  fillTemplate,
  filenameFromDisposition,
  requestLeadExport,
  saveBlob,
} from '@/components/admin/export-leads-request'
import { EXPORT_HEADERS } from '@/endpoints/export-leads'
import { exportContentDisposition } from '@/lib/lead/csv'
import { zh } from '@/i18n/zh'

const csvResponse = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': exportContentDisposition(new Date('2026-11-23T06:05:00.000Z')),
      ...headers,
    },
  })

const errorResponse = (status: number, body: unknown) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': typeof body === 'string' ? 'text/html' : 'application/json' },
  })

describe('导出地址', () => {
  it('只带上列表页的筛选参数（where 与搜索词），去掉分页、排序与列设置', () => {
    const params = new URLSearchParams(
      'limit=50&page=3&sort=-createdAt&columns=%5B%5D&search=138&where[or][0][and][0][status][equals]=new',
    )
    const url = buildExportUrl('/api', params)
    const parsed = new URL(url, 'http://localhost')
    expect(parsed.pathname).toBe('/api/leads/export')
    expect([...parsed.searchParams.keys()]).toEqual([
      'search',
      'where[or][0][and][0][status][equals]',
    ])
    expect(parsed.searchParams.get('search')).toBe('138')
  })

  it('没有筛选条件时不带查询串', () => {
    expect(buildExportUrl('/api', new URLSearchParams('page=2'))).toBe('/api/leads/export')
  })
})

describe('下载文件名', () => {
  it('优先使用 filename* 中的 UTF-8 中文名', () => {
    const header = exportContentDisposition(new Date('2026-11-23T06:05:00.000Z'))
    expect(filenameFromDisposition(header)).toBe('线索导出-20261123-1405.csv')
  })

  it('没有 filename* 时使用 filename', () => {
    expect(filenameFromDisposition('attachment; filename="leads.csv"')).toBe('leads.csv')
    expect(filenameFromDisposition('attachment; filename=leads.csv')).toBe('leads.csv')
  })

  it('filename* 编码不合法时退回 filename', () => {
    expect(
      filenameFromDisposition(`attachment; filename="leads.csv"; filename*=UTF-8''%E4%ZZ.csv`),
    ).toBe('leads.csv')
  })

  it('去掉路径分隔符；缺少或为空时使用兜底文件名', () => {
    expect(filenameFromDisposition('attachment; filename="../../etc/x.csv"')).toBe(
      '.._.._etc_x.csv',
    )
    expect(filenameFromDisposition(null)).toBe(FALLBACK_FILENAME)
    expect(filenameFromDisposition('attachment')).toBe(FALLBACK_FILENAME)
    expect(filenameFromDisposition('attachment; filename=""')).toBe(FALLBACK_FILENAME)
  })
})

describe('请求导出', () => {
  it('带上登录 Cookie 请求，成功时返回文件内容、服务端文件名与导出统计', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      csvResponse('﻿"姓名"\r\n', {
        [EXPORT_HEADERS.count]: '1',
        [EXPORT_HEADERS.total]: '1',
      }),
    )
    const result = await requestLeadExport('/api/leads/export?search=1', fetchImpl)
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/leads/export?search=1',
      expect.objectContaining({ method: 'GET', credentials: 'include', cache: 'no-store' }),
    )
    expect(result).toMatchObject({
      ok: true,
      filename: '线索导出-20261123-1405.csv',
      count: 1,
      total: 1,
      truncated: false,
    })
    if (!result.ok) throw new Error('应当成功')
    expect(new Uint8Array(await result.blob.arrayBuffer()).slice(0, 3)).toEqual(
      new Uint8Array([0xef, 0xbb, 0xbf]),
    )
  })

  it('读取截断标记与匹配总数', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      csvResponse('x', {
        [EXPORT_HEADERS.count]: '10000',
        [EXPORT_HEADERS.total]: '25000',
        [EXPORT_HEADERS.truncated]: 'true',
      }),
    )
    expect(await requestLeadExport('/x', fetchImpl)).toMatchObject({
      ok: true,
      count: 10000,
      total: 25000,
      truncated: true,
    })
  })

  it('统计响应头缺失或不合法时为 null', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      csvResponse('x', { [EXPORT_HEADERS.count]: 'abc' }),
    )
    expect(await requestLeadExport('/x', fetchImpl)).toMatchObject({
      ok: true,
      count: null,
      total: null,
      truncated: false,
    })
  })

  it('失败时返回服务端 errors[0].message', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      errorResponse(400, { errors: [{ message: zh.export.invalidFilters }] }),
    )
    expect(await requestLeadExport('/x', fetchImpl)).toEqual({
      ok: false,
      status: 400,
      message: zh.export.invalidFilters,
    })
  })

  it('失败响应不是 JSON 时按状态码提示', async () => {
    const cases: [number, string][] = [
      [401, zh.export.unauthorized],
      [403, zh.export.forbidden],
      [502, zh.export.failed],
    ]
    for (const [status, message] of cases) {
      const fetchImpl = vi.fn<typeof fetch>(async () => errorResponse(status, '<html>bad</html>'))
      expect(await requestLeadExport('/x', fetchImpl)).toEqual({ ok: false, status, message })
    }
    const emptyErrors = vi.fn<typeof fetch>(async () => errorResponse(500, { errors: [] }))
    expect(await requestLeadExport('/x', emptyErrors)).toMatchObject({
      message: zh.export.failed,
    })
  })

  it('网络错误时返回网络异常提示，不抛出', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await requestLeadExport('/x', fetchImpl)).toEqual({
      ok: false,
      message: zh.export.networkError,
    })
  })
})

describe('导出结果提示', () => {
  it('未截断时为成功提示，包含导出条数', () => {
    expect(exportNotice({ count: 12, total: 12, truncated: false })).toEqual({
      type: 'success',
      message: fillTemplate(zh.export.done, { count: 12 }),
    })
    expect(exportNotice({ count: 12, total: 12, truncated: false }).message).toContain('12')
  })

  it('被截断时为警告，说明导出条数与匹配总数', () => {
    const notice = exportNotice({ count: 10000, total: 25000, truncated: true })
    expect(notice.type).toBe('warning')
    expect(notice.message).toContain('25000')
    expect(notice.message).toContain('10000')
    expect(notice.message).not.toMatch(/\{\w+\}/)
  })

  it('模板中未提供的占位符保持原样', () => {
    expect(fillTemplate('{a}-{b}-{a}', { a: 1 })).toBe('1-{b}-1')
  })
})

describe('保存文件', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('用 Object URL 与服务端文件名触发下载，随后移除链接并释放 URL', () => {
    vi.useFakeTimers()
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test/1')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clicked: { href: string; download: string; attached: boolean }[] = []
    const link = {
      href: '',
      download: '',
      rel: '',
      style: { display: '' },
      click() {
        clicked.push({ href: this.href, download: this.download, attached: body.includes(this) })
      },
      remove() {
        body.splice(body.indexOf(this), 1)
      },
    }
    const body: unknown[] = []
    const doc = {
      createElement: () => link,
      body: { appendChild: (node: unknown) => body.push(node) },
    } as unknown as Document

    const blob = new Blob(['x'])
    saveBlob(blob, '线索导出.csv', doc)

    expect(create).toHaveBeenCalledWith(blob)
    expect(clicked).toEqual([{ href: 'blob:test/1', download: '线索导出.csv', attached: true }])
    expect(body).toEqual([])
    expect(revoke).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:test/1')
  })
})
