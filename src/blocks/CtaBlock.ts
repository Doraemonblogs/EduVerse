import type { Block } from 'payload'

import { LEAD_INTENT_OPTIONS } from '@/collections/Leads'

export const CtaBlock: Block = {
  slug: 'cta',
  interfaceName: 'CtaBlock',
  labels: { singular: '行动号召', plural: '行动号召' },
  fields: [
    { name: 'title', type: 'text', label: '标题', required: true },
    { name: 'description', type: 'textarea', label: '描述' },
    {
      type: 'row',
      fields: [
        {
          name: 'buttonLabel',
          type: 'text',
          label: '按钮文字',
          required: true,
          defaultValue: '预约试听',
        },
        {
          name: 'intent',
          type: 'select',
          label: '留资类型',
          required: true,
          defaultValue: 'trial',
          options: LEAD_INTENT_OPTIONS,
          admin: { description: '点击按钮后打开的留资表单类型，线索中记录为对应意向' },
        },
      ],
    },
  ],
}
