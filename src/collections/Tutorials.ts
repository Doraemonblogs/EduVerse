import type { CollectionConfig, FieldHook, TextFieldSingleValidation } from 'payload'
import { text } from 'payload/shared'

import { hiddenFromConsultant, isStaffEditor, publishedOrEditor } from '@/access/roles'
import { orderField } from '@/fields/common'
import { slug } from '@/fields/slug'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

/** 视频平台白名单（只嵌入大陆可稳定访问的平台） */
export const TUTORIAL_PROVIDER_OPTIONS = [{ label: '哔哩哔哩', value: 'bilibili' }]

export const TUTORIAL_LEVEL_OPTIONS = [
  { label: '入门', value: 'beginner' },
  { label: '进阶', value: 'intermediate' },
  { label: '高阶', value: 'advanced' },
]

/** 哔哩哔哩 BV 号：BV + 10 位字母数字 */
export const BILIBILI_BV_PATTERN = /^BV[0-9A-Za-z]{10}$/

/** 粘贴整条视频链接时自动提取 BV 号 */
const extractVideoId: FieldHook = ({ value }) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.match(/BV[0-9A-Za-z]{10}(?![0-9A-Za-z])/)?.[0] ?? trimmed
}

/** 自定义 validate 会替换内置校验，先跑内置校验以保留必填规则 */
const validateVideoId: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options)
  if (base !== true || !value) return base
  const provider =
    (options.siblingData as { provider?: string } | undefined)?.provider ?? 'bilibili'
  if (provider === 'bilibili' && !BILIBILI_BV_PATTERN.test(value)) {
    return '请填写正确的 BV 号：BV 开头，后跟 10 位字母或数字，如 BV1xx411c7XX'
  }
  return true
}

export const Tutorials: CollectionConfig = {
  slug: 'tutorials',
  labels: { singular: '免费教程', plural: '免费教程' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'discipline', 'level', 'gated', '_status', 'order'],
    listSearchableFields: ['title', 'slug'],
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromConsultant,
  },
  defaultSort: 'order',
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrEditor,
    readVersions: isStaffEditor,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: revalidateCollection('tutorials'),
  fields: [
    { name: 'title', type: 'text', label: '标题', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'discipline',
          type: 'relationship',
          relationTo: 'disciplines',
          label: '专业方向',
          index: true,
        },
        {
          name: 'level',
          type: 'select',
          label: '难度',
          defaultValue: 'beginner',
          options: TUTORIAL_LEVEL_OPTIONS,
        },
      ],
    },
    { name: 'cover', type: 'upload', relationTo: 'media', label: '封面图', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'provider',
          type: 'select',
          label: '视频平台',
          required: true,
          defaultValue: 'bilibili',
          options: TUTORIAL_PROVIDER_OPTIONS,
        },
        {
          name: 'videoId',
          type: 'text',
          label: '视频 ID',
          required: true,
          validate: validateVideoId,
          hooks: { beforeValidate: [extractVideoId] },
          admin: { description: '视频的 BV 号，如 BV1xx411c7XX；粘贴视频链接会自动提取' },
        },
        {
          name: 'duration',
          type: 'text',
          label: '时长',
          admin: { description: '如 12:30' },
        },
      ],
    },
    { name: 'description', type: 'textarea', label: '简介' },
    slug('title'),
    {
      name: 'gated',
      type: 'checkbox',
      label: '留资后解锁',
      defaultValue: false,
      admin: { position: 'sidebar', description: '软门槛：用于引导留资，并非内容保护' },
    },
    orderField,
  ],
}
