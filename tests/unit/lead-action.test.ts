import { headers } from 'next/headers'
import { after } from 'next/server'
import { type Payload } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { zh } from '@/i18n/zh'
import { submitLeadAction } from '@/lib/lead/actions'
import { submitLead } from '@/lib/lead/submit'
import { getPayloadClient } from '@/lib/payload'

vi.mock('next/headers', () => ({ headers: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/lib/payload', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/lead/submit', () => ({ submitLead: vi.fn() }))

type RequestHeaders = Awaited<ReturnType<typeof headers>>

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
const fakePayload = { logger, jobs: { runByID: vi.fn() } } as unknown as Payload

const idle = { status: 'idle' } as const
const formData = () => {
  const data = new FormData()
  data.set('name', '张同学')
  data.set('phone', '13800138000')
  data.set('consent', 'on')
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(headers).mockResolvedValue(
    new Headers({ 'user-agent': 'vitest' }) as unknown as RequestHeaders,
  )
  vi.mocked(getPayloadClient).mockResolvedValue(fakePayload)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('留资 Server Action', () => {
  it('读取请求头失败时返回通用错误，而不是让 Action reject', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(headers).mockRejectedValue(new Error('headers() 只能在请求上下文中调用'))
    await expect(submitLeadAction(idle, formData())).resolves.toEqual({
      status: 'error',
      message: zh.lead.errors.generic,
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('Payload 初始化失败（如数据库不可用）时返回通用错误', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getPayloadClient).mockRejectedValue(new Error('数据库连接失败'))
    await expect(submitLeadAction(idle, formData())).resolves.toEqual({
      status: 'error',
      message: zh.lead.errors.generic,
    })
    expect(submitLead).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('写入时抛出异常：记录日志并返回通用错误', async () => {
    vi.mocked(submitLead).mockRejectedValue(new Error('写入失败'))
    await expect(submitLeadAction(idle, formData())).resolves.toEqual({
      status: 'error',
      message: zh.lead.errors.generic,
    })
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it('校验失败但没有可标出的字段时给通用提示，有字段错误时提示检查标出的信息', async () => {
    vi.mocked(submitLead).mockResolvedValueOnce({ status: 'invalid', fieldErrors: {} })
    expect(await submitLeadAction(idle, formData())).toMatchObject({
      status: 'error',
      message: zh.lead.errors.generic,
    })
    vi.mocked(submitLead).mockResolvedValueOnce({
      status: 'invalid',
      fieldErrors: { phone: zh.lead.errors.phoneInvalid },
    })
    expect(await submitLeadAction(idle, formData())).toEqual({
      status: 'error',
      message: zh.lead.errors.formInvalid,
      fieldErrors: { phone: zh.lead.errors.phoneInvalid },
    })
  })

  it('提交成功且有推送任务时在响应后执行任务', async () => {
    vi.mocked(submitLead).mockResolvedValue({ status: 'success', leadId: 1, jobId: 9 })
    const result = await submitLeadAction(idle, formData())
    expect(result).toMatchObject({ status: 'success' })
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('线索已写入但无法安排响应后推送时仍返回成功，只记录日志', async () => {
    vi.mocked(submitLead).mockResolvedValue({ status: 'success', leadId: 1, jobId: 9 })
    vi.mocked(after).mockImplementationOnce(() => {
      throw new Error('`after()` will not work correctly, because `waitUntil` is not available')
    })
    const result = await submitLeadAction(idle, formData())
    expect(result).toMatchObject({ status: 'success' })
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it('未声明可信代理时以未知 IP 提交，交给兜底限流', async () => {
    vi.stubEnv('TRUST_PROXY', 'false')
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        'user-agent': 'vitest',
        'x-forwarded-for': '203.0.113.9',
      }) as unknown as RequestHeaders,
    )
    vi.mocked(submitLead).mockResolvedValue({ status: 'rejected', reason: 'rate_limited' })
    expect(await submitLeadAction(idle, formData())).toEqual({
      status: 'error',
      message: zh.lead.errors.rateLimited,
    })
    expect(vi.mocked(submitLead).mock.calls[0]?.[2]).toMatchObject({
      ip: 'unknown',
      userAgent: 'vitest',
    })
  })

  it('声明可信代理时取 X-Forwarded-For 最后一个地址', async () => {
    vi.stubEnv('TRUST_PROXY', 'true')
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-forwarded-for': 'spoof, 203.0.113.9' }) as unknown as RequestHeaders,
    )
    vi.mocked(submitLead).mockResolvedValue({ status: 'rejected', reason: 'too_fast' })
    expect(await submitLeadAction(idle, formData())).toEqual({
      status: 'error',
      message: zh.lead.errors.tooFast,
    })
    expect(vi.mocked(submitLead).mock.calls[0]?.[2]).toMatchObject({ ip: '203.0.113.9' })
  })
})
