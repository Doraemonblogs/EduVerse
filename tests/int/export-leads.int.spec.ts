import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { EXPORT_HEADERS, EXPORT_MESSAGES, exportLeadsEndpoint } from '@/endpoints/export-leads'
import { LEAD_CSV_HEADERS, sanitizeCell, UTF8_BOM } from '@/lib/lead/csv'
import type { Lead, User } from '@/payload-types'
import config from '@/payload.config'

/**
 * 线索导出接口集成测试：以真实用户身份调用 GET /api/leads/export 的处理函数，
 * 校验权限过滤、筛选条件、CSV 内容与操作日志。只清理本文件创建的数据，可重复运行。
 */
let payload: Payload
let admin: User
let editor: User
let consultantA: User
let consultantB: User
let inactiveConsultant: User
const leads: Lead[] = []

const RUN = Date.now().toString(36)
const DOMAIN = 'export-int-test.eduverse.test'
const PASSWORD = 'Export-Int-Test-Password-1'
/** 本次运行创建的线索姓名都带这个标记，便于用搜索筛选 */
const MARK = `导出测${RUN}`

const createUser = (key: string, role: User['role'], extra: { active?: boolean } = {}) =>
  payload.create({
    collection: 'users',
    data: {
      email: `${key}-${RUN}@${DOMAIN}`,
      password: PASSWORD,
      name: `${key}-${RUN}`,
      role,
      ...extra,
    },
  })

const createLead = async (suffix: string, data: Partial<Lead> = {}) => {
  const lead = await payload.create({
    collection: 'leads',
    data: {
      name: `${MARK}${suffix}`,
      phone: '13900139000',
      intent: 'trial',
      status: 'new',
      consent: { agreed: true, policyVersion: 'test', agreedAt: new Date().toISOString() },
      ...data,
    },
  })
  leads.push(lead)
  return lead
}

async function callExport(
  user: User | null,
  query: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  const req = await createLocalReq(
    {
      req: { query, headers: new Headers(headers) } as Partial<PayloadRequest>,
      user: user ? { ...user, collection: 'users' } : undefined,
    },
    payload,
  )
  return exportLeadsEndpoint.handler(req)
}

/** 解析本模块生成的 CSV（每格都有引号，"" 表示一个引号，格内可含换行） */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\r' && text[i + 1] === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i++
    }
  }
  return rows
}

async function exportCsv(user: User, query: Record<string, unknown> = {}) {
  const response = await callExport(user, query)
  expect(response.status).toBe(200)
  // response.text() 会去掉 BOM，按字节读取才能确认 BOM 确实存在
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer())
  expect(text.startsWith(UTF8_BOM)).toBe(true)
  const [header, ...rows] = parseCsv(text.slice(1))
  expect(header).toEqual([...LEAD_CSV_HEADERS])
  return { response, text, rows, names: rows.map((r) => r[1]) }
}

const latestAuditLog = async (user: User) => {
  const { docs } = await payload.find({
    collection: 'audit-logs',
    where: { user: { equals: user.id } },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
  })
  return docs[0]
}

/** 本文件创建、但按 user 清理不到的操作日志（账号已删除） */
const orphanAuditLogIds: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  // 先建管理员：用户表为空时第一个账号会被自动设为管理员
  admin = await createUser('admin', 'admin')
  editor = await createUser('editor', 'editor')
  consultantA = await createUser('ca', 'consultant')
  consultantB = await createUser('cb', 'consultant')
  inactiveConsultant = await createUser('cx', 'consultant', { active: false })

  await createLead('甲一', {
    assignedTo: consultantA.id,
    city: '上海',
    message: '想了解周末班,学费多少？\n能分期吗',
    source: { pageUrl: '/courses/demo', position: 'course_sticky', utmSource: 'baidu' },
    client: { ip: '203.0.113.77', userAgent: 'ExportTestAgent/1.0' },
  })
  await createLead('甲二', { assignedTo: consultantA.id, status: 'contacted', intent: 'tuition' })
  await createLead('乙一', { assignedTo: consultantB.id })
  await createLead('未分配')
  // 恶意构造的姓名：导出后必须被当作文本
  await createLead('', { name: `=cmd|"/c ${RUN}"!A0` })
})

