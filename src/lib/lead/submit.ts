import type { Payload } from 'payload'

import { hasRole } from '@/access/roles'
import { leadSubmissionSchema, toFieldErrors, type LeadFieldErrors } from '@/lib/validation/lead'

import { BurstLimiter, KeyedMutex } from './burst-limiter'
import { UNKNOWN_IP } from './client-info'

/**
 * 留资提交核心流程（与 Next 运行时无关，Server Action 与集成测试共用）：
 * 校验 → 蜜罐 → 最短填写时间 → 进程内突发限流 → 数据库限频 → 重复判定 → 写入 → 排队推送。
 */

export type SubmitContext = {
  ip: string
  userAgent: string
  now?: number
}

export type SubmitResult =
  | { status: 'success'; leadId?: number; jobId?: number | string; duplicate?: boolean }
  | { status: 'invalid'; fieldErrors: LeadFieldErrors }
  | { status: 'rejected'; reason: 'too_fast' | 'rate_limited' }

/** 进程内防刷组件（测试可逐个替换） */
export type SubmitGuards = {
  /** 同一 IP 的突发限流 */
  ipLimiter: BurstLimiter
  /** 无法识别访客 IP 时（未设置 TRUST_PROXY）全站共用的兜底限流 */
  unknownIpLimiter: BurstLimiter
  /** 同一手机号的“限频 / 查重 → 写入”串行执行，避免并发提交同时绕过 */
  phoneLock: KeyedMutex
}

const DEFAULT_LIMITS = {
  ipPer10Min: 5,
  ipPerDay: 30,
  phonePerDay: 3,
  duplicateWindowDays: 30,
  minFillSeconds: 2,
}

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** 同一 IP 60 秒内最多 3 次（挡住脚本连发） */
export const IP_BURST_LIMIT = { limit: 3, windowMs: MINUTE } as const
/**
 * IP 未知时全站 60 秒内最多 20 次：所有访客共用一个计数，阈值比单 IP 高得多，
 * 正常流量（每分钟个位数线索）碰不到，只拦截脚本批量灌入。
 */
export const UNKNOWN_IP_BURST_LIMIT = { limit: 20, windowMs: MINUTE } as const

const defaultGuards: SubmitGuards = {
  ipLimiter: new BurstLimiter(IP_BURST_LIMIT.limit, IP_BURST_LIMIT.windowMs),
  unknownIpLimiter: new BurstLimiter(UNKNOWN_IP_BURST_LIMIT.limit, UNKNOWN_IP_BURST_LIMIT.windowMs),
  phoneLock: new KeyedMutex(),
}

