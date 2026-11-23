import { sql } from '@payloadcms/db-postgres'
import type { Endpoint, PayloadHandler, PayloadRequest } from 'payload'

import { parseArticleId, articleViewKey, ViewDeduper } from '@/lib/articles/view'
import { BurstLimiter } from '@/lib/lead/burst-limiter'
import { getClientIp, UNKNOWN_IP } from '@/lib/lead/client-info'

/**
 * 阅读量上报：POST /api/articles/:id/view（注册在 Articles 集合的 endpoints 中）。
 *
 * - 只对已发布的文章生效：原生 SQL `UPDATE … SET views = views + 1 WHERE id = $1 AND _status = 'published'`，
 *   参数化执行，**不经过 Payload 的 update**：不触发钩子（缓存失效、搜索文本、preserveViews）、
 *   不写版本记录、不改 updatedAt（docs/ARCHITECTURE.md §2.1）；前台显示的阅读量来自缓存，最迟 1 小时更新；
 * - 同一 IP 同一文章 30 分钟内只计一次（进程内去重，见 ViewDeduper）；无法识别 IP（未设置 TRUST_PROXY）时
 *   不按 IP 去重，改为每篇文章每分钟最多计 MAX_UNKNOWN_PER_MINUTE 次，避免被刷；
 *   404 / 500 时撤销这次放行（forget / release），任意 ID 的请求不会在内存里留下键；
 * - 响应只有 `{ counted }`（本次是否计数），不返回文章的任何字段：
 *   200 已处理（含去重未计数）、400 ID 不合法、404 文章不存在或未发布（不区分两者）；
 * - 不需要登录，也不读写 Cookie；客户端用 navigator.sendBeacon（或 fetch keepalive）上报，
 *   同一会话同一文章只报一次（sessionStorage，见 articleViewSessionKey），静态预览站不上报。
 */

/** 无法识别 IP 时，每篇文章每分钟最多计数的次数 */
export const MAX_UNKNOWN_PER_MINUTE = 60

const NO_STORE = { 'Cache-Control': 'no-store' } as const

const json = (body: Record<string, unknown>, status: number) =>
  Response.json(body, { status, headers: NO_STORE })

export type ArticleViewHandlerOptions = {
  /** 同一 IP 同一文章的去重（默认 30 分钟一次） */
  deduper?: ViewDeduper
  /** 无法识别 IP 时按文章的突发限流 */
  unknownIpLimiter?: BurstLimiter
  /** 是否信任反向代理传来的 X-Forwarded-For / X-Real-IP，默认读环境变量 TRUST_PROXY */
  trustProxy?: boolean
}

/**
 * 已发布文章的阅读量 +1（原生 SQL，参数化），返回是否命中（文章存在且已发布）。
 * 表名按 Payload 的表名映射取（集合 articles → 表 articles），列 views 为 numeric，空值按 0。
 */
export async function incrementArticleViews(req: PayloadRequest, id: number): Promise<boolean> {
  const table = req.payload.db.tableNameMap.get('articles') ?? 'articles'
  const result = await req.payload.db.drizzle.execute(
    sql`UPDATE ${sql.identifier(table)} SET "views" = COALESCE("views", 0) + 1 WHERE "id" = ${id} AND "_status" = 'published'`,
  )
  return (result.rowCount ?? 0) > 0
}

/** 创建处理函数（集成测试传入独立的去重器与 trustProxy） */
export function createArticleViewHandler(options: ArticleViewHandlerOptions = {}): PayloadHandler {
  const deduper = options.deduper ?? new ViewDeduper()
  const unknownIpLimiter =
    options.unknownIpLimiter ?? new BurstLimiter(MAX_UNKNOWN_PER_MINUTE, 60_000)

  return async (req) => {
    const id = parseArticleId(req.routeParams?.id)
    if (id === null) return json({ error: 'invalid id' }, 400)

    const ip = getClientIp(req.headers, options.trustProxy)
    // 放行后计数没有生效（文章不存在 / 未发布、数据库出错）时撤销：不占用名额，
    // 也不让任意 ID 的请求在限流器、去重器里留下键（键的数量以已发布文章数为上限）
    let undo: () => void
    if (ip === UNKNOWN_IP) {
      const limiterKey = String(id)
      if (!unknownIpLimiter.take(limiterKey)) return json({ counted: false }, 200)
      undo = () => unknownIpLimiter.release(limiterKey)
    } else {
      const key = articleViewKey(id, ip)
      if (!deduper.shouldCount(key)) return json({ counted: false }, 200)
      undo = () => deduper.forget(key)
    }

    try {
      const counted = await incrementArticleViews(req, id)
      if (!counted) {
        // 不存在 / 未发布：发布后同一访客仍可计数
        undo()
        return json({ error: 'not found' }, 404)
      }
      return json({ counted: true }, 200)
    } catch (err) {
      undo()
      req.payload.logger.error({ err, id }, '阅读量计数失败')
      return json({ error: 'failed' }, 500)
    }
  }
}

export const articleViewEndpoint: Endpoint = {
  path: '/:id/view',
  method: 'post',
  handler: createArticleViewHandler(),
}
