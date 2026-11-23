import { createHmac } from 'node:crypto'

import { validateWebhookUrl, WEBHOOK_HOSTS, type WebhookPlatform } from '@/globals/LeadSettings'

import { maskPhone as maskPhoneNumber } from './mask'

import { zh } from '@/i18n/zh'

/**
 * 群机器人推送（企业微信 / 飞书 / 钉钉）：组装消息、按平台签名、发送并判定结果。
 * 只做纯计算与一次 HTTP 请求（fetch 可注入），重试与结果记录由任务队列负责（src/jobs/notify-lead.ts）。
 *
 * 安全约束：
 * - 发送前按平台官方域名再校验一次地址（防 SSRF 的纵深防御，后台保存时已校验过一次）；
 * - 消息只包含跟进所需的最少字段，不含 IP / User-Agent，手机号默认脱敏；
 * - 访客填写的内容会去掉换行与 Markdown / 提及语法，避免伪造消息行、插入 Markdown 链接或 @所有人
 *   （纯文本里的网址仍会被客户端识别成链接，所以“提交页面”只推送按站点地址重建的本站地址，见 sitePageUrl）；
 * - 机器人地址里带有密钥（key / access_token），错误信息与推送记录中只出现主机名。
 */

export type WebhookTarget = {
  /** 后台填写的名称，如“北京校区顾问群” */
  name: string
  platform: WebhookPlatform
  url: string
  /** 飞书「签名校验」/ 钉钉「加签」密钥；企业微信不支持加签，忽略 */
  secret?: string
  /** 是否对手机号脱敏 */
  maskPhone: boolean
}

export type LeadSummary = {
  name: string
  phone: string
  intentLabel: string
  disciplineName?: string
  city?: string
  message?: string
  position?: string
  /** 提交页面（浏览器上报的原值）：组装消息时只保留与后台链接同源的地址，见 sitePageUrl */
  pageUrl?: string
  isDuplicate: boolean
  createdAt: string | Date
  /** 后台线索详情页地址 */
  adminUrl: string
}

/** 组装好的消息：标题 + 若干“标签：值”行 + 后台链接，各平台再按自己的格式渲染 */
export type LeadMessage = {
  title: string
  lines: string[]
  adminUrl: string
}

export type WecomPayload = { msgtype: 'markdown'; markdown: { content: string } }
export type FeishuPayload = {
  msg_type: 'text'
  content: { text: string }
  timestamp?: string
  sign?: string
}
export type DingtalkPayload = { msgtype: 'markdown'; markdown: { title: string; text: string } }
export type WebhookPayload = WecomPayload | FeishuPayload | DingtalkPayload

export type WebhookRequest = { url: string; body: WebhookPayload }

export type WebhookSendResult =
  { ok: true; status: number } | { ok: false; status?: number; error: string }

export type SendWebhookOptions = {
  fetchImpl?: typeof fetch
  /** 请求超时（毫秒），默认 5000 */
  timeoutMs?: number
  /** 当前时间（毫秒时间戳），用于签名；默认 Date.now() */
  now?: number
}

const TITLE = zh.webhook.title
const ADMIN_LINK_LABEL = zh.webhook.adminLink
const ADMIN_LINK_TEXT = zh.webhook.adminLinkText
const MESSAGE_MAX_LENGTH = 100
const PAGE_URL_MAX_LENGTH = 200
const ERROR_MAX_LENGTH = 200
const DEFAULT_TIMEOUT_MS = 5000

/** 推送记录中的目标标识：名称 + 主机名（不含地址中的密钥） */
export function webhookTargetKey(target: Pick<WebhookTarget, 'name' | 'platform'>): string {
  return `${target.name}（${WEBHOOK_HOSTS[target.platform]}）`
}

/* ------------------------------------------------------------------ */
/* 消息内容                                                            */
/* ------------------------------------------------------------------ */

