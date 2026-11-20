import { slugField, type RowField, type TextField } from 'payload'

import { toSlug, validateSlug } from '@/lib/slugify'

/**
 * slug 字段：基于 Payload 内置 slugField，标题中的中文自动转拼音，可手动修改（后台有锁定开关）。
 * @param useAsSlug 用来生成 slug 的字段名，默认 title
 */
export function slug(useAsSlug = 'title'): RowField {
  return slugField({
    useAsSlug,
    slugify: ({ valueToSlugify }) =>
      typeof valueToSlugify === 'string' && valueToSlugify.trim()
        ? toSlug(valueToSlugify)
        : undefined,
    position: 'sidebar',
    overrides: (row) => {
      const [checkbox, text] = row.fields as [RowField['fields'][number], TextField]
      return {
        ...row,
        fields: [
          checkbox,
          {
            ...text,
            label: 'URL 标识（slug）',
            validate: (value: unknown) => validateSlug(value),
            admin: {
              ...text.admin,
              description: '用于网址，如 /courses/3d-animation。留空时根据标题自动生成拼音。',
            },
          },
        ],
      }
    },
  })
}
