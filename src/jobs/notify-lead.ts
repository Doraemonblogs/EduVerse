import type { Payload, TaskConfig } from 'payload'

import { LEAD_INTENT_OPTIONS } from '@/collections/Leads'
import { getSiteUrl } from '@/config/site'
import { isWebhookPlatform } from '@/globals/LeadSettings'
import {
  sendWebhook,
  webhookTargetKey,
  type LeadSummary,
  type SendWebhookOptions,
  type WebhookTarget,
} from '@/lib/lead/webhook'
import { type Lead, type LeadSetting } from '@/payload-types'

type Delivery = NonNullable<Lead['webhookDeliveries']>[number]
/** Payload 未导出 RetryConfig，从 TaskConfig 中取（排除“只写次数”的数字形式） */
type RetryConfig = Exclude<NonNullable<TaskConfig['retries']>, number>
type WebhookRow = NonNullable<LeadSetting['webhooks']>[number]

export type NotifyLeadResult = { delivered: number }

/** 后台线索详情页地址（群消息里的“后台链接”） */
export function leadAdminUrl(id: number | string): string {
  return `${getSiteUrl()}/admin/collections/leads/${id}`
}

function toTarget(row: WebhookRow): WebhookTarget | undefined {
  if (!isWebhookPlatform(row.platform) || !row.name || !row.url) return undefined
  return {
    name: row.name,
    platform: row.platform,
    url: row.url,
    secret: row.secret || undefined,
    // 默认脱敏：只有明确关闭时才推送完整手机号
    maskPhone: row.maskPhone !== false,
  }
}

function toSummary(lead: Lead): LeadSummary {
  const discipline = lead.discipline && typeof lead.discipline === 'object' ? lead.discipline : null
  return {
    name: lead.name,
    phone: lead.phone,
    intentLabel: LEAD_INTENT_OPTIONS.find((o) => o.value === lead.intent)?.label ?? lead.intent,
    disciplineName: discipline?.name ?? undefined,
    city: lead.city ?? undefined,
    message: lead.message ?? undefined,
    position: lead.source?.position ?? undefined,
    pageUrl: lead.source?.pageUrl ?? undefined,
    isDuplicate: Boolean(lead.isDuplicate),
    createdAt: lead.createdAt,
    adminUrl: leadAdminUrl(lead.id),
  }
}

/**
 * 把一条线索推送到所有启用的群机器人，并把结果记到线索的 webhookDeliveries 上。
 * - 已有成功记录的目标（名称 + 主机名）跳过，任务重试时不会重复推送；
 * - 每个目标只保留一条记录：再次尝试时更新结果、错误信息与时间，尝试次数累加；
 * - 有目标失败时抛出异常，由任务队列重试（notifyLeadTask.retries）。
 * 返回本次推送成功的目标数。线索已被删除时直接结束，不再重试。
 */
export async function notifyLead(
  payload: Payload,
  leadId: number,
  options: SendWebhookOptions = {},
): Promise<NotifyLeadResult> {
  const lead = await payload.findByID({
    collection: 'leads',
    id: leadId,
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!lead) {
    payload.logger.warn({ leadId }, '线索不存在，跳过群机器人推送')
    return { delivered: 0 }
  }

  const settings = await payload.findGlobal({
    slug: 'lead-settings',
    depth: 0,
    overrideAccess: true,
  })
  const targets = (settings.webhooks ?? [])
    .filter((row) => row.enabled)
    .map(toTarget)
    .filter((target): target is WebhookTarget => Boolean(target))

  const deliveries: Delivery[] = [...(lead.webhookDeliveries ?? [])]
  const succeeded = new Set(
    deliveries.filter((d) => d.status === 'success').map((d) => d.target ?? ''),
  )
  const pending = targets.filter((target) => !succeeded.has(webhookTargetKey(target)))
  if (pending.length === 0) return { delivered: 0 }

  const summary = toSummary(lead)
  const results = await Promise.all(
    pending.map(async (target) => ({
      key: webhookTargetKey(target),
      result: await sendWebhook(target, summary, options),
    })),
  )

  const at = new Date().toISOString()
  for (const { key, result } of results) {
    const index = deliveries.findIndex((d) => d.target === key)
    const previous = index >= 0 ? deliveries[index] : undefined
    const record: Delivery = {
      ...(previous?.id ? { id: previous.id } : {}),
      target: key,
      status: result.ok ? 'success' : 'failed',
      attempts: (previous?.attempts ?? 0) + 1,
      lastError: result.ok ? null : result.error,
      at,
    }
    if (index >= 0) deliveries[index] = record
    else deliveries.push(record)
  }

  await payload.update({
    collection: 'leads',
    id: lead.id,
    data: { webhookDeliveries: deliveries },
    depth: 0,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })

  const failed = results.filter((r) => !r.result.ok)
  if (failed.length > 0) {
    const detail = failed
      .map(({ key, result }) => `${key}：${result.ok ? '' : result.error}`)
      .join('；')
    throw new Error(`群机器人推送失败（${failed.length}/${results.length}）：${detail}`)
  }
  return { delivered: results.length }
}

/**
 * 推送失败的重试策略：最多重试 5 次，指数退避，间隔约 1、2、4、8、16 分钟（第 n 次重试等待 2^(n-1) 分钟）。
 * 群机器人有频率限制（企业微信 / 钉钉每个机器人每分钟 20 条，钉钉超限后会限流 10 分钟），
 * 平台短时故障也常见；退避让重试覆盖约半小时，而不是在几分钟内用完。
 * 等待时间写在任务的 waitUntil 上，定时任务（autoRun）只领取已到时间的任务；runByID 不受 waitUntil 限制。
 */
export const NOTIFY_LEAD_RETRIES = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 60_000 },
} as const satisfies RetryConfig

/** 线索推送任务（企业微信 / 飞书 / 钉钉群机器人）：提交线索后排队，失败自动重试 */
export const notifyLeadTask: TaskConfig<{
  input: { leadId: number }
  output: { delivered: number }
}> = {
  slug: 'notifyLead',
  label: '推送新线索到群机器人',
  inputSchema: [{ name: 'leadId', type: 'number', required: true }],
  outputSchema: [{ name: 'delivered', type: 'number' }],
  retries: NOTIFY_LEAD_RETRIES,
  handler: async ({ input, req }) => ({ output: await notifyLead(req.payload, input.leadId) }),
}
