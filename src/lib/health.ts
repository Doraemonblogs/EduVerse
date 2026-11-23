/**
 * 健康检查（GET /api/health，src/app/api/health/route.ts）的纯逻辑：在限定时间内完成探测即为正常。
 * Docker HEALTHCHECK 与运维监控使用；响应只有状态字样，不含版本号、错误详情等信息。
 */

/** 探测（初始化 Payload + 查询一次数据库）的最长等待时间；Docker HEALTHCHECK 的超时是 5 秒 */
export const HEALTH_TIMEOUT_MS = 3000

export type HealthCheckResult = { ok: true } | { ok: false; error: unknown }

/** 执行探测：resolve 即正常；reject 或超时视为异常（超时后不再等待探测结束） */
export async function runHealthCheck(
  probe: () => Promise<unknown>,
  timeoutMs: number = HEALTH_TIMEOUT_MS,
): Promise<HealthCheckResult> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`健康检查超时（${timeoutMs}ms）`)), timeoutMs)
  })
  try {
    await Promise.race([probe(), timeout])
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  } finally {
    clearTimeout(timer)
  }
}

/** 健康检查响应：200 `{ status: 'ok' }` / 503 `{ status: 'unavailable' }`，不缓存 */
export function healthResponse(ok: boolean): Response {
  return Response.json(
    { status: ok ? 'ok' : 'unavailable' },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
