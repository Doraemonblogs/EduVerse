import type { CollectionConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { orderField } from '@/fields/common'
import { slug } from '@/fields/slug'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

export const SOFTWARE_CATEGORY_OPTIONS = [
  { label: '三维建模与动画', value: 'modeling' },
  { label: '渲染与引擎', value: 'rendering' },
  { label: '后期与特效', value: 'compositing' },
  { label: '平面与 UI', value: 'design' },
  { label: '数字绘画', value: 'painting' },
]

export const Software: CollectionConfig = {
  slug: 'software',
  labels: { singular: '软件', plural: '软件' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'order'],
    group: ADMIN_GROUPS.curriculum,
    hidden: hiddenFromConsultant,
    description: '只填写软件名称，不上传厂商 Logo（商标）。',
  },
  defaultSort: 'order',
  access: {
    read: anyone,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: revalidateCollection('software'),
  fields: [
    { name: 'name', type: 'text', label: '软件名称', required: true },
    {
      name: 'category',
      type: 'select',
      label: '类别',
      required: true,
      options: SOFTWARE_CATEGORY_OPTIONS,
    },
    slug('name'),
    orderField,
  ],
}
