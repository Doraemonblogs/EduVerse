import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { notifyLead } from '@/jobs/notify-lead'
import { BurstLimiter, KeyedMutex } from '@/lib/lead/burst-limiter'
import { submitLead, type SubmitGuards } from '@/lib/lead/submit'
import type { Lead, User } from '@/payload-types'
import config from '@/payload.config'

import { generatePlaceholder } from '../../scripts/seed/placeholders'

/**
 * 留资提交核心流程（集成）：真实 Payload + 测试库。
 * 每个用例使用独立的进程内限流器与手机号锁，避免互相影响。
 */
let payload: Payload
let disciplineId: number
let draftDisciplineId: number
let consultant: User
let admin: User
let demotedConsultant: User
let inactiveConsultant: User

const PHONE_PREFIX = '1990000'
const phone = (n: number) => `${PHONE_PREFIX}${String(n).padStart(4, '0')}`
const ctx = (ip = '203.0.113.10') => ({ ip, userAgent: 'vitest', now: Date.now() })
const limiter = (overrides: Partial<SubmitGuards> = {}): SubmitGuards => ({
  ipLimiter: new BurstLimiter(100, 60_000),
  unknownIpLimiter: new BurstLimiter(100, 60_000),
  phoneLock: new KeyedMutex(),
  ...overrides,
})

const form = (overrides: Record<string, unknown> = {}) => ({
  name: '测试同学',
  phone: phone(1),
  consent: 'on',
  intent: 'trial',
  position: 'header_cta',
  pageUrl: 'http://localhost/courses/x',
  landingUrl: 'http://localhost/?utm_source=baidu',
  referrer: 'https://www.baidu.com/',
  utmSource: 'baidu',
  utmCampaign: 'spring',
  fillMs: '10000',
  website: '',
  ...overrides,
})

const cleanLeads = () =>
  payload.delete({ collection: 'leads', where: { phone: { like: PHONE_PREFIX } } })

const setLimits = (rateLimits: Record<string, number>, webhooks: unknown[] = []) =>
  payload.updateGlobal({
    slug: 'lead-settings',
    data: {
      rateLimits: {
        ipPer10Min: 5,
        ipPerDay: 30,
        phonePerDay: 3,
        duplicateWindowDays: 30,
        minFillSeconds: 2,
        ...rateLimits,
      },
      webhooks: webhooks as never,
    },
  })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const image = await generatePlaceholder(
    { kind: 'art', seed: 'lead-int', hue: 30, aspect: '1:1', label: '测试', size: 64 },
    'seed-lead-int',
  )
  const cover = await payload.create({
    collection: 'media',
    data: { alt: '测试封面' },
    file: {
      data: image.data,
      mimetype: image.mimetype,
      name: image.filename,
      size: image.data.length,
    },
  })
  await payload.delete({
    collection: 'disciplines',
    where: { slug: { in: ['lead-int-pub', 'lead-int-draft'] } },
  })
  disciplineId = (
    await payload.create({
      collection: 'disciplines',
      data: { name: '留资测试方向', slug: 'lead-int-pub', cover: cover.id, _status: 'published' },
    })
  ).id
  draftDisciplineId = (
    await payload.create({
      collection: 'disciplines',
      draft: true,
      data: { name: '草稿方向', slug: 'lead-int-draft', cover: cover.id, _status: 'draft' },
    })
  ).id
  await payload.delete({ collection: 'users', where: { email: { like: '@lead-int.test' } } })
  admin = await payload.create({
    collection: 'users',
    data: { email: 'admin@lead-int.test', password: 'Lead-Int-1', name: '管理员', role: 'admin' },
  })
  consultant = await payload.create({
    collection: 'users',
    data: { email: 'c@lead-int.test', password: 'Lead-Int-1', name: '顾问', role: 'consultant' },
  })
  demotedConsultant = await payload.create({
    collection: 'users',
    data: {
      email: 'c2@lead-int.test',
      password: 'Lead-Int-1',
      name: '转岗顾问',
      role: 'consultant',
    },
  })
  inactiveConsultant = await payload.create({
    collection: 'users',
    data: {
      email: 'c3@lead-int.test',
      password: 'Lead-Int-1',
      name: '离职顾问',
      role: 'consultant',
    },
  })
}, 60_000)

beforeEach(async () => {
  await cleanLeads()
  await setLimits({})
})

