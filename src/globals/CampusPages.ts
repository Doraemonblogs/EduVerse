import type { GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { seoFields } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

import { CAMPUS_PAGES_DEFAULTS as D } from './campus-pages-defaults'

/**
 * 校区页面设置：校区列表 /campuses 与校区详情 /campuses/[slug] 的页面级文案。
 * 校区本身的内容在「校区」集合中维护；每个标签页的数据按页面分组存储（如 list.title）。
 */
export const CampusPages: GlobalConfig = {
  slug: 'campus-pages',
  label: '校区页面设置',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('campus-pages') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'list',
          label: '列表页',
          description: '校区列表页 /campuses 的标题、简介与 SEO。校区内容来自「校区」集合。',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: '页面标题',
              required: true,
              defaultValue: D.list.title,
            },
            {
              name: 'description',
              type: 'textarea',
              label: '页面简介',
              defaultValue: D.list.description,
              admin: {
                description: '显示在标题下方，一两句话即可。不使用“最好”“第一”等绝对化用语。',
              },
            },
            {
              name: 'seo',
              type: 'group',
              label: 'SEO',
              fields: seoFields,
            },
          ],
        },
        {
          name: 'detail',
          label: '详情页',
          description: '校区详情页结尾行动号召区块（含预约到校参观表单）的标题与说明。',
          fields: [
            {
              name: 'ctaTitle',
              type: 'text',
              label: '行动号召标题',
              required: true,
              defaultValue: D.detail.ctaTitle,
            },
            {
              name: 'ctaDescription',
              type: 'textarea',
              label: '行动号召说明',
              defaultValue: D.detail.ctaDescription,
              admin: { description: '不得承诺学习或就业效果' },
            },
          ],
        },
      ],
    },
  ],
}
