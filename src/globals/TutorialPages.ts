import type { GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { seoFields } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

import { TUTORIAL_PAGES_DEFAULTS as D } from './tutorial-pages-defaults'

/**
 * 教程页面设置：免费教程列表 /tutorials 的页面级文案，以及“留资后解锁”教程的留资区文案。
 * 教程本身在「免费教程」集合中维护；每个标签页的数据按用途分组存储（如 list.title、gate.title）。
 */
export const TutorialPages: GlobalConfig = {
  slug: 'tutorial-pages',
  label: '教程页面设置',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('tutorial-pages') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'list',
          label: '列表页',
          description:
            '免费教程列表页 /tutorials 的标题、简介与 SEO。教程内容来自「免费教程」集合。',
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
                  '带筛选条件或播放参数的地址不会被搜索引擎收录，规范地址是 /tutorials。',
              },
              fields: seoFields,
            },
          ],
        },
        {
          name: 'gate',
          label: '留资解锁',
          description:
            '勾选了“留资后解锁”的教程，播放前先显示这里的标题、说明与留资表单。这是引导留资的软门槛，视频本身在公开平台，并非内容保护。',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: '标题',
              required: true,
              defaultValue: D.gate.title,
            },
            {
              name: 'description',
              type: 'textarea',
              label: '说明',
              defaultValue: D.gate.description,
              admin: { description: '不得承诺学习或就业效果' },
            },
            {
              name: 'submitLabel',
              type: 'text',
              label: '提交按钮文字',
              required: true,
              defaultValue: D.gate.submitLabel,
            },
          ],
        },
      ],
    },
  ],
}
