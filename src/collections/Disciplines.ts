import type { CollectionConfig } from 'payload'

import { hiddenFromConsultant, isStaffEditor, publishedOrEditor } from '@/access/roles'
import { orderField, salaryRefGroup } from '@/fields/common'
import { seoTab } from '@/fields/seo'
import { slug } from '@/fields/slug'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

export const Disciplines: CollectionConfig = {
  slug: 'disciplines',
  labels: { singular: '专业方向', plural: '专业方向' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'showInNav', '_status', 'order'],
    group: ADMIN_GROUPS.curriculum,
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
  hooks: revalidateCollection('disciplines'),
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '基本信息',
          fields: [
            { name: 'name', type: 'text', label: '名称', required: true },
            {
              name: 'shortName',
              type: 'text',
              label: '简称',
              admin: { description: '用于导航、标签等空间有限的位置，如“三维动画”' },
            },
            {
              name: 'tagline',
              type: 'text',
              label: '一句话介绍',
              maxLength: 60,
            },
            { name: 'cover', type: 'upload', relationTo: 'media', label: '封面图', required: true },
            { name: 'intro', type: 'richText', label: '专业介绍' },
          ],
        },
        {
          label: '就业方向',
          fields: [
            {
              name: 'careerDirections',
              type: 'array',
              label: '发展方向',
              labels: { singular: '方向', plural: '方向' },
              fields: [
                { name: 'title', type: 'text', label: '岗位 / 方向', required: true },
                { name: 'description', type: 'textarea', label: '说明' },
              ],
            },
            salaryRefGroup,
          ],
        },
        {
          label: '关联内容',
          fields: [
            {
              name: 'courses',
              type: 'join',
              collection: 'courses',
              on: 'discipline',
              label: '课程',
            },
            {
              name: 'teachers',
              type: 'join',
              collection: 'teachers',
              on: 'disciplines',
              label: '讲师',
            },
          ],
        },
        seoTab,
      ],
    },
    slug('name'),
    {
      name: 'showInNav',
      type: 'checkbox',
      label: '在导航大菜单中显示',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    orderField,
  ],
}
