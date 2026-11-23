import { withBasePath } from '@/lib/base-path'
import { zh } from '@/i18n/zh'

/**
 * 线索导出按钮的请求与下载逻辑（不含 React，便于单元测试）。
 * 响应头名称与 src/endpoints/export-leads.ts 的 EXPORT_HEADERS 一致（不直接引用：那是服务端模块）。
 */

const MESSAGES = zh.export

/** 服务端没给文件名时的兜底 */
export const FALLBACK_FILENAME = 'leads-export.csv'

/** 只带上筛选相关的参数（where[...] 与搜索词），分页、排序、列设置与导出无关 */
export const isFilterParam = (key: string) =>
  key === 'search' || key === 'where' || key.startsWith('where[')

type SearchParamsLike = { forEach: (callback: (value: string, key: string) => void) => void }

/** 导出地址：列表页当前的筛选条件原样带到 GET {api}/leads/export */
export function buildExportUrl(api: string, searchParams: SearchParamsLike): string {
  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (isFilterParam(key)) params.append(key, value)
  })
  const query = params.toString()
  return withBasePath(`${api}/leads/export${query ? `?${query}` : ''}`)
}

/**
 * 从 Content-Disposition 取下载文件名：优先 RFC 5987 的 filename*（UTF-8 中文名），其次 filename。
 * 去掉路径分隔符，取不到时返回 fallback。
 */
export function filenameFromDisposition(
  header: string | null | undefined,
  fallback: string = FALLBACK_FILENAME,
): string {
  if (!header) return fallback
  const clean = (name: string) => name.replace(/[/\\]/g, '_').trim()

  const extended = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header)?.[1]
  if (extended) {
    try {
      const name = clean(decodeURIComponent(extended.trim()))
      if (name) return name
    } catch {
      // 编码不合法时退回 filename
    }
  }
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;]*))/.exec(header)
  const name = clean(plain?.[1] ?? plain?.[2] ?? '')
  return name || fallback
}

/** 文案模板：{name} 替换为对应的值 */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}

export type ExportSuccess = {
  ok: true
  blob: Blob
  filename: string
  /** 本次导出条数（响应头缺失时为 null） */
  count: number | null
  /** 匹配总数（响应头缺失时为 null） */
  total: number | null
  /** 超出单次上限，文件不完整 */
  truncated: boolean
}
export type ExportFailure = { ok: false; status?: number; message: string }
export type ExportResult = ExportSuccess | ExportFailure

const toCount = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : null
}

/** 失败响应的提示：优先使用服务端返回的 errors[0].message，其次按状态码给出通用说明 */
async function failureMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'errors' in body && Array.isArray(body.errors)) {
      const first: unknown = body.errors[0]
      if (first && typeof first === 'object' && 'message' in first) {
        const message = first.message
        if (typeof message === 'string' && message.trim()) return message
      }
    }
  } catch {
    // 不是 JSON（如网关错误页），按状态码提示
  }
  if (response.status === 401) return MESSAGES.unauthorized
  if (response.status === 403) return MESSAGES.forbidden
  return MESSAGES.failed
}

/**
 * 请求导出：带上登录 Cookie（credentials: 'include'），成功时读出文件内容与导出统计。
 * 不会抛出异常，网络错误与非 2xx 响应都以 { ok: false, message } 返回。
 */
export async function requestLeadExport(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ExportResult> {
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'text/csv, application/json' },
    })
  } catch {
    return { ok: false, message: MESSAGES.networkError }
  }

  if (!response.ok) {
    return { ok: false, status: response.status, message: await failureMessage(response) }
  }

  let blob: Blob
  try {
    blob = await response.blob()
  } catch {
    return { ok: false, status: response.status, message: MESSAGES.networkError }
  }
  return {
    ok: true,
    blob,
    filename: filenameFromDisposition(response.headers.get('Content-Disposition')),
    count: toCount(response.headers.get('X-Export-Count')),
    total: toCount(response.headers.get('X-Export-Total')),
    truncated: response.headers.get('X-Export-Truncated') === 'true',
  }
}

/** 导出成功后的提示：被截断时为警告（说明导出了多少、共匹配多少），否则为成功提示 */
export function exportNotice(result: Pick<ExportSuccess, 'count' | 'total' | 'truncated'>): {
  type: 'success' | 'warning'
  message: string
} {
  const count = result.count ?? 0
  if (result.truncated) {
    return {
      type: 'warning',
      message: fillTemplate(MESSAGES.truncated, { count, total: result.total ?? count }),
    }
  }
  return { type: 'success', message: fillTemplate(MESSAGES.done, { count }) }
}

/** 通过临时的 Object URL 触发浏览器下载，文件名使用服务端给出的名称 */
export function saveBlob(blob: Blob, filename: string, doc: Document = document): void {
  const url = URL.createObjectURL(blob)
  const link = doc.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  doc.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    // 部分浏览器在 click 之后才开始读取 Blob，稍后再释放
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
