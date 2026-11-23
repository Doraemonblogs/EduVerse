import { LEAD_INTENT_OPTIONS, LEAD_STATUS_OPTIONS } from '@/collections/Leads'
import { type Lead } from '@/payload-types'

/**
 * 线索 CSV 导出的纯函数部分（序列化、防公式注入、字段映射、文件名）。
 * 只导出跟进线索需要的字段；IP、User-Agent、群机器人推送记录、同意记录等一律不导出（个人信息最小化）。
 */

/** UTF-8 BOM：让 Excel / WPS 正确识别中文 */
export const UTF8_BOM = String.fromCharCode(0xfeff)

/**
 * 以这些字符开头的单元格会被表格软件当作公式执行（CSV 注入）。
 * 除 OWASP 列出的 = + - @ 制表符 回车外，额外处理换行与全角符号（部分国产表格软件会识别）。
 */
const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r', '\n', '＝', '＋', '－', '＠'])

/** 防公式注入：以触发字符开头时前置单引号，表格软件会把整格当作文本 */
export function sanitizeCell(value: string): string {
  return value.length > 0 && FORMULA_TRIGGERS.has(value[0]!) ? `'${value}` : value
}

/** 单元格一律加双引号，内部双引号写两遍（RFC 4180），内容中的逗号与换行因此安全 */
function quoteCell(value: string): string {
  return `"${sanitizeCell(value).replace(/"/g, '""')}"`
}

/** 序列化为 CSV：UTF-8 BOM 开头、CRLF 换行、每格加引号并防公式注入 */
export function toCsv(rows: string[][]): string {
  return UTF8_BOM + rows.map((row) => row.map(quoteCell).join(',') + '\r\n').join('')
}

export const LEAD_CSV_HEADERS = [
  '提交时间',
  '姓名',
  '手机号',
  '意向类型',
  '意向专业',
  '城市',
  '留言',
  '状态',
  '负责顾问',
  '重复线索',
  '提交页面',
  '按钮位置',
  '来源网址',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const

/** 导出用到的线索字段（查询时用作 select，避免取出 IP 等无关的个人信息） */
export type LeadCsvInput = Pick<Lead, 'createdAt' | 'name' | 'phone' | 'intent' | 'status'> &
  Partial<Pick<Lead, 'discipline' | 'city' | 'message' | 'assignedTo' | 'isDuplicate' | 'source'>>

type Option = { label: string; value: string }

/** 选项值 → 中文标签（未知值原样输出）。在调用时读取选项，避免与 Leads 集合循环引用时取到未初始化的常量 */
function labelOf(options: readonly Option[], value: string | null | undefined): string {
  if (!value) return ''
  return options.find((option) => option.value === value)?.label ?? value
}

const SHANGHAI_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** 北京时间的年月日时分（补零后的字符串） */
function shanghaiParts(date: Date) {
  const parts: Record<string, string> = {}
  for (const part of SHANGHAI_FORMAT.formatToParts(date)) parts[part.type] = part.value
  return {
    year: parts.year ?? '',
    month: parts.month ?? '',
    day: parts.day ?? '',
    hour: parts.hour ?? '',
    minute: parts.minute ?? '',
  }
}

/** 北京时间 yyyy-MM-dd HH:mm；无效时间返回空串 */
export function formatShanghaiTime(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const { year, month, day, hour, minute } = shanghaiParts(date)
  return `${year}-${month}-${day} ${hour}:${minute}`
}

/** 关联字段已展开时取显示名；未展开（只有 ID，或无权读取）时留空 */
function relationName<T extends object>(
  value: number | T | null | undefined,
  pick: (doc: T) => string | null | undefined,
): string {
  return value && typeof value === 'object' ? (pick(value) ?? '') : ''
}

/** 一条线索 → 一行 CSV（顺序与 LEAD_CSV_HEADERS 一致） */
export function leadToCsvRow(lead: LeadCsvInput): string[] {
  const source = lead.source ?? {}
  return [
    formatShanghaiTime(lead.createdAt),
    lead.name ?? '',
    lead.phone ?? '',
    labelOf(LEAD_INTENT_OPTIONS, lead.intent),
    relationName(lead.discipline, (discipline) => discipline.name),
    lead.city ?? '',
    lead.message ?? '',
    labelOf(LEAD_STATUS_OPTIONS, lead.status),
    relationName(lead.assignedTo, (user) => user.name || user.email),
    lead.isDuplicate ? '是' : '否',
    source.pageUrl ?? '',
    source.position ?? '',
    source.referrer ?? '',
    source.utmSource ?? '',
    source.utmMedium ?? '',
    source.utmCampaign ?? '',
    source.utmTerm ?? '',
    source.utmContent ?? '',
  ]
}

/** 完整的线索 CSV（表头 + 数据行） */
export function leadsToCsv(leads: readonly LeadCsvInput[]): string {
  return toCsv([[...LEAD_CSV_HEADERS], ...leads.map(leadToCsvRow)])
}

/**
 * 下载文件名：线索导出-YYYYMMDD-HHmm.csv（北京时间）。
 * 返回 Content-Disposition 头：filename 为 ASCII 兜底，filename* 为 UTF-8 编码的中文名（RFC 6266）。
 */
export function exportContentDisposition(now: Date = new Date()): string {
  const { year, month, day, hour, minute } = shanghaiParts(now)
  const stamp = `${year}${month}${day}-${hour}${minute}`
  const utf8Name = encodeURIComponent(`线索导出-${stamp}.csv`)
  return `attachment; filename="leads-export-${stamp}.csv"; filename*=UTF-8''${utf8Name}`
}
