import { APIError, type Endpoint, type PayloadRequest, type Where } from 'payload'
import { combineWhereConstraints, mergeListSearchAndWhere } from 'payload/shared'
import { z } from 'zod'

import { hasRole } from '@/access/roles'
import { auditLogActor } from '@/collections/AuditLogs'
import { getClientIp } from '@/lib/lead/client-info'
import { exportContentDisposition, leadsToCsv, type LeadCsvInput } from '@/lib/lead/csv'
import { zh } from '@/i18n/zh'

/** 每次查询的条数 */
export const EXPORT_PAGE_SIZE = 500
/** 单次导出上限，超出部分不导出（响应头 X-Export-Truncated 标记，操作日志记录匹配总数） */
export const EXPORT_MAX_ROWS = 10_000
/** 搜索关键词长度上限（与列表页搜索一致：匹配姓名或手机号） */
const MAX_SEARCH_LENGTH = 100
/** where 中 and / or 的最大嵌套层数（后台筛选器只生成 or → and 两层） */
export const MAX_WHERE_DEPTH = 6

export const EXPORT_MESSAGES = zh.export

/** 响应头：本次导出条数、匹配总数、是否因超出上限被截断 */
export const EXPORT_HEADERS = {
  count: 'X-Export-Count',
  total: 'X-Export-Total',
  truncated: 'X-Export-Truncated',
} as const

/** 单个字段的条件：运算符 → 值，如 { equals: 'new' } */
const whereFieldSchema = z.record(z.string(), z.unknown())

/**
 * where 的结构校验：and / or 必须是条件数组，其他键必须是运算符对象。
 * 结构不对时（如 where[and][status][equals]=new 被 qs 解析成对象而不是数组）
 * Payload 合并条件会抛 TypeError（500），这里提前按无效筛选条件处理。
 * 逐层构建以限制嵌套深度：最内层不再接受 and / or（数组不是运算符对象，会校验失败）。
 */
const whereSchema: z.ZodType<Where> = Array.from({ length: MAX_WHERE_DEPTH }).reduce<
  z.ZodType<Where>
>(
  (inner) =>
    z
      .object({ and: z.array(inner).optional(), or: z.array(inner).optional() })
      .catchall(whereFieldSchema),
  z.record(z.string(), whereFieldSchema),
)

type ExportFilters = { where: Where; search?: string }

/**
 * 读取列表页带过来的筛选条件。
 * Payload 已用 qs 把查询串解析到 req.query（where[status][equals]=new → 嵌套对象）；
 * 与 REST 接口一样也接受 JSON 字符串形式的 where。结构无法识别时返回 null。
 */
export function readExportFilters(
  query: Record<string, unknown> | undefined,
): ExportFilters | null {
  let where: unknown = query?.where ?? {}
  if (typeof where === 'string') {
    if (where.trim() === '') {
      where = {}
    } else {
      try {
        where = JSON.parse(where)
      } catch {
        return null
      }
    }
  }
  const parsed = whereSchema.safeParse(where)
  if (!parsed.success) return null

  const rawSearch = query?.search
  if (rawSearch !== undefined && typeof rawSearch !== 'string') return null
  const search = rawSearch?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined

  // 深拷贝：后续合并搜索条件时不改动原始对象（原始对象写入操作日志）
  return { where: structuredClone(parsed.data), search }
}

/**
 * 跨站发起的浏览器请求（Sec-Fetch-Site: cross-site），典型如其他网站诱导的跳转或弹窗。
 * 这类请求只能靠 Cookie 自动登录，不代表本人操作：否则别的网站能让已登录的管理员反复下载线索文件、
 * 并以其名义写入导出记录。与 Payload 自带任务接口的处理（ignoreCrossSiteNavigationUser）同理，
 * 这里更严格：任何跨站请求都拒绝（导出按钮是同源 fetch，不受影响）。
 */
export function isCrossSiteRequest(headers: Headers): boolean {
  return headers.get('sec-fetch-site') === 'cross-site'
}

