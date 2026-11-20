import type { CollectionConfig, TextFieldSingleValidation } from 'payload'
import { text } from 'payload/shared'

import { hiddenFromConsultant, isStaffEditor, publishedOrEditor } from '@/access/roles'
import { orderField } from '@/fields/common'
import { seoTab } from '@/fields/seo'
import { slug } from '@/fields/slug'
import { revalidateCollection } from '@/hooks/revalidate'
import { validateSlug } from '@/lib/slugify'

import { ADMIN_GROUPS } from './groups'

/** 自定义 validate 会替换内置校验，先跑内置校验以保留必填等规则 */
const validateCitySlug: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options)
  return base === true ? validateSlug(value) : base
}

export const Campuses: CollectionConfig = {
  slug: 'campuses',
  labels: { singular: '校区', plural: '校区' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'address', '_status', 'order'],
    listSearchableFields: ['name', 'city', 'address'],
    group: ADMIN_GROUPS.content,
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
  hooks: revalidateCollection('campuses'),
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '基本信息',
          fields: [
            { name: 'name', type: 'text', label: '校区名称', required: true },
            {
              type: 'row',
              fields: [
                {
                  name: 'city',
                  type: 'text',
                  label: '城市',
                  required: true,
                  admin: { description: '如：北京' },
                },
                {
                  name: 'citySlug',
                  type: 'text',
                  label: '城市标识',
                  required: true,
                  index: true,
                  validate: validateCitySlug,
                  admin: {
                    description: '用于课程筛选的城市标识，如 beijing；同城多个校区填相同值',
                  },
                },
              ],
            },
            { name: 'address', type: 'text', label: '详细地址', required: true },
            {
              name: 'location',
              type: 'group',
              label: '地图坐标',
              admin: {
                description: '高德坐标系 GCJ-02，用于生成“在高德 / 百度地图中打开”链接',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'lng', type: 'number', label: '经度', min: -180, max: 180 },
                    { name: 'lat', type: 'number', label: '纬度', min: -90, max: 90 },
                  ],
                },
              ],
            },
            {
              name: 'transit',
              type: 'textarea',
              label: '交通指引',
              admin: { description: '如：地铁 10 号线某站 B 口出，步行约 5 分钟' },
            },
            {
              type: 'row',
              fields: [
                { name: 'phone', type: 'text', label: '校区电话' },
                {
                  name: 'openingHours',
                  type: 'text',
                  label: '开放时间',
                  admin: { description: '如：周一至周日 9:00–21:00' },
                },
              ],
            },
          ],
        },
        {
          label: '环境',
          fields: [
            { name: 'cover', type: 'upload', relationTo: 'media', label: '封面图', required: true },
            {
              name: 'photos',
              type: 'array',
              label: '环境照片',
              labels: { singular: '照片', plural: '照片' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  label: '图片',
                  required: true,
                },
                {
                  name: 'caption',
                  type: 'text',
                  label: '说明',
                  admin: { description: '如：前台接待区' },
                },
              ],
            },
          ],
        },
        {
          label: '开设课程',
          fields: [
            { name: 'courses', type: 'join', collection: 'courses', on: 'campuses', label: '课程' },
          ],
        },
        seoTab,
      ],
    },
    slug('name'),
    orderField,
  ],
}