/** Markdown / 提及语法字符替换为全角，在纯文本和 Markdown 中都能原样显示 */
const MARKUP_REPLACEMENTS: Record<string, string> = {
  '<': '＜',
  '>': '＞',
  '[': '［',
  ']': '］',
  '(': '（',
  ')': '）',
  '*': '＊',
  '`': '｀',
}

/**
 * 访客输入在群消息中的安全显示：换行等空白折叠为一个空格（防止伪造“后台链接：”之类的行），
 * 去掉控制字符与双向文本控制符，Markdown 链接 / 强调 / 提及语法替换为全角字符。
 */
export function sanitizeInline(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[\p{Cc}​-‏‪-‮⁠-⁩﻿]/gu, '')
    .replace(/[<>[\]()*`]/g, (char) => MARKUP_REPLACEMENTS[char] ?? char)
    .trim()
}

/**
 * 路径与查询串中允许原样出现的字符；其余（含 URL 解析后仍保留的 , ; ! | ' ( ) * : @ 等）一律百分号编码。
 * 群聊客户端识别链接时常在这些字符处断开：不编码的话，`/a(https://evil.example)` 里的外站地址
 * 会被单独识别成一个链接，仍然借用“提交页面”的标签。编码后整段只会被识别成一个本站链接。
 */
const UNSAFE_URL_CHAR = /%(?![0-9A-Fa-f]{2})|[^A-Za-z0-9\-._~/?&=+%]/gu

function encodeUnsafeUrlChars(value: string): string {
  return value.replace(UNSAFE_URL_CHAR, (char) =>
    Array.from(
      new TextEncoder().encode(char),
      (byte) => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`,
    ).join(''),
  )
}

/**
 * 群消息里“提交页面”的可信形式。pageUrl 由访客浏览器上报，任何人都能把它换成钓鱼链接，
 * 而群聊客户端会把纯文本网址识别成可点击链接，所以：
 * - 只保留与 siteUrl（站点地址或任一本站地址，只取其源）同源的地址，
 *   其他域名、协议、端口或无法解析的值返回 undefined（整行省略）；
 * - 协议与主机取自站点配置，只沿用访客地址的路径与查询串（去掉账号密码与 # 片段），
 *   并把可能让客户端在中途断开链接的字符百分号编码（见 UNSAFE_URL_CHAR）。
 * 相对路径按站点地址解析。
 */
export function sitePageUrl(value: string | null | undefined, siteUrl: string): string | undefined {
  const raw = value?.trim()
  if (!raw) return undefined
  try {
    const site = new URL(siteUrl)
    const page = new URL(raw, site)
    if (page.origin !== site.origin) return undefined
    return `${site.origin}${encodeUnsafeUrlChars(`${page.pathname}${page.search}`)}`
  } catch {
    return undefined
  }
}

/** 按字符（而非 UTF-16 码元）截断，超出时以省略号结尾 */
export function truncate(value: string, max: number): string {
  const chars = Array.from(value)
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : value
}

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** 北京时间 yyyy-MM-dd HH:mm（与服务器时区无关） */
export function formatBeijingTime(value: string | Date): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = Object.fromEntries(timeFormatter.formatToParts(date).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}

/** 组装新线索消息；可选字段为空时整行省略。不包含 IP、User-Agent 等设备信息。 */
export function buildLeadMessage(
  summary: LeadSummary,
  { maskPhone }: { maskPhone: boolean },
): LeadMessage {
  const lines: string[] = []
  const add = (label: string, value: string | undefined, max?: number) => {
    const text = value ? sanitizeInline(value) : ''
    if (text) lines.push(`${label}：${max ? truncate(text, max) : text}`)
  }

  add(zh.webhook.name, summary.name)
  // 先清理再脱敏：脱敏用的 * 需原样显示（只由 11 位数字生成，不会构成 Markdown 语法）
  const phone = sanitizeInline(summary.phone)
  if (phone) lines.push(`${zh.webhook.phone}：${maskPhone ? maskPhoneNumber(phone) : phone}`)
  add(zh.webhook.intent, summary.intentLabel)
  add(zh.webhook.discipline, summary.disciplineName)
  add(zh.webhook.city, summary.city)
  add(zh.webhook.message, summary.message, MESSAGE_MAX_LENGTH)
  add(zh.webhook.position, summary.position)
  // 只推送本站地址：后台链接由站点配置生成，以它的源（协议 + 主机 + 端口）为准
  add(zh.webhook.pageUrl, sitePageUrl(summary.pageUrl, summary.adminUrl), PAGE_URL_MAX_LENGTH)
  if (summary.isDuplicate) lines.push(zh.webhook.duplicate)
  add(zh.webhook.time, formatBeijingTime(summary.createdAt))

  return { title: TITLE, lines, adminUrl: summary.adminUrl }
}

/** 纯文本（飞书 text 消息） */
export function renderPlainText(message: LeadMessage): string {
  return [message.title, ...message.lines, `${ADMIN_LINK_LABEL}：${message.adminUrl}`].join('\n')
}

/** Markdown（企业微信 / 钉钉）；钉钉需要空行才会换行 */
export function renderMarkdown(message: LeadMessage, platform: 'wecom' | 'dingtalk'): string {
  const heading = platform === 'wecom' ? `**${message.title}**` : `#### ${message.title}`
  const link = `${ADMIN_LINK_LABEL}：[${ADMIN_LINK_TEXT}](${message.adminUrl})`
  return [heading, ...message.lines, link].join(platform === 'wecom' ? '\n' : '\n\n')
}

/* ------------------------------------------------------------------ */
/* 平台消息体与签名                                                    */
/* ------------------------------------------------------------------ */

/**
 * 飞书签名校验：以 `timestamp + "\n" + secret` 为密钥，对空字符串做 HMAC-SHA256，再 Base64。
 * timestamp 为秒级时间戳字符串。
 */
export function feishuSign(timestamp: string, secret: string): string {
  return createHmac('sha256', `${timestamp}\n${secret}`).update('').digest('base64')
}

/**
 * 钉钉加签：以 secret 为密钥，对 `timestamp + "\n" + secret` 做 HMAC-SHA256，再 Base64
 * （拼到地址上时还需 URL 编码）。timestamp 为毫秒级时间戳。
 */
export function dingtalkSign(timestamp: string, secret: string): string {
  return createHmac('sha256', secret).update(`${timestamp}\n${secret}`).digest('base64')
}

/** 钉钉加签地址：在原地址后追加 timestamp 与 URL 编码后的 sign */
export function signDingtalkUrl(url: string, secret: string, now: number): string {
  const timestamp = String(now)
  const sign = encodeURIComponent(dingtalkSign(timestamp, secret))
  return `${url}${url.includes('?') ? '&' : '?'}timestamp=${timestamp}&sign=${sign}`
}

export function buildWecomPayload(message: LeadMessage): WecomPayload {
  return { msgtype: 'markdown', markdown: { content: renderMarkdown(message, 'wecom') } }
}

export function buildFeishuPayload(
  message: LeadMessage,
  { secret, now }: { secret?: string; now: number },
): FeishuPayload {
  const body: FeishuPayload = { msg_type: 'text', content: { text: renderPlainText(message) } }
  if (!secret) return body
  const timestamp = String(Math.floor(now / 1000))
  return { ...body, timestamp, sign: feishuSign(timestamp, secret) }
}

export function buildDingtalkPayload(message: LeadMessage): DingtalkPayload {
  return {
    msgtype: 'markdown',
    markdown: { title: message.title, text: renderMarkdown(message, 'dingtalk') },
  }
}

/** 按平台组装请求地址与消息体（含加签） */
export function buildWebhookRequest(
  target: WebhookTarget,
  summary: LeadSummary,
  { now = Date.now() }: { now?: number } = {},
): WebhookRequest {
  const message = buildLeadMessage(summary, { maskPhone: target.maskPhone })
  const secret = target.secret?.trim() || undefined
  switch (target.platform) {
    case 'wecom':
      return { url: target.url, body: buildWecomPayload(message) }
    case 'feishu':
      return { url: target.url, body: buildFeishuPayload(message, { secret, now }) }
    case 'dingtalk':
      return {
        url: secret ? signDingtalkUrl(target.url, secret, now) : target.url,
        body: buildDingtalkPayload(message),
      }
  }
}

/* ------------------------------------------------------------------ */
/* 发送                                                                */
/* ------------------------------------------------------------------ */

/**
 * 解析平台返回：企业微信 / 钉钉用 errcode，飞书用 code（旧版为 StatusCode），0 表示成功。
 * 返回 null 表示成功，否则返回错误说明。
 */
function platformError(platform: WebhookPlatform, text: string): string | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return '平台返回内容无法解析'
  }
  if (!data || typeof data !== 'object') return '平台返回内容无法解析'
  const body = data as Record<string, unknown>

  const code = platform === 'feishu' ? (body.code ?? body.StatusCode) : body.errcode
  if (code === 0 || code === '0') return null
  if (code === undefined) return '平台返回内容缺少结果码'

  const detail = platform === 'feishu' ? (body.msg ?? body.StatusMessage) : body.errmsg
  return `平台返回错误 ${String(code)}${typeof detail === 'string' && detail ? `：${detail}` : ''}`
}

class WebhookTimeoutError extends Error {
  override name = 'TimeoutError'
}

function describeFetchError(error: unknown, timeoutMs: number): string {
  const name = error && typeof error === 'object' && 'name' in error ? error.name : undefined
  if (name === 'AbortError' || name === 'TimeoutError') {
    return `请求超时（${timeoutMs / 1000} 秒）`
  }
  if (error instanceof Error) {
    const cause: unknown = error.cause
    const code =
      cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string'
        ? `（${cause.code}）`
        : ''
    return `网络错误：${error.message}${code}`
  }
  return '网络错误'
}

/**
 * 推送一条新线索到群机器人。不会抛出异常，结果通过返回值表示：
 * 地址未通过官方域名校验、超时、网络错误、HTTP 非 2xx、平台结果码非 0 都视为失败。
 */
export async function sendWebhook(
  target: WebhookTarget,
  summary: LeadSummary,
  { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, now = Date.now() }: SendWebhookOptions = {},
): Promise<WebhookSendResult> {
  // 纵深防御：后台保存时已校验，发送前按同样规则再校验一次（防止绕过后台直接写库）
  const valid = validateWebhookUrl(target.platform, target.url)
  if (valid !== true) return { ok: false, error: `地址未通过校验：${valid}` }

  const request = buildWebhookRequest(target, summary, { now })
  const controller = new AbortController()
  // 超时后既中止请求，也让等待立即结束（即使注入的 fetch 没有响应 signal，任务也不会一直挂起）
  const timedOut = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new WebhookTimeoutError()), {
      once: true,
    })
  })
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await Promise.race([
      fetchImpl(request.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(request.body),
        signal: controller.signal,
        // 不跟随重定向：防止官方域名之外的跳转（SSRF）
        redirect: 'error',
      }),
      timedOut,
    ])
    const text = await Promise.race([response.text(), timedOut])
    if (!response.ok) {
      return { ok: false, status: response.status, error: `HTTP ${response.status}` }
    }
    const error = platformError(target.platform, text)
    return error
      ? { ok: false, status: response.status, error: truncate(error, ERROR_MAX_LENGTH) }
      : { ok: true, status: response.status }
  } catch (error) {
    return { ok: false, error: truncate(describeFetchError(error, timeoutMs), ERROR_MAX_LENGTH) }
  } finally {
    clearTimeout(timer)
  }
}
