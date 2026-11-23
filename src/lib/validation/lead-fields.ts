/**
 * 留资字段的常量与纯函数，不依赖 zod。
 * 客户端表单只静态导入这里；zod 校验规则（./lead）在访客开始填写时才按需加载，不进首屏 JS。
 * ./lead 原样再导出这些名字，服务端与其它模块照旧从 '@/lib/validation/lead' 导入。
 */

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

export type LeadFieldErrors = Partial<
  Record<'name' | 'phone' | 'city' | 'message' | 'consent', string>
>
