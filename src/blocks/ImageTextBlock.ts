import type { Block } from 'payload'

export const ImageTextBlock: Block = {
  slug: 'imageText',
  interfaceName: 'ImageTextBlock',
  labels: { singular: '图文', plural: '图文' },
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', label: '图片', required: true },
    { name: 'title', type: 'text', label: '标题' },
    { name: 'content', type: 'richText', label: '正文' },
    {
      name: 'imagePosition',
      type: 'select',
      label: '图片位置',
      defaultValue: 'left',
      options: [
        { label: '左侧', value: 'left' },
        { label: '右侧', value: 'right' },
      ],
      admin: { description: '桌面端图片所在的一侧；移动端统一图片在上、文字在下' },
    },
  ],
}
