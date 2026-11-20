import type { Block } from 'payload'

export const StatsBlock: Block = {
  slug: 'stats',
  interfaceName: 'StatsBlock',
  labels: { singular: '数据', plural: '数据' },
  fields: [
    {
      name: 'items',
      type: 'array',
      label: '数据项',
      labels: { singular: '数据项', plural: '数据项' },
      required: true,
      minRows: 1,
      maxRows: 4,
      admin: {
        description: '数据须真实、可查证，并在“说明”中标注口径与时间（广告法）',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'value',
              type: 'text',
              label: '数值',
              required: true,
              admin: { description: '如：12 年、3,000+' },
            },
            { name: 'label', type: 'text', label: '名称', required: true },
          ],
        },
        {
          name: 'note',
          type: 'text',
          label: '说明',
          // 广告法：引证数据须标明出处，口径与统计时间必填
          required: true,
          admin: { description: '必填：数据口径与统计时间，如：截至 2026 年 9 月，按结业学员统计' },
        },
      ],
    },
  ],
}
