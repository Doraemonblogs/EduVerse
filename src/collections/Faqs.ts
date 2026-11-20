import type { CollectionConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { orderField } from '@/fields/common'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

export const FAQ_CATEGORY_OPTIONS = [
  { label: '课程与学习', value: 'course' },
  { label: '学费与报名', value: 'fee' },
  { label: '就业服务', value: 'career' },
  { label: '其他', value: 'general' },
]

export const Faqs: CollectionConfig = {
  slug: 'faqs',
  labels: { singular: '常见问题', plural: '常见问题' },
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'category', 'order', 'updatedAt'],
    listSearchableFields: ['question', 'answer'],
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromConsultant,
  },
  defaultSort: 'order',
  access: {
    read: anyone,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: revalidateCollection('faqs'),
  fields: [
    { name: 'question', type: 'text', label: '问题', required: true },
    {
      name: 'answer',
      type: 'textarea',
      label: '回答',
      required: true,
      admin: { description: '纯文本，同时用于搜索引擎的 FAQ 结构化数据' },
    },
    {
      name: 'category',
      type: 'select',
      label: '分类',
      required: true,
      index: true,
      options: FAQ_CATEGORY_OPTIONS,
      admin: { position: 'sidebar' },
    },
    orderField,
  ],
}
