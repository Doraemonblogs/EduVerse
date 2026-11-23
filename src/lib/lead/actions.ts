'use server'

import { headers } from 'next/headers'
import { after } from 'next/server'
import { type Payload } from 'payload'

import { isStaticPreview } from '@/config/site'
import { zh } from '@/i18n/zh'
import { getPayloadClient } from '@/lib/payload'
import type { LeadFieldErrors } from '@/lib/validation/lead'

import { getClientIp, getUserAgent, UNKNOWN_IP, warnIfProxyUntrusted } from './client-info'
import { submitLead } from './submit'

export type LeadActionState =
  | { status: 'idle' }
  | { status: 'success'; submittedAt: number }
  | { status: 'error'; message: string; fieldErrors?: LeadFieldErrors }

/**
 * 留资 Server Action：前台唯一的线索写入入口（线索集合不开放公开 REST create）。
 * Next.js 会校验 Server Action 请求的 Origin，防止跨站提交。
 * 任何异常（读取请求头、初始化 Payload、写库）都转成错误状态返回，Action 本身不会 reject，
 * 表单总能显示提示，而不是停在“提交中”。
 */
export async function submitLeadAction(
  _previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  if (isStaticPreview) return { status: 'error', message: zh.lead.previewNotice }

  let payload: Payload | undefined
  try {
    const requestHeaders = await headers()
    payload = await getPayloadClient()
    const client = payload
    const ip = getClientIp(requestHeaders)
    if (ip === UNKNOWN_IP) warnIfProxyUntrusted(client.logger)

    const raw = Object.fromEntries(
      [...formData.entries()].filter(([, v]) => typeof v === 'string') as [string, string][],
    )
    const result = await submitLead(client, raw, {
      ip,
      userAgent: getUserAgent(requestHeaders),
    })

    if (result.status === 'success') {
      if (result.jobId !== undefined) {
        const jobId = result.jobId
        // 响应发出后立即执行推送任务；失败时由任务队列按配置重试。
        // 线索已经写入：after() 本身不可用（运行环境缺少 waitUntil 等）时只记日志，
        // 任务留在队列里由每分钟的定时任务执行，不能把成功报成失败，否则访客重试会产生重复线索。
        try {
          after(async () => {
            try {
              await client.jobs.runByID({ id: jobId })
            } catch (err) {
              client.logger.error({ err, jobId }, '线索推送任务执行失败，将由任务队列重试')
            }
          })
        } catch (err) {
          client.logger.error({ err, jobId }, '无法在响应后执行推送任务，将由定时任务执行')
        }
      }
      return { status: 'success', submittedAt: Date.now() }
    }
    if (result.status === 'invalid') {
      const hasFieldErrors = Object.keys(result.fieldErrors).length > 0
      return {
        status: 'error',
        // 没有可标出的字段（如隐藏字段异常）时给通用提示，避免“请检查标出的信息”却无处可查
        message: hasFieldErrors ? zh.lead.errors.formInvalid : zh.lead.errors.generic,
        fieldErrors: result.fieldErrors,
      }
    }
    return {
      status: 'error',
      message: result.reason === 'too_fast' ? zh.lead.errors.tooFast : zh.lead.errors.rateLimited,
    }
  } catch (err) {
    if (payload) payload.logger.error({ err }, '留资提交失败')
    else console.error('留资提交失败（Payload 未初始化）', err)
    return { status: 'error', message: zh.lead.errors.generic }
  }
}
