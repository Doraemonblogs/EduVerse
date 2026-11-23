import type { Field, Tab } from 'payload'

/** SEO 字段（TDK + 分享图 + 禁止收录），每个可访问的页面类内容都有 */
export const seoFields: Field[] = [
  {
    name: 'title',
    type: 'text',
    label: 'SEO 标题',
    maxLength: 60,
    admin: { description: '留空则使用内容标题。建议 30 个汉字以内，包含核心关键词。' },
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'SEO 描述',
    maxLength: 200,
    admin: { description: '搜索结果中的摘要，建议 80–120 个汉字。留空则使用简介。' },
  },
  {
    name: 'keywords',
    type: 'text',
    label: '关键词',
    admin: { description: '多个关键词用英文逗号分隔，如：3D动画培训,Maya培训' },
  },
  {
    name: 'image',
    type: 'upload',
    relationTo: 'media',
    label: '分享图',
    admin: {
      description:
        '分享到微信等平台时的预览图，不小于 1200×630（更小的图不会用作分享图）。留空则使用封面。',
    },
  },
  {
    name: 'noindex',
    type: 'checkbox',
    label: '禁止搜索引擎收录',
    defaultValue: false,
  },
]

export const seoTab: Tab = {
  name: 'seo',
  label: 'SEO',
  fields: seoFields,
}
