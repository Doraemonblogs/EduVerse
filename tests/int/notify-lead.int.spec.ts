import {
  createLocalReq,
  getPayload,
  type Endpoint,
  type Payload,
  type PayloadRequest,
} from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getSiteUrl } from '@/config/site'
import { shouldAutoRunJobs } from '@/jobs/config'
import { NOTIFY_LEAD_RETRIES, notifyLeadTask } from '@/jobs/notify-lead'
import { recoverStaleJobs, STALE_JOB_AFTER_MS } from '@/jobs/recover-stale-jobs'
import { type Lead, type LeadSetting, type User } from '@/payload-types'
import config from '@/payload.config'

/**
 * 群机器人推送任务集成测试：真实读写测试库中的线索与留资设置，
 * 用 vi.stubGlobal 替换全局 fetch 模拟企业微信 / 飞书的返回，不会发出真实请求。
 */
let payload: Payload
let originalWebhooks: LeadSetting['webhooks']
const createdLeadIds: number[] = []
const createdJobIds: (number | string)[] = []
const createdUserIds: number[] = []

const RUN = Date.now().toString(36)
/** 本文件专用的任务队列：按队列执行时不会碰到其他测试排队的任务 */
const TEST_QUEUE = `notify-int-${RUN}`

const WECOM_HOST = 'qyapi.weixin.qq.com'
const FEISHU_HOST = 'open.feishu.cn'
const DINGTALK_HOST = 'oapi.dingtalk.com'
const WECOM_URL = `https://${WECOM_HOST}/cgi-bin/webhook/send?key=int-test-0000`
const FEISHU_URL = `https://${FEISHU_HOST}/open-apis/bot/v2/hook/int-test-0000`
const DINGTALK_URL = `https://${DINGTALK_HOST}/robot/send?access_token=int-test-0000`

const WECOM_TARGET = `推送测试企微群（${WECOM_HOST}）`
const FEISHU_TARGET = `推送测试飞书群（${FEISHU_HOST}）`

/** 飞书是否返回成功（用来模拟“先失败、重试成功”） */
let feishuOk = false

