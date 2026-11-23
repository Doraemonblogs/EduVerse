import { sql } from '@payloadcms/db-postgres'

import { healthResponse, runHealthCheck } from '@/lib/health'
import { getPayloadClient } from '@/lib/payload'

/**
 * 健康检查：GET /api/health → 200 `{ status: 'ok' }`，数据库不可用或超时 → 503。
 *
 * - 供 Docker HEALTHCHECK（Dockerfile）与外部监控使用；nginx 示例配置不对公网开放这个地址。
 * - 放在 app/api/health 而不是 (payload)/api 下：Payload 的 REST 路由是 (payload)/api/[...slug] 通配，
 *   静态段 /api/health 优先匹配，两者不冲突（Payload 没有名为 health 的集合或接口，新增集合时不要用这个 slug）。
 * - 探测内容：初始化 Payload（首次请求时连接数据库、启动任务队列定时器）+ `select 1`。
 */
export const dynamic = 'force-dynamic'

async function probeDatabase(): Promise<void> {
  const payload = await getPayloadClient()
  await payload.db.drizzle.execute(sql`select 1`)
}

export async function GET(): Promise<Response> {
  const result = await runHealthCheck(probeDatabase)
  if (!result.ok) console.error('[health] 数据库检查失败', result.error)
  return healthResponse(result.ok)
}
