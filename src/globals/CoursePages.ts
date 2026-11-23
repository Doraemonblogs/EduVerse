import type { GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { seoFields } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

import { COURSE_PAGES_DEFAULTS as D } from './course-pages-defaults'

/**
 * 课程页面设置：课程列表 /courses、课程详情 /courses/[slug]、专业方向页 /majors/[slug] 的页面级文案。
 * 课程、专业方向本身的内容在各自的集合中维护；每个标签页的数据按页面分组存储（如 list.title）。
 */
export const CoursePages: GlobalConfig = {
  slug: 'course-pages',
  label: '课程页面设置',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('course-pages') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'list',
          label: '课程列表',
          description: '课程列表页 /courses 的标题、简介与 SEO。课程卡片内容来自各课程。',
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
                description: '带筛选条件的列表页不会被搜索引擎收录，规范地址始终是 /courses。',
              },
              fields: seoFields,
            },
          ],
        },
        {
          name: 'detail',
          label: '课程详情',
          description: '课程详情页右侧（移动端在正文之后）预约表单的标题与说明。',
          fields: [
            {
              name: 'sidebarTitle',
              type: 'text',
              label: '表单标题',
              required: true,
              defaultValue: D.detail.sidebarTitle,
            },
            {
              name: 'sidebarDescription',
              type: 'textarea',
              label: '表单说明',
              defaultValue: D.detail.sidebarDescription,
            },
          ],
        },
        {
          name: 'major',
          label: '专业方向页',
          description: '专业方向页结尾行动号召区块（含预约表单）的标题与说明。',
          fields: [
            {
              name: 'ctaTitle',
              type: 'text',
              label: '行动号召标题',
              required: true,
              defaultValue: D.major.ctaTitle,
            },
            {
              name: 'ctaDescription',
              type: 'textarea',
              label: '行动号召说明',
              defaultValue: D.major.ctaDescription,
              admin: { description: '不得承诺学习或就业效果' },
            },
          ],
        },
      ],
    },
  ],
}
