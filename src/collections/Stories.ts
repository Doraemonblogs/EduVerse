import type { CollectionConfig } from 'payload'

import { hiddenFromConsultant, isStaffEditor, publishedOrEditor } from '@/access/roles'
import { consentField, featuredField, orderField } from '@/fields/common'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

export const Stories: CollectionConfig = {
  slug: 'stories',
  labels: { singular: '学员故事', plural: '学员故事' },
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'course', 'currentRole', 'featured', '_status'],
    group: ADMIN_GROUPS.trust,
    hidden: hiddenFromConsultant,
    description:
      '合规提示：使用化名，不展示个人薪资，不写“推荐/证明/保证”性质的表述（广告法第二十四条）；全站可在站点设置中关闭。',
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
  hooks: revalidateCollection('stories'),
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'displayName',
          type: 'text',
          label: '化名',
          required: true,
          admin: { description: '不使用学员真实姓名' },
        },
        {
          name: 'background',
          type: 'text',
          label: '学习前背景',
          admin: { description: '起点，如“财务转行”' },
        },
      ],
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: '头像',
      admin: { description: '可选；使用学员本人照片需取得授权，也可使用作品局部或插画头像' },
    },
    { name: 'course', type: 'relationship', relationTo: 'courses', label: '所学课程' },
    {
      type: 'row',
      fields: [
        { name: 'currentRole', type: 'text', label: '现任岗位' },
        { name: 'companyName', type: 'text', label: '就职公司' },
      ],
    },
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'partners',
      label: '合作企业',
      admin: { description: '若就职于合作企业可关联' },
    },
    {
      name: 'quote',
      type: 'textarea',
      label: '一句话摘要',
      maxLength: 120,
      admin: { description: '概括学习与转行经历，不写推荐、证明或效果承诺' },
    },
    { name: 'story', type: 'richText', label: '故事正文' },
    {
      name: 'works',
      type: 'relationship',
      relationTo: 'works',
      hasMany: true,
      label: '相关作品',
    },
    consentField,
    featuredField,
    orderField,
  ],
}
