import type { CollectionConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

export const CareerEvents: CollectionConfig = {
  slug: 'career-events',
  labels: { singular: '招聘活动', plural: '招聘活动' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'location', 'campus'],
    group: ADMIN_GROUPS.trust,
    hidden: hiddenFromConsultant,
  },
  defaultSort: '-date',
  access: {
    read: anyone,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: revalidateCollection('career-events'),
  fields: [
    { name: 'title', type: 'text', label: '活动名称', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'date',
          type: 'date',
          label: '活动时间',
          required: true,
          index: true,
          admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'yyyy-MM-dd HH:mm' } },
        },
        { name: 'location', type: 'text', label: '地点' },
        { name: 'campus', type: 'relationship', relationTo: 'campuses', label: '举办校区' },
      ],
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: '活动图片' },
    { name: 'description', type: 'textarea', label: '活动介绍' },
    {
      name: 'registrationNote',
      type: 'text',
      label: '报名方式说明',
      admin: { description: '如：扫描页面二维码或拨打咨询热线报名' },
    },
  ],
}
