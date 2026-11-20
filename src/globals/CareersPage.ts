import type { GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { sectionFields } from '@/fields/common'
import { seoTab } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

/** 就业服务页配置：每个标签页对应一个区块（数据按区块分组存储，如 process.steps） */
export const CareersPage: GlobalConfig = {
  slug: 'careers-page',
  label: '就业服务页',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('careers-page') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'intro',
          label: '页面介绍',
          description: '顶部背景图在「轮播图」中维护（投放位置：就业服务页顶部）',
          fields: [
            { name: 'eyebrow', type: 'text', label: '英文眉标', defaultValue: 'Career Services' },
            {
              name: 'title',
              type: 'text',
              label: '标题',
              required: true,
              defaultValue: '就业服务',
            },
            { name: 'description', type: 'textarea', label: '描述' },
          ],
        },
        {
          name: 'process',
          label: '服务流程',
          description: '不得承诺就业结果（如“包就业”“保证入职”），只描述学院提供的服务内容。',
          fields: [
            ...sectionFields({ title: '就业服务流程', eyebrow: 'Process' }),
            {
              name: 'steps',
              type: 'array',
              label: '流程步骤',
              labels: { singular: '步骤', plural: '流程步骤' },
              maxRows: 6,
              fields: [
                { name: 'title', type: 'text', label: '步骤名称', required: true },
                { name: 'description', type: 'textarea', label: '说明' },
              ],
            },
          ],
        },
        {
          name: 'stories',
          label: '学员故事',
          description:
            '展示已发布的精选学员故事，受站点设置“展示学员故事模块”总开关控制；不展示个人薪资。',
          fields: sectionFields({ title: '学员故事', eyebrow: 'Stories' }),
        },
        {
          name: 'partners',
          label: '合作企业',
          description: '合作企业在「合作企业」中维护',
          fields: sectionFields({ title: '合作企业', eyebrow: 'Partners' }),
        },
        {
          name: 'events',
          label: '招聘活动',
          description: '招聘活动在「招聘活动」中维护',
          fields: sectionFields({ title: '招聘活动', eyebrow: 'Events' }),
        },
        seoTab,
      ],
    },
  ],
}
