import type { GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { seoFields } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

import { TEACHER_PAGES_DEFAULTS as D } from './teacher-pages-defaults'

/**
 * 师资页面设置：讲师列表 /teachers 与讲师详情 /teachers/[slug] 的页面级文案。
 * 讲师本身的内容在「讲师」集合中维护；每个标签页的数据按页面分组存储（如 list.title）。
 */
export const TeacherPages: GlobalConfig = {
  slug: 'teacher-pages',
  label: '师资页面设置',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('teacher-pages') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'list',
          label: '列表页',
          description: '讲师列表页 /teachers 的标题、简介与 SEO。讲师内容来自「讲师」集合。',
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
              admin: {
                description: '带筛选条件的列表页不会被搜索引擎收录，规范地址始终是 /teachers。',
              },
              fields: seoFields,
            },
          ],
        },
        {
          name: 'detail',
          label: '详情页',
          description: '讲师详情页结尾行动号召区块（含预约表单）的标题与说明。',
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
