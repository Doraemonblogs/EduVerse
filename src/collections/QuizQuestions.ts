import type { CollectionConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { orderField } from '@/fields/common'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

export const QuizQuestions: CollectionConfig = {
  slug: 'quiz-questions',
  labels: { singular: '职业测试题', plural: '职业测试题' },
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'order', 'updatedAt'],
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromConsultant,
    description: '每个选项给相关专业方向加分，得分最高的方向作为推荐结果。',
  },
  defaultSort: 'order',
  access: {
    read: anyone,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: revalidateCollection('quiz-questions'),
  fields: [
    { name: 'question', type: 'text', label: '题目', required: true },
    {
      name: 'options',
      type: 'array',
      label: '选项',
      labels: { singular: '选项', plural: '选项' },
      required: true,
      minRows: 2,
      maxRows: 6,
      fields: [
        { name: 'label', type: 'text', label: '选项文字', required: true },
        {
          name: 'scores',
          type: 'array',
          label: '加分规则',
          labels: { singular: '加分', plural: '加分规则' },
          required: true,
          minRows: 1,
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'discipline',
                  type: 'relationship',
                  relationTo: 'disciplines',
                  label: '专业方向',
                  required: true,
                },
                {
                  name: 'weight',
                  type: 'number',
                  label: '分值',
                  required: true,
                  min: 0,
                  max: 5,
                  defaultValue: 1,
                  admin: { description: '0–5，越高表示与该方向越匹配' },
                },
              ],
            },
          ],
        },
      ],
    },
    orderField,
  ],
}
