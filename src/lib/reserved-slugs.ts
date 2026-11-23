/**
 * 已被前台固定路由（以及 Payload 后台 / 接口）占用的一级路径。
 * 通用页面（pages 集合）挂在 /[pageSlug] 下，同名页面永远无法访问，也不能参与静态生成；
 * 数据层、后台 slug 校验与富文本站内链接共用这一份清单。新增一级路由时在这里登记。
 *
 * 不引入 server-only：集合配置（src/collections/Pages.ts）也要用到，而 payload.config 会在
 * Next 运行时之外加载（种子脚本、迁移命令、单元测试），那里引入 server-only 会直接抛错。
 */
export const RESERVED_ROUTE_SEGMENTS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'articles',
  'campuses',
  'careers',
  'courses',
  'majors',
  'quiz',
  'search',
  'styleguide',
  'teachers',
  'tutorials',
  'works',
])

/** 该 slug 是否被固定路由占用（只比较完整的一级路径，大小写敏感，与 slug 规则一致） */
export function isReservedSlug(slug: unknown): boolean {
  return typeof slug === 'string' && RESERVED_ROUTE_SEGMENTS.has(slug)
}

/**
 * 通用页面 slug 的占用校验，返回 true 或中文错误信息（Payload validate 约定）。
 * 空值与格式问题交给必填校验与 validateSlug 处理。
 */
export function validateReservedSlug(value: unknown): true | string {
  if (!isReservedSlug(value)) return true
  return `该 URL（/${String(value)}）已被系统栏目占用，请换一个`
}