const fetchMock = vi.fn<typeof fetch>(async (input) => {
  const host = new URL(String(input)).hostname
  const body =
    host === FEISHU_HOST
      ? feishuOk
        ? { code: 0, data: {}, msg: 'success' }
        : { code: 19021, msg: 'sign match fail or timestamp is not within one hour' }
      : { errcode: 0, errmsg: 'ok' }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

const calledHosts = () => fetchMock.mock.calls.map(([input]) => new URL(String(input)).hostname)

const bodyFor = (host: string): Record<string, unknown> => {
  const call = fetchMock.mock.calls.find(([input]) => new URL(String(input)).hostname === host)
  return JSON.parse(String(call?.[1]?.body ?? '{}')) as Record<string, unknown>
}

async function createLead(
  name: string,
  { pageUrl = 'https://www.example.com/courses' }: { pageUrl?: string } = {},
): Promise<Lead> {
  const lead = await payload.create({
    collection: 'leads',
    overrideAccess: true,
    data: {
      name,
      phone: '13900139000',
      intent: 'tuition',
      city: '杭州',
      message: '想了解学费与分期方式',
      status: 'new',
      source: { position: 'home_hero', pageUrl },
      client: { ip: '203.0.113.9', userAgent: 'IntTest/1.0' },
      consent: { agreed: true, policyVersion: 'test', agreedAt: new Date().toISOString() },
    },
  })
  createdLeadIds.push(lead.id)
  return lead
}

const deliveriesOf = async (id: number) => {
  const lead = await payload.findByID({ collection: 'leads', id, depth: 0, overrideAccess: true })
  return new Map((lead.webhookDeliveries ?? []).map((d) => [d.target, d]))
}

/** waitUntil 距现在的秒数 */
const waitSeconds = (waitUntil: string | null | undefined) =>
  waitUntil ? (new Date(waitUntil).getTime() - Date.now()) / 1000 : Number.NaN

const findJob = (id: number | string) =>
  payload.findByID({
    collection: 'payload-jobs',
    id,
    overrideAccess: true,
    disableErrors: true,
  })

/** 按任务队列的调用方式直接执行 handler（job 为真实入队的任务记录） */
async function runHandler(leadId: number) {
  const handler = notifyLeadTask.handler
  if (typeof handler !== 'function') throw new Error('notifyLeadTask.handler 应为函数')
  const job = await payload.jobs.queue({ task: 'notifyLead', input: { leadId } })
  createdJobIds.push(job.id)
  const unused = async (): Promise<never> => {
    throw new Error('notifyLead 不应调用子任务')
  }
  type HandlerArgs = Parameters<typeof handler>[0]
  return handler({
    input: { leadId },
    // Payload 的 TaskHandler 把 job 声明为工作流任务类型，与 queue() 返回的单任务类型不兼容，运行时是同一份记录
    job: job as unknown as HandlerArgs['job'],
    req: await createLocalReq({}, payload),
    inlineTask: unused,
    tasks: { inline: unused, notifyLead: unused },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const settings = await payload.findGlobal({ slug: 'lead-settings', depth: 0 })
  originalWebhooks = settings.webhooks
  await payload.updateGlobal({
    slug: 'lead-settings',
    context: { disableRevalidate: true },
    data: {
      webhooks: [
        {
          name: '推送测试企微群',
          platform: 'wecom',
          url: WECOM_URL,
          enabled: true,
          maskPhone: true,
        },
        {
          name: '推送测试飞书群',
          platform: 'feishu',
          url: FEISHU_URL,
          secret: 'int-test-secret',
          enabled: true,
          maskPhone: false,
        },
        {
          name: '推送测试停用群',
          platform: 'dingtalk',
          url: DINGTALK_URL,
          enabled: false,
          maskPhone: true,
        },
      ],
    },
  })
  vi.stubGlobal('fetch', fetchMock)
})

beforeEach(() => {
  fetchMock.mockClear()
})

afterAll(async () => {
  vi.unstubAllGlobals()
  if (!payload) return
  if (createdUserIds.length > 0) {
    await payload.delete({
      collection: 'users',
      where: { id: { in: createdUserIds } },
      overrideAccess: true,
    })
  }
  if (createdJobIds.length > 0) {
    await payload.delete({
      collection: 'payload-jobs',
      where: { id: { in: createdJobIds } },
      overrideAccess: true,
    })
  }
  if (createdLeadIds.length > 0) {
    await payload.delete({
      collection: 'leads',
      where: { id: { in: createdLeadIds } },
      overrideAccess: true,
    })
  }
  await payload.updateGlobal({
    slug: 'lead-settings',
    context: { disableRevalidate: true },
    data: { webhooks: originalWebhooks ?? [] },
  })
  await payload.db.destroy?.()
})

describe('notifyLead 任务：直接执行 handler', () => {
  let lead: Lead

  beforeAll(async () => {
    lead = await createLead('推送测试甲')
  })

  it('推送到所有启用的机器人，有目标失败时抛错，结果记在线索上', async () => {
    feishuOk = false
    await expect(runHandler(lead.id)).rejects.toThrow(FEISHU_TARGET)

    // 停用的钉钉机器人不推送
    expect(calledHosts().sort()).toEqual([FEISHU_HOST, WECOM_HOST].sort())

    // 企业微信：markdown 消息，手机号脱敏，带后台链接，不含 IP 与 UA
    const wecom = bodyFor(WECOM_HOST) as { msgtype: string; markdown: { content: string } }
    expect(wecom.msgtype).toBe('markdown')
    expect(wecom.markdown.content).toContain('姓名：推送测试甲')
    expect(wecom.markdown.content).toContain('手机号：139****9000')
    expect(wecom.markdown.content).toContain('意向：咨询学费')
    expect(wecom.markdown.content).toContain(`/admin/collections/leads/${lead.id}`)
    expect(wecom.markdown.content).not.toContain('203.0.113.9')
    expect(wecom.markdown.content).not.toContain('IntTest')
    // 浏览器上报的提交页面不是本站地址：整行省略，不把外站链接推送到群里
    expect(wecom.markdown.content).not.toContain('提交页面')
    expect(wecom.markdown.content).not.toContain('www.example.com')

    // 飞书：关闭脱敏时推送完整手机号，并附带签名
    const feishu = bodyFor(FEISHU_HOST) as { content: { text: string }; sign?: string }
    expect(feishu.content.text).toContain('手机号：13900139000')
    expect(feishu.sign).toEqual(expect.any(String))

    const deliveries = await deliveriesOf(lead.id)
    expect(deliveries.size).toBe(2)
    expect(deliveries.get(WECOM_TARGET)).toMatchObject({
      status: 'success',
      attempts: 1,
      lastError: null,
    })
    expect(deliveries.get(FEISHU_TARGET)).toMatchObject({ status: 'failed', attempts: 1 })
    expect(deliveries.get(FEISHU_TARGET)?.lastError).toContain('19021')
    expect(deliveries.get(FEISHU_TARGET)?.at).toEqual(expect.any(String))
  })

  it('重试时只推送给之前失败的目标，已成功的不会重复发送', async () => {
    feishuOk = true
    await expect(runHandler(lead.id)).resolves.toEqual({ output: { delivered: 1 } })
    expect(calledHosts()).toEqual([FEISHU_HOST])

    const deliveries = await deliveriesOf(lead.id)
    expect(deliveries.size).toBe(2)
    expect(deliveries.get(WECOM_TARGET)).toMatchObject({ status: 'success', attempts: 1 })
    expect(deliveries.get(FEISHU_TARGET)).toMatchObject({
      status: 'success',
      attempts: 2,
      lastError: null,
    })
  })

  it('全部推送成功后再次执行不发送任何请求', async () => {
    await expect(runHandler(lead.id)).resolves.toEqual({ output: { delivered: 0 } })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('提交页面是本站地址时按站点地址重建后推送（去掉 # 片段）', async () => {
    const site = getSiteUrl()
    const own = await createLead('推送测试本站页面', {
      pageUrl: `${site}/courses/3d-animation?utm_source=int#apply`,
    })
    feishuOk = true
    await expect(runHandler(own.id)).resolves.toEqual({ output: { delivered: 2 } })
    const feishu = bodyFor(FEISHU_HOST) as { content: { text: string } }
    expect(feishu.content.text).toContain(`提交页面：${site}/courses/3d-animation?utm_source=int\n`)
  })

  it('线索已被删除时直接结束，不推送也不抛错', async () => {
    const removed = await createLead('推送测试已删除')
    await payload.delete({ collection: 'leads', id: removed.id, overrideAccess: true })
    await expect(runHandler(removed.id)).resolves.toEqual({ output: { delivered: 0 } })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('notifyLead 任务：通过任务队列运行', () => {
  it('推送失败时任务保留等待重试，重试成功后任务完成', async () => {
    const lead = await createLead('推送测试乙')
    feishuOk = false
    const job = await payload.jobs.queue({ task: 'notifyLead', input: { leadId: lead.id } })
    createdJobIds.push(job.id)

    await payload.jobs.runByID({ id: job.id, silent: true })
    const pending = await payload.findByID({
      collection: 'payload-jobs',
      id: job.id,
      overrideAccess: true,
      disableErrors: true,
    })
    expect(pending).not.toBeNull()
    expect(pending?.completedAt ?? null).toBeNull()
    expect(pending?.hasError).toBe(false)
    expect(pending?.totalTried).toBe(1)
    // 指数退避：第一次失败后约 1 分钟再重试（定时任务只领取已到时间的任务）
    expect(waitSeconds(pending?.waitUntil)).toBeGreaterThan(50)
    expect(waitSeconds(pending?.waitUntil)).toBeLessThanOrEqual(60)
    const failedLog = (pending?.log ?? []).find((entry) => entry.state === 'failed')
    expect(JSON.stringify(failedLog?.error)).toContain(FEISHU_TARGET)

    fetchMock.mockClear()
    feishuOk = true
    await payload.jobs.runByID({ id: job.id, silent: true })
    expect(calledHosts()).toEqual([FEISHU_HOST])

    // deleteJobOnComplete：完成的任务会被删除
    const done = await payload.findByID({
      collection: 'payload-jobs',
      id: job.id,
      overrideAccess: true,
      disableErrors: true,
    })
    expect(done).toBeNull()

    const deliveries = await deliveriesOf(lead.id)
    expect(deliveries.get(WECOM_TARGET)).toMatchObject({ status: 'success', attempts: 1 })
    expect(deliveries.get(FEISHU_TARGET)).toMatchObject({ status: 'success', attempts: 2 })
  })
})

describe('notifyLead 任务：退避重试', () => {
  it('失败后按 1、2、4、8、16 分钟递增等待，重试 5 次仍失败后标记为最终失败', async () => {
    const lead = await createLead('推送测试退避')
    feishuOk = false
    const job = await payload.jobs.queue({
      task: 'notifyLead',
      input: { leadId: lead.id },
      queue: TEST_QUEUE,
    })
    createdJobIds.push(job.id)

    const expectedWaits = [1, 2, 4, 8, 16].map((minutes) => minutes * 60)
    expect(expectedWaits).toHaveLength(NOTIFY_LEAD_RETRIES.attempts)
    for (const [index, expected] of expectedWaits.entries()) {
      // runByID 不受 waitUntil 限制，可以直接驱动下一次重试
      await payload.jobs.runByID({ id: job.id, silent: true })
      const pending = await findJob(job.id)
      expect(pending?.totalTried).toBe(index + 1)
      expect(pending?.hasError).toBe(false)
      expect(waitSeconds(pending?.waitUntil)).toBeGreaterThan(expected - 10)
      expect(waitSeconds(pending?.waitUntil)).toBeLessThanOrEqual(expected)
    }

    // 未到 waitUntil 的任务，按队列执行（定时任务的方式）不会提前领取
    fetchMock.mockClear()
    await payload.jobs.run({ queue: TEST_QUEUE, limit: 20, silent: true })
    expect(fetchMock).not.toHaveBeenCalled()

    await payload.jobs.runByID({ id: job.id, silent: true })
    const failed = await findJob(job.id)
    expect(failed?.totalTried).toBe(NOTIFY_LEAD_RETRIES.attempts + 1)
    expect(failed?.hasError).toBe(true)

    const deliveries = await deliveriesOf(lead.id)
    expect(deliveries.get(WECOM_TARGET)).toMatchObject({ status: 'success', attempts: 1 })
    expect(deliveries.get(FEISHU_TARGET)).toMatchObject({
      status: 'failed',
      attempts: NOTIFY_LEAD_RETRIES.attempts + 1,
    })
  })
})

describe('任务队列接口权限', () => {
  const runEndpoint = () => {
    const endpoints = payload.collections['payload-jobs'].config.endpoints
    const endpoint = (endpoints || []).find(
      (e: Endpoint) => e.path === '/run' && e.method === 'get',
    )
    if (!endpoint) throw new Error('找不到 /api/payload-jobs/run')
    return endpoint
  }

  const userReq = async (user: User | null, query: Record<string, unknown> = {}) =>
    createLocalReq(
      {
        req: { query, headers: new Headers() } as Partial<PayloadRequest>,
        user: user ? { ...user, collection: 'users' } : undefined,
      },
      payload,
    )

  const createUser = async (key: string, role: User['role']) => {
    const user = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: `${key}-${RUN}@notify-int-test.eduverse.test`,
        password: 'Notify-Int-Test-Password-1',
        name: `${key}-${RUN}`,
        role,
      },
    })
    createdUserIds.push(user.id)
    return user
  }

  let admin: User
  let editor: User
  let consultant: User

  beforeAll(async () => {
    // 先建管理员：用户表为空时第一个账号会被自动设为管理员
    admin = await createUser('admin', 'admin')
    editor = await createUser('editor', 'editor')
    consultant = await createUser('consultant', 'consultant')
  })

  it('内容编辑、课程顾问与未登录访客不能通过 REST 触发任务执行', async () => {
    const endpoint = runEndpoint()
    for (const user of [editor, consultant, null]) {
      const response = await endpoint.handler(await userReq(user, { queue: TEST_QUEUE }))
      expect(response.status).toBe(401)
    }
  })

  it('管理员可以通过 REST 触发任务执行', async () => {
    // 指定本文件专用的空队列，不会执行其他测试的任务
    const response = await runEndpoint().handler(
      await userReq(admin, { queue: `${TEST_QUEUE}-empty` }),
    )
    expect(response.status).toBe(200)
  })

  it('以非管理员身份调用 Local API（overrideAccess: false）会被拒绝', async () => {
    const req = await userReq(editor)
    await expect(
      payload.jobs.run({ queue: TEST_QUEUE, overrideAccess: false, req, silent: true }),
    ).rejects.toThrow()
    await expect(
      payload.jobs.queue({
        task: 'notifyLead',
        input: { leadId: 0 },
        queue: TEST_QUEUE,
        overrideAccess: false,
        req,
      }),
    ).rejects.toThrow()
  })

  it('定时任务（按队列执行）与提交后的 runByID 不受接口权限影响', async () => {
    feishuOk = true
    const first = await createLead('推送测试定时')
    const queued = await payload.jobs.queue({
      task: 'notifyLead',
      input: { leadId: first.id },
      queue: TEST_QUEUE,
    })
    createdJobIds.push(queued.id)
    // 与 autoRun 的调用方式一致：不传 req，默认 overrideAccess
    await payload.jobs.run({ queue: TEST_QUEUE, limit: 20, silent: true })
    expect(await findJob(queued.id)).toBeNull()
    expect((await deliveriesOf(first.id)).get(FEISHU_TARGET)).toMatchObject({ status: 'success' })

    const second = await createLead('推送测试立即')
    const byId = await payload.jobs.queue({ task: 'notifyLead', input: { leadId: second.id } })
    createdJobIds.push(byId.id)
    await payload.jobs.runByID({ id: byId.id, silent: true })
    expect(await findJob(byId.id)).toBeNull()
  })
})

describe('执行中断的任务回收', () => {
  /** 模拟进程在执行中被重启：任务停在 processing=true，updatedAt 停在 ageMs 之前 */
  async function stuckJob(leadId: number, ageMs: number, extra: Record<string, unknown> = {}) {
    const job = await payload.jobs.queue({
      task: 'notifyLead',
      input: { leadId },
      queue: TEST_QUEUE,
    })
    createdJobIds.push(job.id)
    await payload.db.updateJobs({
      id: job.id,
      data: {
        processing: true,
        totalTried: 0,
        updatedAt: new Date(Date.now() - ageMs).toISOString(),
        ...extra,
      },
      returning: false,
    })
    return job.id
  }

  it('定时任务的运行条件已接入回收逻辑', () => {
    expect(payload.config.jobs.shouldAutoRun).toBe(shouldAutoRunJobs)
  })

  it('超过 10 分钟仍在“处理中”的任务被放回队列，之后由定时任务正常执行', async () => {
    feishuOk = true
    const lead = await createLead('推送测试中断')
    const stale = await stuckJob(lead.id, STALE_JOB_AFTER_MS + 60_000)
    const fresh = await stuckJob(lead.id, 60_000)
    const failed = await stuckJob(lead.id, STALE_JOB_AFTER_MS + 60_000, { hasError: true })

    // 回收前：定时任务跳过处理中的任务
    await payload.jobs.run({ queue: TEST_QUEUE, limit: 20, silent: true })
    expect((await findJob(stale))?.processing).toBe(true)

    const recovered = await recoverStaleJobs(payload)
    expect(recovered).toContain(stale)
    expect(recovered).not.toContain(fresh)
    expect(recovered).not.toContain(failed)
    expect((await findJob(fresh))?.processing).toBe(true)
    expect((await findJob(failed))?.processing).toBe(true)

    const reset = await findJob(stale)
    expect(reset?.processing).toBe(false)
    expect(Date.now() - new Date(reset?.updatedAt ?? 0).getTime()).toBeLessThan(60_000)

    // 再次回收不会重复处理
    expect(await recoverStaleJobs(payload)).not.toContain(stale)

    fetchMock.mockClear()
    await payload.jobs.run({ queue: TEST_QUEUE, limit: 20, silent: true })
    expect(await findJob(stale)).toBeNull()
    expect(calledHosts().sort()).toEqual([FEISHU_HOST, WECOM_HOST].sort())
    expect((await deliveriesOf(lead.id)).get(FEISHU_TARGET)).toMatchObject({ status: 'success' })
  })
})
