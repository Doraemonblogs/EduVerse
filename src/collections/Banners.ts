import type { CollectionConfig, DateFieldValidation } from 'payload'
import { date } from 'payload/shared'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { orderField, validateHref } from '@/fields/common'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

export const BANNER_PLACEMENT_OPTIONS = [
  { label: '首页主视觉', value: 'home_hero' },
  { label: '就业服务页顶部', value: 'careers_hero' },
]

/** 结束时间必须晚于开始时间（先跑内置日期校验，自定义 validate 会替换它） */
const validateEndAt: DateFieldValidation = (value, options) => {
  const base = date(value, options)
  if (base !== true) return base
  const startAt = (options.siblingData as { startAt?: unknown } | undefined)?.startAt
  if (!value || !startAt) return true
  const start = new Date(startAt as string | Date).getTime()
  const end = new Date(value).getTime()
  return Number.isNaN(start) || Number.isNaN(end) || end > start ? true : '结束时间必须晚于开始时间'
}

export const Banners: CollectionConfig = {
  slug: 'banners',
  labels: { singular: '轮播图', plural: '轮播图' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'placement', 'active', 'startAt', 'endAt', 'order'],
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
  hooks: revalidateCollection('banners'),
  fields: [
    { name: 'title', type: 'text', label: '标题', required: true },
    { name: 'subtitle', type: 'textarea', label: '副标题' },
    {
      type: 'row',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: '桌面端图片',
          required: true,
          admin: { description: '桌面端建议 1920×800' },
        },
        {
          name: 'mobileImage',
          type: 'upload',
          relationTo: 'media',
          label: '移动端图片',
          admin: { description: '移动端建议 750×1000，留空则裁切桌面图' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'ctaLabel',
          type: 'text',
          label: '按钮文字',
          admin: { description: '留空则不显示按钮' },
        },
        {
          name: 'href',
          type: 'text',
          label: '链接地址',
          validate: validateHref,
          admin: { description: '站内路径如 /courses，外链如 https://example.com' },
        },
      ],
    },
    {
      name: 'placement',
      type: 'select',
      label: '展示位置',
      required: true,
      defaultValue: 'home_hero',
      index: true,
      options: BANNER_PLACEMENT_OPTIONS,
      admin: { position: 'sidebar' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: '启用',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'startAt',
      type: 'date',
      label: '开始时间',
      admin: {
        position: 'sidebar',
        description: '留空则立即生效',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'yyyy-MM-dd HH:mm' },
      },
    },
    {
      name: 'endAt',
      type: 'date',
      label: '结束时间',
      validate: validateEndAt,
      admin: {
        position: 'sidebar',
        description: '留空则长期有效',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'yyyy-MM-dd HH:mm' },
      },
    },
    orderField,
  ],
}
