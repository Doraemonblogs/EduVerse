import { isIP } from 'node:net'

/** 无法识别访客 IP 时的占位值（按 IP 限频改用进程级兜底限流） */
export const UNKNOWN_IP = 'unknown'

/**
 * 从请求头取客户端 IP。
 * 只有部署在**单层**可信反向代理（nginx 等）之后、并设置 TRUST_PROXY=true 时才读取转发头，
 * 否则这些头可被客户端伪造，用于绕过限频。
 *
 * - 取 X-Forwarded-For 的**最后一个**地址：nginx 的 `$proxy_add_x_forwarded_for`
 *   会把真实对端地址追加在末尾，前面的值都来自客户端，不可信；
 * - 没有 X-Forwarded-For 时退回 X-Real-IP（nginx 设为 `$remote_addr`）；
 * - 取到的值必须是合法 IPv4 / IPv6 地址（最长 64 字符），否则视为未知。
 *
 * nginx 需同时配置：
 *   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 *   proxy_set_header X-Real-IP $remote_addr;
 */
export function getClientIp(
  headers: Headers,
  trustProxy = process.env.TRUST_PROXY === 'true',
): string {
  if (!trustProxy) return UNKNOWN_IP
  const forwarded = headers.get('x-forwarded-for')
  const candidate = forwarded
    ? forwarded.split(',').at(-1)?.trim()
    : headers.get('x-real-ip')?.trim()
  return candidate && candidate.length <= 64 && isIP(candidate) ? candidate : UNKNOWN_IP
}

export function getUserAgent(headers: Headers): string {
  return (headers.get('user-agent') ?? '').slice(0, 300)
}

type ProxyEnv = { NODE_ENV?: string; TRUST_PROXY?: string }

let proxyWarningLogged = false

/**
 * 生产环境未设置 TRUST_PROXY=true 时提醒一次（每个进程只提醒一次）：
 * 此时无法识别访客 IP，按 IP 的限频全部失效，只剩进程级兜底限流与手机号限频。
 * 返回本次是否输出了提醒。
 */
export function warnIfProxyUntrusted(
  logger: { warn: (message: string) => void },
  env: ProxyEnv = process.env,
): boolean {
  if (proxyWarningLogged || env.NODE_ENV !== 'production' || env.TRUST_PROXY === 'true') {
    return false
  }
  proxyWarningLogged = true
  logger.warn(
    '未设置 TRUST_PROXY=true：无法识别访客 IP，留资按 IP 限频已改为全站共用的兜底限流。' +
      '部署在 nginx 之后时请设置 TRUST_PROXY=true 并配置 X-Forwarded-For / X-Real-IP（见 docs/ARCHITECTURE.md §4.9）。',
  )
  return true
}
