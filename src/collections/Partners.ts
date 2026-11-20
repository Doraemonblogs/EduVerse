import type { CollectionConfig, TextFieldSingleValidation } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { orderField } from '@/fields/common'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

const validateWebsite: TextFieldSingleValidation = (value) => {
  if (!value) return true
  try {
    if (new URL(value).protocol === 'https:') return true
  } catch {
    // 无法解析的地址按格式错误处理
  }
  return '请填写以 https:// 开头的完整网址'
}

export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: { singular: '合作企业', plural: '合作企业' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'industry', 'order'],
    group: ADMIN_GROUPS.trust,
    hidden: hiddenFromConsultant,
    description: '展示企业名称与 Logo 前须取得对方授权，合作关系须真实。',
  },
  defaultSort: 'order',
  access: {
    read: anyone,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: revalidateCollection('partners'),
  fields: [
    { name: 'name', type: 'text', label: '企业名称', required: true },
    { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'industry',
          type: 'text',
          label: '所属行业',
          admin: { description: '如：游戏研发、影视后期' },
        },
        {
          name: 'website',
          type: 'text',
          label: '官网',
          validate: validateWebsite,
          admin: { description: '可不填；填写时以 https:// 开头' },
        },
      ],
    },
    orderField,
  ],
}
