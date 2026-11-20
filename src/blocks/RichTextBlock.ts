import type { Block } from 'payload'

export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  labels: { singular: '富文本', plural: '富文本' },
  fields: [{ name: 'content', type: 'richText', label: '内容', required: true }],
}