afterAll(async () => {
  await cleanLeads()
  await setLimits({})
  await payload?.delete({ collection: 'users', where: { email: { like: '@lead-int.test' } } })
  await payload?.db.destroy?.()
})

describe('留资提交', () => {
  it('写入线索并记录来源、同意记录与客户端信息', async () => {
    const result = await submitLead(
      payload,
      form({ discipline: String(disciplineId) }),
      ctx(),
      limiter(),
    )
    expect(result.status).toBe('success')
    const lead = await payload.findByID({
      collection: 'leads',
      id: (result as { leadId: number }).leadId,
      depth: 0,
    })
    expect(lead).toMatchObject({
      name: '测试同学',
      phone: phone(1),
      intent: 'trial',
      status: 'new',
      discipline: disciplineId,
      isDuplicate: false,
      source: {
        position: 'header_cta',
        pageUrl: 'http://localhost/courses/x',
        landingUrl: 'http://localhost/?utm_source=baidu',
        referrer: 'https://www.baidu.com/',
        utmSource: 'baidu',
        utmCampaign: 'spring',
      },
      client: { ip: '203.0.113.10', userAgent: 'vitest' },
      consent: { agreed: true },
    })
    expect(lead.consent?.policyVersion).toBeTruthy()
  })

  it('校验失败时返回字段错误，不写入', async () => {
    const result = await submitLead(payload, form({ phone: '123' }), ctx(), limiter())
    expect(result).toMatchObject({ status: 'invalid', fieldErrors: { phone: expect.any(String) } })
    expect(
      (await payload.count({ collection: 'leads', where: { phone: { like: PHONE_PREFIX } } }))
        .totalDocs,
    ).toBe(0)
  })

  it('蜜罐被填写时伪装成功，但不写入', async () => {
    const result = await submitLead(payload, form({ website: 'http://spam' }), ctx(), limiter())
    expect(result).toEqual({ status: 'success' })
    expect(
      (await payload.count({ collection: 'leads', where: { phone: { equals: phone(1) } } }))
        .totalDocs,
    ).toBe(0)
  })

  it('填写用时少于最短填写时间视为机器人', async () => {
    const result = await submitLead(payload, form({ fillMs: '300' }), ctx(), limiter())
    expect(result).toEqual({ status: 'rejected', reason: 'too_fast' })
  })

  it('填写用时未知（0、缺失或非法）时不按填写时间拒绝，与访客电脑时钟无关', async () => {
    for (const [i, fillMs] of ['', '0', 'abc', '-1'].entries()) {
      const r = await submitLead(
        payload,
        form({ phone: phone(70 + i), fillMs }),
        ctx(`192.0.2.${100 + i}`),
        limiter(),
      )
      expect(r.status).toBe('success')
    }
    // 旧版客户端提交的 startedAt（远在未来的时间戳）不再参与判断
    const legacy = await submitLead(
      payload,
      { ...form({ phone: phone(75) }), fillMs: undefined, startedAt: String(Date.now() + 300_000) },
      ctx('192.0.2.105'),
      limiter(),
    )
    expect(legacy.status).toBe('success')
  })

  it('手机号中的空格、连字符与 +86 前缀被去掉后入库', async () => {
    const r = await submitLead(
      payload,
      form({
        phone: `+86 ${phone(81).slice(0, 3)}-${phone(81).slice(3, 7)} ${phone(81).slice(7)}`,
      }),
      ctx('192.0.2.110'),
      limiter(),
    )
    expect(r.status).toBe('success')
    const lead = await payload.findByID({
      collection: 'leads',
      id: (r as { leadId: number }).leadId,
      depth: 0,
    })
    expect(lead.phone).toBe(phone(81))
  })

  it('自动采集的来源字段超长时截断入库，不拒绝提交', async () => {
    const longUrl = `http://localhost/courses/x?clickid=${'x'.repeat(900)}`
    const r = await submitLead(
      payload,
      form({
        phone: phone(82),
        pageUrl: longUrl,
        landingUrl: longUrl,
        referrer: longUrl,
        utmCampaign: 'c'.repeat(300),
      }),
      ctx('192.0.2.111'),
      limiter(),
    )
    expect(r.status).toBe('success')
    const lead = await payload.findByID({
      collection: 'leads',
      id: (r as { leadId: number }).leadId,
      depth: 0,
    })
    expect(lead.source?.pageUrl).toHaveLength(500)
    expect(lead.source?.landingUrl).toHaveLength(500)
    expect(lead.source?.referrer).toHaveLength(500)
    expect(lead.source?.utmCampaign).toHaveLength(100)
  })

  it('同一手机号 24 小时内超过上限被拒绝', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await submitLead(payload, form(), ctx(`198.51.100.${i}`), limiter())
      expect(r.status).toBe('success')
    }
    const blocked = await submitLead(payload, form(), ctx('198.51.100.99'), limiter())
    expect(blocked).toEqual({ status: 'rejected', reason: 'rate_limited' })
  })

  it('同一 IP 10 分钟内超过上限被拒绝；IP 未知时不按 IP 计数', async () => {
    await setLimits({ ipPer10Min: 2 })
    expect(
      (await submitLead(payload, form({ phone: phone(11) }), ctx('192.0.2.1'), limiter())).status,
    ).toBe('success')
    expect(
      (await submitLead(payload, form({ phone: phone(12) }), ctx('192.0.2.1'), limiter())).status,
    ).toBe('success')
    expect(
      await submitLead(payload, form({ phone: phone(13) }), ctx('192.0.2.1'), limiter()),
    ).toEqual({
      status: 'rejected',
      reason: 'rate_limited',
    })
    expect(
      (await submitLead(payload, form({ phone: phone(14) }), ctx('unknown'), limiter())).status,
    ).toBe('success')
  })

  it('进程内突发限流拦截连续提交', async () => {
    const guards = limiter({ ipLimiter: new BurstLimiter(1, 60_000) })
    expect(
      (await submitLead(payload, form({ phone: phone(21) }), ctx('192.0.2.50'), guards)).status,
    ).toBe('success')
    expect(
      await submitLead(payload, form({ phone: phone(22) }), ctx('192.0.2.50'), guards),
    ).toEqual({
      status: 'rejected',
      reason: 'rate_limited',
    })
  })

  it('IP 未知时所有访客共用兜底突发限流，可识别 IP 的访客不受影响', async () => {
    const guards = limiter({ unknownIpLimiter: new BurstLimiter(2, 60_000) })
    for (const n of [23, 24]) {
      expect(
        (await submitLead(payload, form({ phone: phone(n) }), ctx('unknown'), guards)).status,
      ).toBe('success')
    }
    expect(await submitLead(payload, form({ phone: phone(25) }), ctx('unknown'), guards)).toEqual({
      status: 'rejected',
      reason: 'rate_limited',
    })
    expect(
      (await submitLead(payload, form({ phone: phone(26) }), ctx('192.0.2.51'), guards)).status,
    ).toBe('success')
  })

  it('同一手机号并发提交时串行判定：不超过每日上限，后到的标记为重复', async () => {
    const guards = limiter()
    const results = await Promise.all(
      [0, 1, 2, 3, 4].map((i) =>
        submitLead(payload, form({ phone: phone(27) }), ctx(`192.0.2.${120 + i}`), guards),
      ),
    )
    const succeeded = results.filter((r) => r.status === 'success')
    expect(succeeded).toHaveLength(3)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(2)
    expect(succeeded.filter((r) => r.status === 'success' && r.duplicate)).toHaveLength(2)
    expect(
      (await payload.count({ collection: 'leads', where: { phone: { equals: phone(27) } } }))
        .totalDocs,
    ).toBe(3)
  })

  it('30 天内同一手机号再次提交：标记重复并交给原负责顾问', async () => {
    const first = await submitLead(
      payload,
      form({ phone: phone(31) }),
      ctx('192.0.2.60'),
      limiter(),
    )
    const firstId = (first as { leadId: number }).leadId
    await payload.update({ collection: 'leads', id: firstId, data: { assignedTo: consultant.id } })

    const second = await submitLead(
      payload,
      form({ phone: phone(31), intent: 'tuition' }),
      ctx('192.0.2.61'),
      limiter(),
    )
    expect(second).toMatchObject({ status: 'success', duplicate: true })
    const lead = await payload.findByID({
      collection: 'leads',
      id: (second as { leadId: number }).leadId,
      depth: 0,
    })
    expect(lead).toMatchObject({
      isDuplicate: true,
      duplicateOf: firstId,
      assignedTo: consultant.id,
      intent: 'tuition',
    })
  })

  it.each([
    ['角色已改为内容编辑', 'demoted'],
    ['账号已停用', 'inactive'],
  ] as const)('原负责顾问%s时：仍标记重复，但不沿用负责人，提交不失败', async (_label, kind) => {
    const n = kind === 'demoted' ? 32 : 33
    const owner = kind === 'demoted' ? demotedConsultant : inactiveConsultant
    const first = await submitLead(
      payload,
      form({ phone: phone(n) }),
      ctx(`192.0.2.${62 + n}`),
      limiter(),
    )
    const firstId = (first as { leadId: number }).leadId
    await payload.update({ collection: 'leads', id: firstId, data: { assignedTo: owner.id } })
    await payload.update({
      collection: 'users',
      id: owner.id,
      data: kind === 'demoted' ? { role: 'editor' } : { active: false },
    })

    try {
      const second = await submitLead(
        payload,
        form({ phone: phone(n) }),
        ctx(`192.0.2.${72 + n}`),
        limiter(),
      )
      expect(second).toMatchObject({ status: 'success', duplicate: true })
      const lead = await payload.findByID({
        collection: 'leads',
        id: (second as { leadId: number }).leadId,
        depth: 0,
      })
      expect(lead).toMatchObject({ isDuplicate: true, duplicateOf: firstId })
      expect(lead.assignedTo ?? null).toBeNull()
    } finally {
      await payload.update({
        collection: 'users',
        id: owner.id,
        data: { role: 'consultant', active: true },
      })
    }
  })

  it('只接受已发布内容的关联，草稿或不存在的 ID 被忽略', async () => {
    const r1 = await submitLead(
      payload,
      form({ phone: phone(41), discipline: String(draftDisciplineId) }),
      ctx(),
      limiter(),
    )
    const r2 = await submitLead(
      payload,
      form({ phone: phone(42), discipline: '99999999' }),
      ctx('192.0.2.70'),
      limiter(),
    )
    for (const r of [r1, r2]) {
      const lead = await payload.findByID({
        collection: 'leads',
        id: (r as { leadId: number }).leadId,
        depth: 0,
      })
      expect(lead.discipline ?? null).toBeNull()
    }
  })

  it('启用群机器人时排队推送任务', async () => {
    await setLimits({}, [
      {
        name: '测试群',
        platform: 'wecom',
        url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test',
        enabled: true,
      },
    ])
    const result = await submitLead(
      payload,
      form({ phone: phone(51) }),
      ctx('192.0.2.80'),
      limiter(),
    )
    expect(result.status).toBe('success')
    const jobId = (result as { jobId?: number | string }).jobId
    expect(jobId).toBeDefined()
    await payload.delete({ collection: 'payload-jobs', id: jobId! })
  })
})

