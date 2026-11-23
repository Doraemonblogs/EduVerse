import { pinyin } from 'pinyin-pro'

import { MAX_SLUG_LENGTH, SLUG_PATTERN } from './slug-rules'

/** slug 规则（小写字母、数字，用连字符分隔）；定义在 src/lib/slug-rules.ts，与路由参数校验共用 */
export { MAX_SLUG_LENGTH, SLUG_PATTERN }

/**
 * 把标题转换为 URL 友好的 slug：中文转无声调拼音，其余保留字母数字。
 * 例：「3D 动画设计长期就业班」→ 3d-dong-hua-she-ji-chang-qi-jiu-ye-ban
 */
export function toSlug(input: string): string {
  const latin = pinyin(input.normalize('NFKC'), {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
    v: true,
  }).join(' ')

  return latin
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')
}

/** 校验 slug 格式，返回 true 或中文错误信息（Payload validate 约定） */
export function validateSlug(value: unknown): true | string {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string') return 'slug 必须是字符串'
  if (value.length > MAX_SLUG_LENGTH) return `slug 不能超过 ${MAX_SLUG_LENGTH} 个字符`
  if (!SLUG_PATTERN.test(value)) return 'slug 只能包含小写字母、数字和连字符，例如 3d-animation'
  return true
}