export async function submitLead(
  payload: Payload,
  raw: Record<string, unknown>,
  ctx: SubmitContext,
  guards: Partial<SubmitGuards> = {},
): Promise<SubmitResult> {
  const { ipLimiter, unknownIpLimiter, phoneLock } = { ...defaultGuards, ...guards }
  const now = ctx.now ?? Date.now()
  const parsed = leadSubmissionSchema.safeParse(raw)
  if (!parsed.success) return { status: 'invalid', fieldErrors: toFieldErrors(parsed.error) }
  const data = parsed.data

  // 蜜罐被填写：多半是机器人，伪装成功、不入库
  if (data.website) {
    payload.logger.info({ ip: ctx.ip }, '留资蜜罐命中，已忽略')
    return { status: 'success' }
  }

  const settings = await payload.findGlobal({ slug: 'lead-settings', depth: 0 })
  const limits = { ...DEFAULT_LIMITS, ...stripNull(settings.rateLimits) }

  // 填写用时由客户端单调时钟测得（与两端时钟是否准确无关）；0 表示未知，交给其它规则
  if (data.fillMs > 0 && data.fillMs < limits.minFillSeconds * 1000) {
    return { status: 'rejected', reason: 'too_fast' }
  }

  // 突发限流：能识别 IP 时按 IP；识别不了时全站共用一个更宽的兜底计数
  const ipKnown = ctx.ip !== UNKNOWN_IP
  const burstOk = ipKnown ? ipLimiter.take(ctx.ip, now) : unknownIpLimiter.take(UNKNOWN_IP, now)
  if (!burstOk) return { status: 'rejected', reason: 'rate_limited' }

  const since = (ms: number) => new Date(now - ms).toISOString()
  const countLeads = async (where: Record<string, unknown>) =>
    (await payload.count({ collection: 'leads', where: where as never, overrideAccess: true }))
      .totalDocs

  if (ipKnown) {
    const [last10Min, lastDay] = await Promise.all([
      countLeads({
        'client.ip': { equals: ctx.ip },
        createdAt: { greater_than: since(10 * MINUTE) },
      }),
      countLeads({ 'client.ip': { equals: ctx.ip }, createdAt: { greater_than: since(DAY) } }),
    ])
    if (last10Min >= limits.ipPer10Min || lastDay >= limits.ipPerDay) {
      return { status: 'rejected', reason: 'rate_limited' }
    }
  }

  // 同一手机号排队执行：并发提交时后一个能看到前一个写入的线索
  const created = await phoneLock.run(data.phone, async () => {
    const phoneToday = await countLeads({
      phone: { equals: data.phone },
      createdAt: { greater_than: since(DAY) },
    })
    if (phoneToday >= limits.phonePerDay) return undefined

    // 重复判定：窗口期内同一手机号已有线索 → 标记重复，交给原负责顾问（仍是启用的课程顾问时）
    const { docs: previous } = await payload.find({
      collection: 'leads',
      where: {
        phone: { equals: data.phone },
        createdAt: { greater_than: since(limits.duplicateWindowDays * DAY) },
      },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const original = previous[0]

    const [discipline, course, tutorial, assignedTo, siteSettings] = await Promise.all([
      publishedId(payload, 'disciplines', data.discipline),
      publishedId(payload, 'courses', data.course),
      publishedId(payload, 'tutorials', data.tutorial),
      activeConsultantId(payload, original?.assignedTo),
      payload.findGlobal({
        slug: 'site-settings',
        depth: 0,
        select: { privacyPolicyVersion: true },
      }),
    ])

    const lead = await payload.create({
      collection: 'leads',
      overrideAccess: true,
      data: {
        name: data.name,
        phone: data.phone,
        discipline,
        city: data.city,
        message: data.message,
        intent: data.intent,
        status: 'new',
        assignedTo,
        isDuplicate: Boolean(original),
        duplicateOf: original?.id,
        source: {
          pageUrl: data.pageUrl,
          position: data.position,
          landingUrl: data.landingUrl,
          referrer: data.referrer,
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          utmTerm: data.utmTerm,
          utmContent: data.utmContent,
        },
        context: { course, tutorial, quizResult: parseJson(data.quizResult) },
        client: { ip: ctx.ip, userAgent: ctx.userAgent },
        consent: {
          agreed: true,
          policyVersion: siteSettings.privacyPolicyVersion,
          agreedAt: new Date(now).toISOString(),
        },
      },
    })
    return { lead, duplicate: Boolean(original) }
  })
  if (!created) return { status: 'rejected', reason: 'rate_limited' }

  // 有启用的群机器人时排队推送（推送失败会自动重试，不影响访客提交结果）
  const hasWebhooks = (settings.webhooks ?? []).some((w) => w.enabled)
  const job = hasWebhooks
    ? await payload.jobs.queue({ task: 'notifyLead', input: { leadId: created.lead.id } })
    : undefined

  return {
    status: 'success',
    leadId: created.lead.id,
    jobId: job?.id,
    duplicate: created.duplicate,
  }
}

function stripNull<T extends object>(
  value: T | null | undefined,
): Partial<Record<keyof T, number>> {
  if (!value) return {}
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)),
  ) as Partial<Record<keyof T, number>>
}

function relationId(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number')
    return value.id
  return undefined
}

/**
 * 重复线索沿用原负责人前先确认对方仍是启用的课程顾问：
 * 角色已变更（关联校验会拒绝写入）或账号已停用（没人能看到线索）时不沿用，留给管理员分配。
 */
async function activeConsultantId(payload: Payload, value: unknown): Promise<number | undefined> {
  const id = relationId(value)
  if (id === undefined) return undefined
  const user = await payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { role: true, active: true },
  })
  return hasRole(user, 'consultant') ? id : undefined
}

type JsonValue = string | number | boolean | unknown[] | { [key: string]: unknown } | null

function parseJson(value: string | undefined): JsonValue | undefined {
  if (!value) return undefined
  try {
    return JSON.parse(value) as JsonValue
  } catch {
    return undefined
  }
}

/** 只接受已发布内容的 ID，防止通过表单关联到草稿或不存在的文档 */
async function publishedId(
  payload: Payload,
  collection: 'disciplines' | 'courses' | 'tutorials',
  id: number | undefined,
): Promise<number | undefined> {
  if (!id) return undefined
  const { totalDocs } = await payload.count({
    collection,
    where: { id: { equals: id }, _status: { equals: 'published' } },
  })
  return totalDocs > 0 ? id : undefined
}