const error = (message: string, status: number) =>
  Response.json({ errors: [{ message }] }, { status, headers: { 'Cache-Control': 'no-store' } })

/**
 * GET /api/leads/export：按后台列表的当前筛选条件导出线索 CSV。
 * - 只有启用状态的管理员与课程顾问可以导出；查询以当前用户身份执行（overrideAccess: false），
 *   顾问只能导出分配给自己的线索，字段级权限（如 IP）同样生效。
 * - 每次导出都写入操作日志（谁、多少条、什么条件、IP），日志写入失败则不返回数据；
 *   操作人同时记邮箱 / 姓名 / 角色快照，删除账号后仍可追溯。
 * - 跨站发起的请求一律拒绝（防 CSRF）。
 * - 超出单次上限时只导出最新的 EXPORT_MAX_ROWS 条，响应头标记截断与匹配总数，由导出按钮提示用户。
 */
export async function exportLeadsHandler(req: PayloadRequest): Promise<Response> {
  const { payload, user } = req
  if (isCrossSiteRequest(req.headers)) return error(EXPORT_MESSAGES.crossSite, 403)
  if (!user) return error(EXPORT_MESSAGES.unauthorized, 401)
  if (!hasRole(user, 'admin', 'consultant')) return error(EXPORT_MESSAGES.forbidden, 403)

  const filters = readExportFilters(req.query)
  if (!filters) return error(EXPORT_MESSAGES.invalidFilters, 400)

  const startedAt = new Date()
  const where = combineWhereConstraints([
    mergeListSearchAndWhere({
      collectionConfig: payload.collections.leads.config,
      search: filters.search ?? '',
      where: structuredClone(filters.where),
    }),
    // 只导出开始导出前已存在的线索：导出过程中新提交的线索不会让分页错位、出现重复行
    { createdAt: { less_than_equal: startedAt.toISOString() } },
  ])

  const leads: LeadCsvInput[] = []
  let totalDocs = 0
  try {
    for (let page = 1; leads.length < EXPORT_MAX_ROWS; page++) {
      const result = await payload.find({
        collection: 'leads',
        where,
        req,
        user,
        overrideAccess: false,
        depth: 1,
        // createdAt 相同时按 id 排序，保证分页稳定
        sort: ['-createdAt', '-id'],
        limit: EXPORT_PAGE_SIZE,
        page,
        pagination: true,
        select: {
          createdAt: true,
          name: true,
          phone: true,
          intent: true,
          discipline: true,
          city: true,
          message: true,
          status: true,
          assignedTo: true,
          isDuplicate: true,
          source: true,
        },
        populate: {
          disciplines: { name: true },
          users: { name: true, email: true },
        },
      })
      totalDocs = result.totalDocs
      leads.push(...result.docs)
      if (!result.hasNextPage) break
    }
  } catch (err) {
    // 筛选了不存在或无权查询的字段等
    if (err instanceof APIError && err.status === 400) {
      return error(EXPORT_MESSAGES.invalidFilters, 400)
    }
    throw err
  }

  const rows = leads.slice(0, EXPORT_MAX_ROWS)
  const truncated = totalDocs > rows.length
  const csv = leadsToCsv(rows)

  await payload.create({
    collection: 'audit-logs',
    overrideAccess: true,
    req,
    data: {
      action: 'export_leads',
      user: user.id,
      ...auditLogActor(user),
      count: rows.length,
      filters: {
        where: filters.where,
        search: filters.search ?? null,
        ...(truncated ? { truncated: true, totalDocs } : {}),
      },
      ip: getClientIp(req.headers),
    },
  })

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': exportContentDisposition(startedAt),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      [EXPORT_HEADERS.count]: String(rows.length),
      [EXPORT_HEADERS.total]: String(totalDocs),
      ...(truncated ? { [EXPORT_HEADERS.truncated]: 'true' } : {}),
    },
  })
}

/** 线索 CSV 导出：GET /api/leads/export（注册在 Leads 集合的 endpoints 中） */
export const exportLeadsEndpoint: Endpoint = {
  path: '/export',
  method: 'get',
  handler: exportLeadsHandler,
}
