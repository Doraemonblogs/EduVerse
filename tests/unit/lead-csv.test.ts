import { describe, expect, it } from 'vitest'

import { isCrossSiteRequest, MAX_WHERE_DEPTH, readExportFilters } from '@/endpoints/export-leads'
import {
  exportContentDisposition,
  formatShanghaiTime,
  LEAD_CSV_HEADERS,
  leadsToCsv,
  leadToCsvRow,
  sanitizeCell,
  toCsv,
  UTF8_BOM,
  type LeadCsvInput,
} from '@/lib/lead/csv'
import { type Discipline, type Lead, type User } from '@/payload-types'

const baseLead: LeadCsvInput = {
  createdAt: '2026-11-23T02:05:00.000Z',
  name: '张三',
  phone: '13800138000',
  intent: 'trial',
  status: 'new',
}

describe('toCsv 序列化', () => {
  it('以 UTF-8 BOM 开头，行尾为 CRLF', () => {
    const csv = toCsv([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(csv.startsWith(UTF8_BOM)).toBe(true)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe('"a","b"\r\n"c","d"\r\n')
  })

  it('编码后的字节以 EF BB BF 开头', () => {
    const bytes = new TextEncoder().encode(toCsv([['姓名']]))
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  })

  it('每个单元格都加双引号，空值输出为空引号', () => {
    expect(toCsv([['', 'x']]).slice(1)).toBe('"","x"\r\n')
  })

  it('内部双引号写两遍', () => {
    expect(toCsv([['他说"你好"']]).slice(1)).toBe('"他说""你好"""\r\n')
  })

  it('内容中的逗号与换行保留在同一个单元格内', () => {
    expect(toCsv([['甲,乙', '第一行\n第二行', '回车\r\n换行']]).slice(1)).toBe(
      '"甲,乙","第一行\n第二行","回车\r\n换行"\r\n',
    )
  })

  it('中文内容原样输出', () => {
    expect(toCsv([['数字艺术', '上海·徐汇']]).slice(1)).toBe('"数字艺术","上海·徐汇"\r\n')
  })

  it('没有数据行时只输出 BOM', () => {
    expect(toCsv([])).toBe(UTF8_BOM)
  })
})

describe('防公式注入', () => {
  it.each(['=', '+', '-', '@', '\t', '\r'])('以 %j 开头的单元格前置单引号', (trigger) => {
    const value = `${trigger}HYPERLINK("http://evil.example","点我")`
    expect(sanitizeCell(value)).toBe(`'${value}`)
  })

  it.each(['\n', '＝', '＋', '－', '＠'])('换行与全角符号 %j 开头同样处理', (trigger) => {
    expect(sanitizeCell(`${trigger}1+1`)).toBe(`'${trigger}1+1`)
  })

  it('序列化时自动处理，并与引号转义叠加', () => {
    expect(toCsv([['=cmd|"/C calc"!A0']]).slice(1)).toBe('"\'=cmd|""/C calc""!A0"\r\n')
  })

  it('触发字符不在开头时不处理', () => {
    expect(sanitizeCell('1+1=2')).toBe('1+1=2')
    expect(sanitizeCell('邮箱 a@b.cn')).toBe('邮箱 a@b.cn')
    expect(sanitizeCell('')).toBe('')
  })
})

describe('北京时间格式化', () => {
  it('UTC 时间换算为北京时间 yyyy-MM-dd HH:mm', () => {
    expect(formatShanghaiTime('2026-11-23T02:05:00.000Z')).toBe('2026-11-23 10:05')
  })

  it('跨日时按北京时间计算日期，零点显示为 00', () => {
    expect(formatShanghaiTime('2026-12-31T16:00:59.000Z')).toBe('2027-01-01 00:00')
    expect(formatShanghaiTime(new Date('2026-06-30T15:59:00.000Z'))).toBe('2026-06-30 23:59')
  })

  it('空值与无效时间输出空串', () => {
    expect(formatShanghaiTime(null)).toBe('')
    expect(formatShanghaiTime('not-a-date')).toBe('')
  })
})

describe('线索字段映射', () => {
  it('表头为中文且与数据列一一对应', () => {
    expect(LEAD_CSV_HEADERS[0]).toBe('提交时间')
    expect(LEAD_CSV_HEADERS).toContain('负责顾问')
    expect(LEAD_CSV_HEADERS).toContain('utm_content')
    expect(leadToCsvRow(baseLead)).toHaveLength(LEAD_CSV_HEADERS.length)
  })

  it('完整 CSV 第一行是表头', () => {
    const csv = leadsToCsv([baseLead])
    const [header, row] = csv.slice(1).split('\r\n')
    expect(header).toBe(LEAD_CSV_HEADERS.map((h) => `"${h}"`).join(','))
    expect(row?.startsWith('"2026-11-23 10:05","张三","13800138000"')).toBe(true)
  })

  it('意向类型、状态输出中文标签，重复线索输出是/否', () => {
    const row = leadToCsvRow({ ...baseLead, intent: 'tuition', status: 'contacted' })
    const cell = (header: (typeof LEAD_CSV_HEADERS)[number]) =>
      row[LEAD_CSV_HEADERS.indexOf(header)]
    expect(cell('意向类型')).toBe('咨询学费')
    expect(cell('状态')).toBe('已联系')
    expect(cell('重复线索')).toBe('否')
    expect(leadToCsvRow({ ...baseLead, isDuplicate: true })[9]).toBe('是')
  })

  it('已展开的意向专业与负责顾问输出名称，未展开的只有 ID 时留空', () => {
    const discipline = { id: 1, name: '游戏原画' } as Discipline
    const consultant = { id: 2, name: '顾问甲', email: 'ca@example.test' } as User
    const populated = leadToCsvRow({ ...baseLead, discipline, assignedTo: consultant })
    expect(populated[4]).toBe('游戏原画')
    expect(populated[8]).toBe('顾问甲')

    const idsOnly = leadToCsvRow({ ...baseLead, discipline: 1, assignedTo: 2 })
    expect(idsOnly[4]).toBe('')
    expect(idsOnly[8]).toBe('')
  })

  it('顾问没有姓名时输出邮箱', () => {
    const consultant = { id: 2, name: '', email: 'ca@example.test' } as User
    expect(leadToCsvRow({ ...baseLead, assignedTo: consultant })[8]).toBe('ca@example.test')
  })

  it('来源与 UTM 参数按列输出', () => {
    const row = leadToCsvRow({
      ...baseLead,
      source: {
        pageUrl: '/courses/game-art',
        position: 'course_sticky',
        referrer: 'https://search.example/',
        utmSource: 'baidu',
        utmMedium: 'cpc',
        utmCampaign: 'winter',
        utmTerm: '原画',
        utmContent: 'banner',
      },
    })
    expect(row.slice(10)).toEqual([
      '/courses/game-art',
      'course_sticky',
      'https://search.example/',
      'baidu',
      'cpc',
      'winter',
      '原画',
      'banner',
    ])
  })

  it('不导出 IP、User-Agent 与群机器人推送记录', () => {
    const lead = {
      ...baseLead,
      client: { ip: '203.0.113.42', userAgent: 'SecretAgent/1.0' },
      webhookDeliveries: [{ target: 'https://qyapi.example/hook', status: 'success', attempts: 1 }],
      consent: { agreed: true, policyVersion: 'v-secret' },
    } as Lead
    const csv = leadsToCsv([lead])
    expect(csv).not.toContain('203.0.113.42')
    expect(csv).not.toContain('SecretAgent')
    expect(csv).not.toContain('qyapi')
    expect(csv).not.toContain('v-secret')
    expect(LEAD_CSV_HEADERS.join()).not.toMatch(/IP|User-Agent|推送/i)
  })

  it('用户填写的内容同样防公式注入', () => {
    const csv = leadsToCsv([{ ...baseLead, name: '=1+1', message: '@SUM(A1)' }])
    expect(csv).toContain('"\'=1+1"')
    expect(csv).toContain('"\'@SUM(A1)"')
  })
})

describe('下载文件名', () => {
  it('中文文件名按 RFC 6266 编码，并提供 ASCII 兜底（北京时间）', () => {
    const header = exportContentDisposition(new Date('2026-11-23T07:30:00.000Z'))
    expect(header).toBe(
      `attachment; filename="leads-export-20261123-1530.csv"; filename*=UTF-8''${encodeURIComponent('线索导出-20261123-1530.csv')}`,
    )
    expect(header).toMatch(/^[\x20-\x7e]+$/)
  })
})

describe('导出筛选条件解析', () => {
  it('没有筛选条件时为空对象', () => {
    expect(readExportFilters({})).toEqual({ where: {}, search: undefined })
    expect(readExportFilters(undefined)).toEqual({ where: {}, search: undefined })
  })

  it('接受 qs 解析后的嵌套 where 与搜索词（去掉首尾空格）', () => {
    const where = { and: [{ status: { equals: 'new' } }] }
    expect(readExportFilters({ where, search: ' 138 ' })).toEqual({ where, search: '138' })
  })

  it('接受 JSON 字符串形式的 where', () => {
    expect(readExportFilters({ where: '{"status":{"equals":"new"}}' })?.where).toEqual({
      status: { equals: 'new' },
    })
  })

  it('返回的是副本，不会被后续合并改动', () => {
    const where = { and: [{ status: { equals: 'new' } }] }
    const parsed = readExportFilters({ where })
    expect(parsed?.where).not.toBe(where)
  })

  it('无法识别的 where 或搜索词返回 null', () => {
    expect(readExportFilters({ where: '{bad json' })).toBeNull()
    expect(readExportFilters({ where: ['a'] })).toBeNull()
    expect(readExportFilters({ where: 1 })).toBeNull()
    expect(readExportFilters({ search: ['a', 'b'] })).toBeNull()
  })

  it('搜索词过长时截断', () => {
    expect(readExportFilters({ search: '1'.repeat(300) })?.search).toHaveLength(100)
  })

  it('接受后台筛选器生成的 or → and 嵌套条件', () => {
    const where = {
      or: [
        { and: [{ status: { equals: 'new' } }, { city: { like: '杭州' } }] },
        { and: [{ intent: { in: ['trial', 'tuition'] } }] },
      ],
    }
    expect(readExportFilters({ where })?.where).toEqual(where)
  })

  it('and / or 不是数组时返回 null（qs 把 where[and][status] 解析成对象）', () => {
    expect(readExportFilters({ where: { and: { status: { equals: 'new' } } } })).toBeNull()
    expect(readExportFilters({ where: { or: { 25: { status: { equals: 'new' } } } } })).toBeNull()
    expect(readExportFilters({ where: '{"and":{"status":{"equals":"new"}}}' })).toBeNull()
    expect(readExportFilters({ where: { and: ['status'] } })).toBeNull()
    expect(readExportFilters({ where: { and: [null] } })).toBeNull()
    expect(readExportFilters({ where: { or: [{ and: { x: { equals: 1 } } }] } })).toBeNull()
  })

  it('字段条件不是运算符对象时返回 null', () => {
    expect(readExportFilters({ where: { status: 'new' } })).toBeNull()
    expect(readExportFilters({ where: { status: ['new'] } })).toBeNull()
    expect(readExportFilters({ where: { and: [{ status: 'new' }] } })).toBeNull()
  })

  it('嵌套层数超过上限时返回 null', () => {
    const nest = (depth: number): Record<string, unknown> =>
      depth === 0 ? { status: { equals: 'new' } } : { and: [nest(depth - 1)] }
    expect(readExportFilters({ where: nest(MAX_WHERE_DEPTH) })).not.toBeNull()
    expect(readExportFilters({ where: nest(MAX_WHERE_DEPTH + 1) })).toBeNull()
    // 极深的 JSON 字符串（查询串长度允许的范围内）也只返回 null，不会栈溢出
    const deep = `${'{"and":['.repeat(2000)}{"status":{"equals":"new"}}${']}'.repeat(2000)}`
    expect(readExportFilters({ where: deep })).toBeNull()
  })

  it('JSON 中的 __proto__ 键不会进入筛选条件', () => {
    const parsed = readExportFilters({
      where: '{"__proto__":{"equals":1},"status":{"equals":"x"}}',
    })
    expect(parsed?.where).toEqual({ status: { equals: 'x' } })
    expect(Object.getPrototypeOf(parsed?.where)).toBe(Object.prototype)
  })
})

describe('跨站请求识别', () => {
  it('Sec-Fetch-Site 为 cross-site 时视为跨站（跳转、弹窗或其他网站发起的请求）', () => {
    const headers = (init: Record<string, string>) => new Headers(init)
    expect(
      isCrossSiteRequest(headers({ 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate' })),
    ).toBe(true)
    expect(
      isCrossSiteRequest(headers({ 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'no-cors' })),
    ).toBe(true)
  })

  it('同源请求、地址栏直接打开与非浏览器客户端不受影响', () => {
    expect(isCrossSiteRequest(new Headers({ 'Sec-Fetch-Site': 'same-origin' }))).toBe(false)
    expect(isCrossSiteRequest(new Headers({ 'Sec-Fetch-Site': 'none' }))).toBe(false)
    expect(isCrossSiteRequest(new Headers())).toBe(false)
  })
})
