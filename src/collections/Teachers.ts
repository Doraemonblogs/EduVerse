import type { CollectionConfig } from 'payload'

import { hiddenFromConsultant, isStaffEditor, publishedOrEditor } from '@/access/roles'
import { featuredField, orderField } from '@/fields/common'
import { seoTab } from '@/fields/seo'
import { slug } from '@/fields/slug'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

export const Teachers: CollectionConfig = {
  slug: 'teachers',
  labels: { singular: '讲师', plural: '讲师' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'title', 'campus', '_status', 'order'],
    listSearchableFields: ['name', 'title'],
    group: ADMIN_GROUPS.trust,
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
  hooks: revalidateCollection('teachers'),
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '基本信息',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'name', type: 'text', label: '姓名', required: true },
                {
                  name: 'title',
                  type: 'text',
                  label: '头衔',
                  required: true,
                  admin: { description: '如：三维动画讲师。不使用“首席”“顶级”等绝对化用语' },
                },
              ],
            },
            {
              name: 'avatar',
              type: 'upload',
              relationTo: 'media',
              label: '头像',
              required: true,
              admin: { description: '建议正方形，不小于 600×600' },
            },
            {
              name: 'disciplines',
              type: 'relationship',
              relationTo: 'disciplines',
              hasMany: true,
              label: '专业方向',
            },
            {
              type: 'row',
              fields: [
                { name: 'campus', type: 'relationship', relationTo: 'campuses', label: '所在校区' },
                {
                  name: 'yearsOfExperience',
                  type: 'number',
                  label: '从业年限（年）',
                  min: 0,
                  admin: { description: '如实填写行业从业年限' },
                },
              ],
            },
            {
              name: 'specialties',
              type: 'array',
              label: '擅长领域',
              labels: { singular: '领域', plural: '擅长领域' },
              fields: [{ name: 'text', type: 'text', label: '领域', required: true }],
            },
          ],
        },
        {
          label: '介绍',
          fields: [
            { name: 'bio', type: 'richText', label: '个人简介' },
            {
              name: 'experience',
              type: 'array',
              label: '从业经历',
              labels: { singular: '经历', plural: '从业经历' },
              admin: { description: '经历须真实，机构名称如实填写' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'period',
                      type: 'text',
                      label: '时间',
                      admin: { description: '如：2018–2022' },
                    },
                    { name: 'org', type: 'text', label: '机构 / 公司', required: true },
                    { name: 'role', type: 'text', label: '职位', required: true },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: '授课课程',
          fields: [
            {
              name: 'courses',
              type: 'join',
              collection: 'courses',
              on: 'teachers',
              label: '授课课程',
              admin: { description: '在课程的「授课讲师」中关联后自动汇总到这里' },
            },
          ],
        },
        seoTab,
      ],
    },
    slug('name'),
    featuredField,
    orderField,
  ],
}
