import type { ArrayField, CollectionConfig } from 'payload'

import { hiddenFromConsultant, isStaffEditor, publishedOrEditor } from '@/access/roles'
import { featuredField, orderField, salaryRefGroup } from '@/fields/common'
import { seoTab } from '@/fields/seo'
import { slug } from '@/fields/slug'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

export const CLASS_TYPE_OPTIONS = [
  { label: '长期就业班', value: 'long_term' },
  { label: '短期提升班', value: 'short_term' },
]

export const DELIVERY_MODE_OPTIONS = [
  { label: '线下面授', value: 'offline' },
  { label: '线上直播', value: 'online' },
  { label: '双师课堂', value: 'dual' },
]

/** 纯文本列表（亮点、适合人群、知识点等） */
const textItems = (name: string, label: string, itemLabel: string): ArrayField => ({
  name,
  type: 'array',
  label,
  labels: { singular: itemLabel, plural: itemLabel },
  fields: [{ name: 'text', type: 'text', label: itemLabel, required: true }],
})

export const Courses: CollectionConfig = {
  slug: 'courses',
  labels: { singular: '课程', plural: '课程' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'discipline', 'classType', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    group: ADMIN_GROUPS.curriculum,
    hidden: hiddenFromConsultant,
  },
  defaultSort: 'order',
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrEditor,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: revalidateCollection('courses'),
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '基本信息',
          fields: [
            { name: 'title', type: 'text', label: '课程名称', required: true },
            {
              name: 'discipline',
              type: 'relationship',
              relationTo: 'disciplines',
              label: '专业方向',
              required: true,
              index: true,
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'classType',
                  type: 'select',
                  label: '班型',
                  required: true,
                  options: CLASS_TYPE_OPTIONS,
                },
                {
                  name: 'deliveryModes',
                  type: 'select',
                  label: '授课方式',
                  hasMany: true,
                  required: true,
                  options: DELIVERY_MODE_OPTIONS,
                },
              ],
            },
            {
              name: 'campuses',
              type: 'relationship',
              relationTo: 'campuses',
              hasMany: true,
              label: '开设校区',
              admin: { description: '线下面授 / 双师课堂开设的校区；纯线上课程可不填' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'duration',
                  type: 'group',
                  label: '课程时长',
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'value', type: 'number', label: '数值', required: true, min: 1 },
                        {
                          name: 'unit',
                          type: 'select',
                          label: '单位',
                          required: true,
                          defaultValue: 'month',
                          options: [
                            { label: '周', value: 'week' },
                            { label: '个月', value: 'month' },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'schedule',
                  type: 'text',
                  label: '上课时间',
                  admin: { description: '如：全日制（周一至周五）、周末班、晚班' },
                },
              ],
            },
            {
              name: 'summary',
              type: 'textarea',
              label: '课程简介',
              required: true,
              maxLength: 200,
            },
            { name: 'cover', type: 'upload', relationTo: 'media', label: '封面图', required: true },
            textItems('highlights', '课程亮点', '亮点'),
          ],
        },
        {
          label: '课程内容',
          fields: [
            textItems('audience', '适合人群', '人群'),
            {
              name: 'stages',
              type: 'array',
              label: '分阶段大纲',
              labels: { singular: '阶段', plural: '阶段' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'title', type: 'text', label: '阶段名称', required: true },
                    {
                      name: 'duration',
                      type: 'text',
                      label: '时长',
                      admin: { description: '如：4 周' },
                    },
                  ],
                },
                { name: 'goals', type: 'textarea', label: '阶段目标' },
                textItems('topics', '知识点', '知识点'),
              ],
            },
            {
              name: 'software',
              type: 'relationship',
              relationTo: 'software',
              hasMany: true,
              label: '所用软件',
            },
            {
              name: 'projects',
              type: 'array',
              label: '实训项目',
              labels: { singular: '项目', plural: '项目' },
              fields: [
                { name: 'title', type: 'text', label: '项目名称', required: true },
                { name: 'description', type: 'textarea', label: '项目说明' },
                { name: 'image', type: 'upload', relationTo: 'media', label: '配图' },
              ],
            },
            {
              name: 'teachers',
              type: 'relationship',
              relationTo: 'teachers',
              hasMany: true,
              label: '授课讲师',
            },
            {
              name: 'faqs',
              type: 'relationship',
              relationTo: 'faqs',
              hasMany: true,
              label: '常见问题',
            },
          ],
        },
        {
          label: '就业方向',
          fields: [
            {
              name: 'careerDirections',
              type: 'array',
              label: '就业方向',
              labels: { singular: '方向', plural: '方向' },
              fields: [
                { name: 'title', type: 'text', label: '岗位', required: true },
                { name: 'description', type: 'textarea', label: '说明' },
              ],
            },
            {
              ...salaryRefGroup,
              admin: {
                description: '留空则使用所属专业方向的薪资参考。填写区间时必须注明来源与统计时间。',
              },
            },
          ],
        },
        {
          label: '开班与作品',
          fields: [
            {
              name: 'cohorts',
              type: 'join',
              collection: 'cohorts',
              on: 'course',
              label: '开班计划',
            },
            { name: 'works', type: 'join', collection: 'works', on: 'course', label: '学员作品' },
          ],
        },
        seoTab,
      ],
    },
    slug('title'),
    featuredField,
    orderField,
  ],
}