describe('线索状态流转', () => {
  it('课程顾问不能回退状态，管理员可以', async () => {
    const r = await submitLead(payload, form({ phone: phone(61) }), ctx('192.0.2.90'), limiter())
    const id = (r as { leadId: number }).leadId
    await payload.update({
      collection: 'leads',
      id,
      data: { assignedTo: consultant.id, status: 'visited' },
    })

    await expect(
      payload.update({
        collection: 'leads',
        id,
        data: { status: 'new' },
        user: consultant,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const forward = await payload.update({
      collection: 'leads',
      id,
      data: { status: 'enrolled' },
      user: consultant,
      overrideAccess: false,
    })
    expect(forward.status).toBe('enrolled')

    const reverted = await payload.update({
      collection: 'leads',
      id,
      data: { status: 'contacted' },
      user: admin,
      overrideAccess: false,
    })
    expect(reverted.status).toBe('contacted')
  })
})

describe('跟进记录', () => {
  const followUpsOf = async (id: number) =>
    (await payload.findByID({ collection: 'leads', id, depth: 0, overrideAccess: true }))
      .followUps ?? []

  it('课程顾问提交 null 或非数组的跟进记录时，已有记录保持不变', async () => {
    const r = await submitLead(payload, form({ phone: phone(91) }), ctx('192.0.2.140'), limiter())
    const id = (r as { leadId: number }).leadId
    await payload.update({
      collection: 'leads',
      id,
      data: { assignedTo: consultant.id, followUps: [{ content: '管理员：首次电话沟通' }] },
      user: admin,
      overrideAccess: false,
    })
    expect(await followUpsOf(id)).toHaveLength(1)

    for (const value of [null, 5, 'x']) {
      await payload.update({
        collection: 'leads',
        id,
        data: { followUps: value as never },
        user: consultant,
        overrideAccess: false,
      })
      const rows = await followUpsOf(id)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.content).toBe('管理员：首次电话沟通')
    }

    // 顾问追加新记录仍然有效，且不能删除已有记录
    const stored = await followUpsOf(id)
    await payload.update({
      collection: 'leads',
      id,
      data: { followUps: [{ content: '顾问：已加微信' }] },
      user: consultant,
      overrideAccess: false,
    })
    const rows = await followUpsOf(id)
    expect(rows.map((row) => row.content)).toEqual(['管理员：首次电话沟通', '顾问：已加微信'])
    expect(rows[0]?.id).toBe(stored[0]?.id)
  })
})

describe('群机器人推送记录', () => {
  const WEBHOOK = {
    name: '推送记录测试群',
    platform: 'wecom',
    url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=lead-int-deliveries',
    enabled: true,
  }
  const okFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ errcode: 0, errmsg: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  const deliveriesOf = async (id: number): Promise<NonNullable<Lead['webhookDeliveries']>> =>
    (await payload.findByID({ collection: 'leads', id, depth: 0, overrideAccess: true }))
      .webhookDeliveries ?? []

  it('只能由推送任务写入：管理员在后台保存不会覆盖推送结果', async () => {
    const r = await submitLead(payload, form({ phone: phone(92) }), ctx('192.0.2.141'), limiter())
    const id = (r as { leadId: number }).leadId

    // 推送任务（overrideAccess）照常记录结果
    await setLimits({}, [WEBHOOK])
    expect(await notifyLead(payload, id, { fetchImpl: okFetch })).toEqual({ delivered: 1 })
    const recorded = await deliveriesOf(id)
    expect(recorded).toHaveLength(1)
    expect(recorded[0]).toMatchObject({ status: 'success', attempts: 1 })

    // 管理员保存时表单带回打开页面时的旧值（空数组 / 失败记录），推送结果保持不变，其它字段正常保存
    for (const stale of [[], [{ target: recorded[0]?.target, status: 'failed', attempts: 1 }]]) {
      const saved = await payload.update({
        collection: 'leads',
        id,
        data: { status: 'contacted', webhookDeliveries: stale as never },
        user: admin,
        overrideAccess: false,
      })
      expect(saved.status).toBe('contacted')
      expect(await deliveriesOf(id)).toEqual(recorded)
    }

    // 已成功的目标不会因为管理员保存而被重复推送
    expect(await notifyLead(payload, id, { fetchImpl: okFetch })).toEqual({ delivered: 0 })
  })

  it('管理员在后台新建线索时不能伪造推送记录', async () => {
    const lead = await payload.create({
      collection: 'leads',
      data: {
        name: '后台录入',
        phone: phone(93),
        intent: 'consult',
        status: 'new',
        webhookDeliveries: [{ target: '伪造', status: 'success', attempts: 1 }],
      },
      user: admin,
      overrideAccess: false,
    })
    expect(await deliveriesOf(lead.id)).toEqual([])
  })

  it('后台录入的手机号同样去掉空格与 +86 前缀', async () => {
    const raw = phone(94)
    const lead = await payload.create({
      collection: 'leads',
      data: {
        name: '后台录入',
        phone: `+86 ${raw.slice(0, 3)} ${raw.slice(3, 7)} ${raw.slice(7)}`,
        intent: 'consult',
        status: 'new',
      },
      user: admin,
      overrideAccess: false,
    })
    expect(lead.phone).toBe(raw)
  })
})

describe('留资设置', () => {
  const row = (i: number) => ({
    name: `限额测试群 ${i}`,
    platform: 'wecom' as const,
    url: `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=lead-int-${i}`,
    enabled: false,
  })

  it('群机器人超过 10 个时服务端拒绝保存（自定义校验不会绕过 maxRows）', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'lead-settings',
        data: { webhooks: Array.from({ length: 11 }, (_, i) => row(i)) },
      }),
    ).rejects.toThrow()
    const saved = await payload.updateGlobal({
      slug: 'lead-settings',
      data: { webhooks: Array.from({ length: 10 }, (_, i) => row(i)) },
    })
    expect(saved.webhooks).toHaveLength(10)
  })

  it('群机器人名称重复时拒绝保存', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'lead-settings',
        data: { webhooks: [row(1), { ...row(2), name: row(1).name }] },
      }),
    ).rejects.toThrow()
  })
})
