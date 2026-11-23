import type { GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { sectionFields } from '@/fields/common'
import { seoTab } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

import { CAREERS_PAGE_DEFAULTS as D } from './careers-page-defaults'

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
            { name: 'eyebrow', type: 'text', label: '英文眉标', defaultValue: D.intro.eyebrow },
            {
              name: 'title',
              type: 'text',
              label: '标题',
              required: true,
              defaultValue: D.intro.title,
            },
            { name: 'description', type: 'textarea', label: '描述' },
          ],
        },
        {
          name: 'process',
          label: '服务流程',
          description: '不得承诺就业结果（如“包就业”“保证入职”），只描述学院提供的服务内容。',
          fields: [
            ...sectionFields(D.sections.process),
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
            '展示已发布、已确认授权的学员故事（精选在前，其后按排序，最多 12 个），受站点设置“展示学员故事模块”总开关控制；不展示个人薪资。',
          fields: sectionFields(D.sections.stories),
        },
        {
          name: 'partners',
          label: '合作企业',
          description: '合作企业在「合作企业」中维护',
          fields: sectionFields(D.sections.partners),
        },
        {
          name: 'events',
          label: '招聘活动',
          description: '招聘活动在「招聘活动」中维护；页面只显示今天及以后的活动（按日期先后）。',
          fields: sectionFields(D.sections.events),
        },
        {
          name: 'cta',
          label: '行动号召',
          description: '页面结尾行动号召区块（含预约就业咨询表单）的标题与说明。',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: '行动号召标题',
              required: true,
              defaultValue: D.cta.title,
            },
            {
              name: 'description',
              type: 'textarea',
              label: '行动号召说明',
              defaultValue: D.cta.description,
              admin: { description: '不得承诺就业结果，不写就业率、薪资承诺' },
            },
          ],
        },
        seoTab,
      ],
    },
  ],
}