afterAll(async () => {
  if (payload) {
    const userIds = [admin, editor, consultantA, consultantB, inactiveConsultant]
      .filter(Boolean)
      .map((u) => u.id)
    if (leads.length > 0) {
      await payload.delete({ collection: 'leads', where: { id: { in: leads.map((l) => l.id) } } })
    }
    if (orphanAuditLogIds.length > 0) {
      await payload.delete({ collection: 'audit-logs', where: { id: { in: orphanAuditLogIds } } })
    }
    if (userIds.length > 0) {
      await payload.delete({ collection: 'audit-logs', where: { user: { in: userIds } } })
      await payload.delete({ collection: 'users', where: { id: { in: userIds } } })
    }
  }
  await payload?.db.destroy?.()
})

describe('线索导出权限', () => {
  it('未登录返回 401', async () => {
    const response = await callExport(null)
    expect(response.status).toBe(401)
  })

  it('内容编辑无权导出，返回 403', async () => {
    const response = await callExport(editor)
    expect(response.status).toBe(403)
    expect(await latestAuditLog(editor)).toBeUndefined()
  })

  it('已停用的顾问无权导出，返回 403', async () => {
    const response = await callExport(inactiveConsultant)
    expect(response.status).toBe(403)
  })

  it('课程顾问只能导出分配给自己的线索', async () => {
    const { names } = await exportCsv(consultantA)
    expect(names.sort()).toEqual([`${MARK}甲一`, `${MARK}甲二`].sort())
  })

  it('课程顾问即使筛选别人的线索也拿不到', async () => {
    const { rows } = await exportCsv(consultantA, {
      where: { assignedTo: { equals: String(consultantB.id) } },
    })
    expect(rows).toEqual([])
  })

  it('课程顾问不能按无权读取的字段（IP）筛选', async () => {
    const response = await callExport(consultantA, {
      where: { 'client.ip': { equals: '203.0.113.77' } },
    })
    expect(response.status).toBe(400)
  })

  it('管理员能导出全部线索', async () => {
    const { response, names } = await exportCsv(admin)
    const { totalDocs } = await payload.count({ collection: 'leads' })
    expect(names).toHaveLength(Math.min(totalDocs, 10_000))
    expect(response.headers.get('X-Export-Count')).toBe(String(names.length))
    // 匹配总数：未超出上限时与导出条数一致，超出时标记截断
    const total = Number(response.headers.get(EXPORT_HEADERS.total))
    expect(total).toBeGreaterThanOrEqual(names.length)
    expect(response.headers.get(EXPORT_HEADERS.truncated)).toBe(
      total > names.length ? 'true' : null,
    )
    for (const lead of leads) expect(names).toContain(sanitizeCell(lead.name))
  })
})

describe('线索导出内容', () => {
  it('响应为带中文文件名的 CSV 附件，且不缓存', async () => {
    const { response } = await exportCsv(admin, { search: MARK })
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const disposition = response.headers.get('Content-Disposition') ?? ''
    expect(disposition).toMatch(/^attachment; filename="leads-export-\d{8}-\d{4}\.csv"/)
    expect(disposition).toContain(`filename*=UTF-8''${encodeURIComponent('线索导出-')}`)
  })

  it('支持列表页的搜索词（匹配姓名）', async () => {
    const { names } = await exportCsv(admin, { search: MARK })
    expect(names.sort()).toEqual(
      [`${MARK}甲一`, `${MARK}甲二`, `${MARK}乙一`, `${MARK}未分配`].sort(),
    )
  })

  it('支持列表页的 where 筛选（qs 解析后的对象与 JSON 字符串）', async () => {
    const where = { and: [{ status: { equals: 'contacted' } }] }
    const fromObject = await exportCsv(admin, { search: MARK, where })
    expect(fromObject.names).toEqual([`${MARK}甲二`])
    const fromJson = await exportCsv(admin, { search: MARK, where: JSON.stringify(where) })
    expect(fromJson.names).toEqual([`${MARK}甲二`])
  })

  it('字段输出中文标签与展开后的名称，按提交时间倒序', async () => {
    const { rows } = await exportCsv(consultantA)
    const [newer, older] = rows
    expect(newer?.[1]).toBe(`${MARK}甲二`)
    expect(newer?.[3]).toBe('咨询学费')
    expect(newer?.[7]).toBe('已联系')
    expect(older?.slice(0, 13)).toEqual([
      expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
      `${MARK}甲一`,
      '13900139000',
      '预约试听',
      '',
      '上海',
      '想了解周末班,学费多少？\n能分期吗',
      '新线索',
      consultantA.name,
      '否',
      '/courses/demo',
      'course_sticky',
      '',
    ])
    expect(older?.[13]).toBe('baidu')
  })

  it('不导出 IP 与设备信息（管理员导出也一样）', async () => {
    const { text } = await exportCsv(admin, { search: MARK })
    expect(text).not.toContain('203.0.113.77')
    expect(text).not.toContain('ExportTestAgent')
  })

  it('公式注入的内容被转成文本', async () => {
    const { text, names } = await exportCsv(admin, { search: RUN })
    expect(names).toContain(`'=cmd|"/c ${RUN}"!A0`)
    expect(text).toContain(`"'=cmd|""/c ${RUN}""!A0"`)
  })

  it('筛选条件无效时返回 400，且不留导出记录', async () => {
    const before = await latestAuditLog(consultantB)
    const response = await callExport(consultantB, { where: '{not json' })
    expect(response.status).toBe(400)
    const unknownField = await callExport(consultantB, { where: { notAField: { equals: 'x' } } })
    expect(unknownField.status).toBe(400)
    expect((await latestAuditLog(consultantB))?.id).toBe(before?.id)
  })

  it('and / or 结构不对时返回 400 而不是 500（带搜索词时也一样）', async () => {
    const before = await latestAuditLog(consultantB)
    // qs 把 where[and][status][equals]=new 解析成对象而不是数组
    const malformed = { and: { status: { equals: 'new' } } }
    for (const query of [{ where: malformed }, { where: malformed, search: MARK }]) {
      const response = await callExport(consultantB, query)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        errors: [{ message: EXPORT_MESSAGES.invalidFilters }],
      })
    }
    expect((await latestAuditLog(consultantB))?.id).toBe(before?.id)
  })
})

