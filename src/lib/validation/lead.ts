import { z } from 'zod'

import { zh } from '@/i18n/zh'

/** 中国大陆手机号：1 开头，第二位 3–9，共 11 位（与后台校验一致） */
export const MAINLAND_PHONE_PATTERN = /^1[3-9]\d{9}$/

/**
 * 手机号规范化：去掉空格（含全角空格）与连字符，以及 +86 / 86 国家码前缀。
 * “138 0013 8000”“138-0013-8000”“+86 13800138000”都会变成 13800138000。
 * 国家码只在其后恰好是 11 位数字时去掉，其它写法原样交给格式校验报错。
 */
export function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, '').replace(/^\+?86(?=\d{11}$)/, '')
}

export const LEAD_INTENTS = [
  'trial',
  'tuition',
  'materials',
  'quiz',
  'tutorial',
  'consult',
] as const
export type LeadIntent = (typeof LEAD_INTENTS)[number]

/** 按钮位置标识：小写字母、数字、下划线，如 home_hero、course_sticky */
export const POSITION_PATTERN = /^[a-z0-9_]{1,40}$/

/** 自动采集字段的长度上限（超出截断，不拒绝提交） */
export const SOURCE_FIELD_MAX = {
  position: 40,
  pageUrl: 500,
  landingUrl: 500,
  referrer: 500,
  utm: 100,
  quizResult: 4000,
} as const

/** 截断到 max 个 UTF-16 码元，不把代理对（emoji 等）拆成半个字符 */
export function truncateText(value: string, max: number): string {
  if (value.length <= max) return value
  const cut = value.slice(0, max)
  const last = cut.charCodeAt(cut.length - 1)
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut
}

/** 访客填写的可选文本：超长时提示（由访客修改） */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))

/**
 * 前端自动采集的可选文本（来源、UTM、测试结果等）：访客看不到也改不了，
 * 所以超长时截断而不是拒绝，非字符串按未填写处理。
 */
const collectedText = (max: number) =>
  z.preprocess((v) => {
    if (typeof v !== 'string') return undefined
    const text = truncateText(v.trim(), max).trim()
    return text ? text : undefined
  }, z.string().optional())

/** 可选的关联 ID：非正整数视为未选择（隐藏字段被篡改时不影响提交，服务端再按已发布内容过滤） */
const optionalId = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().positive().optional().catch(undefined),
)

/**
 * 填写用时（毫秒，客户端以 performance.now() 计算）：取非负整数，缺失或非法记为 0（未知）。
 * 超出安全整数范围（如篡改成 1e20）同样记为 0，否则 zod 的整数校验会让整张表单无提示地失败。
 */
const fillMs = z.preprocess((v) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  const ms = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  return Number.isSafeInteger(ms) ? ms : 0
}, z.number().int().nonnegative())

const m = zh.lead.errors

/**
 * 留资表单提交数据（客户端与服务端共用；服务端是最终校验）。
 * 来源字段由前端自动采集，超长截断，不做格式要求。
 */
export const leadSubmissionSchema = z.object({
  name: z.string({ error: m.nameRequired }).trim().min(1, m.nameRequired).max(30, m.nameTooLong),
  phone: z
    .string({ error: m.phoneRequired })
    .overwrite(normalizePhone)
    .min(1, m.phoneRequired)
    .regex(MAINLAND_PHONE_PATTERN, m.phoneInvalid),
  discipline: optionalId,
  city: optionalText(30),
  message: optionalText(500),
  consent: z.literal('on', { error: m.consentRequired }),
  intent: z.enum(LEAD_INTENTS).catch('trial'),
  position: z
    .preprocess(
      (v) => (typeof v === 'string' ? truncateText(v.trim(), SOURCE_FIELD_MAX.position) : v),
      z.string().regex(POSITION_PATTERN),
    )
    .catch('unknown'),
  course: optionalId,
  tutorial: optionalId,
  quizResult: collectedText(SOURCE_FIELD_MAX.quizResult),
  pageUrl: collectedText(SOURCE_FIELD_MAX.pageUrl),
  landingUrl: collectedText(SOURCE_FIELD_MAX.landingUrl),
  referrer: collectedText(SOURCE_FIELD_MAX.referrer),
  utmSource: collectedText(SOURCE_FIELD_MAX.utm),
  utmMedium: collectedText(SOURCE_FIELD_MAX.utm),
  utmCampaign: collectedText(SOURCE_FIELD_MAX.utm),
  utmTerm: collectedText(SOURCE_FIELD_MAX.utm),
  utmContent: collectedText(SOURCE_FIELD_MAX.utm),
  /** 防刷：访客在表单上停留的毫秒数（隐藏字段 fillMs）；0 表示未知 */
  fillMs,
  /** 防刷：蜜罐字段，真人看不到也不会填写 */
  website: z.string().optional().default(''),
})

export type LeadSubmission = z.infer<typeof leadSubmissionSchema>

export type LeadFieldErrors = Partial<
  Record<'name' | 'phone' | 'city' | 'message' | 'consent', string>
>

/** 把 zod 错误整理成按字段的第一条中文提示 */
export function toFieldErrors(error: z.ZodError): LeadFieldErrors {
  const result: LeadFieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (
      (key === 'name' ||
        key === 'phone' ||
        key === 'city' ||
        key === 'message' ||
        key === 'consent') &&
      !result[key]
    ) {
      result[key] = issue.message
    }
  }
  return result
}
