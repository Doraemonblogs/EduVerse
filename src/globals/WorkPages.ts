import type { GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { seoFields } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

import { WORK_PAGES_DEFAULTS as D } from './work-pages-defaults'

/**
 * 作品页面设置：学员作品列表 /works 与作品详情 /works/[id] 的页面级文案。
 * 作品本身的内容在「学员作品」集合中维护；每个标签页的数据按页面分组存储（如 list.title）。
 */
export const WorkPages: GlobalConfig = {
  slug: 'work-pages',
  label: '作品页面设置',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('work-pages') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'list',
          label: '列表页',
          description: '学员作品列表页 /works 的标题、简介与 SEO。作品内容来自「学员作品」集合。',
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
                description:
                  '带筛选条件的列表页不会被搜索引擎收录，规范地址是 /works；不带筛选的分页（/works?page=2）可以收录。',
              },
              fields: seoFields,
            },
          ],
        },
        {
          name: 'detail',
          label: '详情页',
          description: '作品详情页“预约试听”行动号召区块的标题与说明。',
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
