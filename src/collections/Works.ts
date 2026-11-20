import type { CollectionConfig, TextFieldSingleValidation } from 'payload'

import { hiddenFromConsultant, isStaffEditor, publishedOrEditor } from '@/access/roles'
import { consentField, featuredField, orderField } from '@/fields/common'
import { seoTab } from '@/fields/seo'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

/** 外部播放器白名单：只允许大陆可稳定访问的视频平台官方播放器域名（https） */
export const ALLOWED_VIDEO_HOSTS = [
  'player.bilibili.com',
  'www.bilibili.com',
  'v.qq.com',
  'player.youku.com',
] as const

export const VIDEO_KIND_OPTIONS = [
  { label: '无', value: 'none' },
  { label: '外部播放器', value: 'embed' },
  { label: '上传视频', value: 'file' },
]

/** 是否为白名单内的 https 播放器地址（前台渲染 iframe 前也应再校验一次） */
export function isAllowedVideoEmbedUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' && (ALLOWED_VIDEO_HOSTS as readonly string[]).includes(url.hostname)
    )
  } catch {
    return false
  }
}

const validateEmbedUrl: TextFieldSingleValidation = (value, { siblingData }) => {
  if ((siblingData as { kind?: string } | undefined)?.kind !== 'embed') return true
  if (!value) return '请填写外部播放器地址'
  if (isAllowedVideoEmbedUrl(value)) return true
  return `请填写 https:// 开头的播放器地址，仅支持：${ALLOWED_VIDEO_HOSTS.join('、')}`
}

export const Works: CollectionConfig = {
  slug: 'works',
  labels: { singular: '学员作品', plural: '学员作品' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'discipline', 'featured', '_status', 'publishedAt'],
    listSearchableFields: ['title', 'author.displayName'],
    group: ADMIN_GROUPS.trust,
    hidden: hiddenFromConsultant,
  },
  defaultSort: '-publishedAt',
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrEditor,
    readVersions: isStaffEditor,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: revalidateCollection('works'),
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '作品',
          fields: [
            { name: 'title', type: 'text', label: '作品名称', required: true },
            {
              name: 'author',
              type: 'group',
              label: '作者',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'displayName',
                      type: 'text',
                      label: '署名',
                      required: true,
                      admin: { description: '化名或昵称，不使用真实姓名；展示前需经学员同意' },
                    },
                    {
                      name: 'cohortLabel',
                      type: 'text',
                      label: '届别',
                      admin: { description: '如 2026 届' },
                    },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'discipline',
                  type: 'relationship',
                  relationTo: 'disciplines',
                  label: '专业方向',
                  required: true,
                  index: true,
                },
                {
                  name: 'course',
                  type: 'relationship',
                  relationTo: 'courses',
                  label: '所学课程',
                  index: true,
                },
              ],
            },
            {
              name: 'software',
              type: 'relationship',
              relationTo: 'software',
              hasMany: true,
              label: '使用软件',
            },
            {
              name: 'cover',
              type: 'upload',
              relationTo: 'media',
              label: '封面图',
              required: true,
              admin: { description: '封面宽高比决定瀑布流排布，建议长边 ≥ 1600px' },
            },
            {
              name: 'gallery',
              type: 'array',
              label: '作品图集',
              labels: { singular: '图片', plural: '作品图集' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  label: '图片',
                  required: true,
                },
                { name: 'caption', type: 'text', label: '说明' },
              ],
            },
            {
              name: 'video',
              type: 'group',
              label: '视频',
              fields: [
                {
                  name: 'kind',
                  type: 'select',
                  label: '视频类型',
                  required: true,
                  defaultValue: 'none',
                  options: VIDEO_KIND_OPTIONS,
                },
                {
                  name: 'embedUrl',
                  type: 'text',
                  label: '播放器地址',
                  required: true,
                  validate: validateEmbedUrl,
                  admin: {
                    condition: (_, siblingData) => siblingData?.kind === 'embed',
                    description: `平台“分享 → 嵌入代码”中 iframe 的 src，仅支持：${ALLOWED_VIDEO_HOSTS.join('、')}`,
                  },
                },
                {
                  name: 'file',
                  type: 'upload',
                  relationTo: 'media',
                  label: '视频文件',
                  required: true,
                  filterOptions: { mimeType: { contains: 'video/' } },
                  admin: {
                    condition: (_, siblingData) => siblingData?.kind === 'file',
                    description: 'MP4 格式，不超过 50MB',
                  },
                },
              ],
            },
            { name: 'description', type: 'textarea', label: '作品说明' },
          ],
        },
        seoTab,
      ],
    },
    consentField,
    featuredField,
    {
      name: 'publishedAt',
      type: 'date',
      label: '发布时间',
      index: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'yyyy-MM-dd HH:mm' },
      },
    },
    orderField,
  ],
}
