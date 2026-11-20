import type { Block } from 'payload'

export const TimelineBlock: Block = {
  slug: 'timeline',
  interfaceName: 'TimelineBlock',
  labels: { singular: '时间线', plural: '时间线' },
  fields: [
    {
      name: 'items',
      type: 'array',
      label: '节点',
      labels: { singular: '节点', plural: '节点' },
      required: true,
      minRows: 1,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'year',
              type: 'text',
              label: '时间',
              required: true,
              admin: { description: '如：2018、2026 年 3 月' },
            },
            { name: 'title', type: 'text', label: '标题', required: true },
          ],
        },
        { name: 'description', type: 'textarea', label: '描述' },
      ],
    },
  ],
}
