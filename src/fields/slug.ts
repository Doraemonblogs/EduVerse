import {
  slugField,
  validations,
  type RowField,
  type TextField,
  type TextFieldSingleValidation,
} from 'payload'

import { toSlug, validateSlug } from '@/lib/slugify'

/** 额外的 slug 校验（如占用检查）：返回 true 或中文错误信息 */
export type SlugCheck = (value: unknown) => true | string

type SlugOptions = {
  /** 后台字段说明，默认是通用说明 */
  description?: string
  /** 在内置校验与格式校验都通过后执行 */
  validate?: SlugCheck
}

const DEFAULT_DESCRIPTION = '用于网址，如 /courses/3d-animation。留空时根据标题自动生成拼音。'

/** 先执行内置校验（required 等），再校验 slug 格式，最后执行集合自己的额外校验 */
export function createSlugValidation(extra?: SlugCheck): TextFieldSingleValidation {
  return (value, options) => {
    const base = validations.text(value, options)
    if (base !== true) return base
    const format = validateSlug(value)
    if (format !== true) return format
    return extra ? extra(value) : true
  }
}

/**
 * slug 字段：基于 Payload 内置 slugField，标题中的中文自动转拼音，可手动修改（后台有锁定开关）。
 * @param useAsSlug 用来生成 slug 的字段名，默认 title
 * @param options 字段说明与额外校验（如通用页面不能占用固定路由）
 */
export function slug(useAsSlug = 'title', options: SlugOptions = {}): RowField {
  return slugField({
    useAsSlug,
    slugify: ({ valueToSlugify }) =>
      typeof valueToSlugify === 'string' && valueToSlugify.trim()
        ? // 标题全是标点等无法转换时返回 undefined，交给必填校验提示
          toSlug(valueToSlugify) || undefined
        : undefined,
    position: 'sidebar',
    overrides: (row) => {
      const [checkbox, text] = row.fields as [RowField['fields'][number], TextField]
      return {
        ...row,
        fields: [
          checkbox,
          {
            // 只取内置 slugField 设置的属性，避免把 hasMany 变体的类型带进来
            name: text.name,
            type: 'text',
            index: text.index,
            unique: text.unique,
            required: text.required,
            localized: text.localized,
            custom: text.custom,
            label: 'URL 标识（slug）',
            validate: createSlugValidation(options.validate),
            admin: {
              ...text.admin,
              description: options.description ?? DEFAULT_DESCRIPTION,
            },
          } satisfies TextField,
        ],
      }
    },
  })
}