describe('跨站请求', () => {
  it('其他网站诱导的跳转（跨站导航）即使带着登录 Cookie 也拒绝，且不留导出记录', async () => {
    const before = await latestAuditLog(admin)
    const response = await callExport(
      admin,
      { search: MARK },
      {
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Dest': 'document',
      },
    )
    expect(response.status).toBe(403)
    expect(response.headers.get('Content-Disposition')).toBeNull()
    expect(await response.json()).toEqual({ errors: [{ message: EXPORT_MESSAGES.crossSite }] })
    expect((await latestAuditLog(admin))?.id).toBe(before?.id)
  })

  it('后台页面发起的同源请求正常导出', async () => {
    const response = await callExport(
      admin,
      { search: MARK },
      { 'Sec-Fetch-Site': 'same-origin', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Dest': 'empty' },
    )
    expect(response.status).toBe(200)
  })
})

describe('导出留痕', () => {
  it('每次导出都写入操作日志：操作人、条数、筛选条件', async () => {
    const where = { status: { equals: 'new' } }
    const { rows } = await exportCsv(consultantB, { where, search: MARK })
    const log = await latestAuditLog(consultantB)
    expect(log).toMatchObject({
      action: 'export_leads',
      user: consultantB.id,
      count: rows.length,
      filters: { where, search: MARK },
    })
    expect(rows).toHaveLength(1)
    expect(typeof log?.ip).toBe('string')
    // 操作人快照
    expect(log).toMatchObject({
      userEmail: consultantB.email,
      userName: consultantB.name,
      userRole: 'consultant',
    })
  })

  it('删除账号后操作日志仍保留操作人快照', async () => {
    const leaving = await createUser('leaving', 'consultant')
    await exportCsv(leaving, { search: MARK })
    const log = await latestAuditLog(leaving)
    expect(log).toBeTruthy()
    orphanAuditLogIds.push(log!.id)

    await payload.delete({ collection: 'users', id: leaving.id })
    const after = await payload.findByID({
      collection: 'audit-logs',
      id: log!.id,
      depth: 0,
    })
    expect(after.user ?? null).toBeNull()
    expect(after).toMatchObject({
      action: 'export_leads',
      userEmail: leaving.email,
      userName: leaving.name,
      userRole: 'consultant',
    })
  })

  it('导出 0 条也会留痕', async () => {
    await exportCsv(consultantB, { search: `不存在的${RUN}` })
    const log = await latestAuditLog(consultantB)
    expect(log?.count).toBe(0)
  })

  it('操作日志不能通过接口修改或删除', async () => {
    const log = await latestAuditLog(consultantB)
    expect(log).toBeTruthy()
    await expect(
      payload.update({
        collection: 'audit-logs',
        id: log!.id,
        data: { count: 999 },
        user: { ...admin, collection: 'users' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.delete({
        collection: 'audit-logs',
        id: log!.id,
        user: { ...admin, collection: 'users' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
