import type { GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { seoFields } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

import { ARTICLE_PAGES_DEFAULTS as D } from './article-pages-defaults'

/**
 * 资讯页面设置：资讯列表 /articles（含分类页 /articles/category/[slug]）与资讯详情 /articles/[slug]
 * 的页面级文案。文章与分类本身在「文章」「文章分类」集合中维护；每个标签页的数据按页面分组存储（如 list.title）。
 */
export const ArticlePages: GlobalConfig = {
  slug: 'article-pages',
  label: '资讯页面设置',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('article-pages') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'list',
          label: '列表页',
          description:
            '资讯列表页 /articles 的标题、简介与 SEO。分类页的标题与简介取自各分类的名称与描述。',
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
                description: '分页（/articles?page=2）可以收录，标题会自动带上页码。',
              },
              fields: seoFields,
            },
          ],
        },
        {
          name: 'detail',
          label: '详情页',
          description: '资讯详情页侧栏留资卡片的标题与说明（侧栏另有“热门课程”，取自精选课程）。',
          fields: [
            {
              name: 'sidebarTitle',
              type: 'text',
              label: '侧栏标题',
              required: true,
              defaultValue: D.detail.sidebarTitle,
            },
            {
              name: 'sidebarDescription',
              type: 'textarea',
              label: '侧栏说明',
              defaultValue: D.detail.sidebarDescription,
              admin: { description: '不得承诺学习或就业效果' },
            },
          ],
        },
      ],
    },
  ],
}
