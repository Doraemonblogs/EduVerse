import type { GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { seoTab } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

import { QUIZ_SETTINGS_DEFAULTS as D } from './quiz-settings-defaults'

const COMPLIANCE_HINT = '不得承诺学习或就业效果，不使用“最好”“第一”等绝对化用语'

/** 职业测试页 /quiz 的文案；题目与计分在「职业测试题」中维护 */
export const QuizSettings: GlobalConfig = {
  slug: 'quiz-settings',
  label: '职业测试设置',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('quiz-settings') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'intro',
          label: '开始页',
          description: '题目与各选项的专业加分在「职业测试题」中维护',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: '标题',
              required: true,
              defaultValue: D.intro.title,
            },
            {
              name: 'description',
              type: 'textarea',
              label: '描述',
              defaultValue: D.intro.description,
            },
            {
              name: 'startLabel',
              type: 'text',
              label: '开始按钮文字',
              required: true,
              defaultValue: D.intro.startLabel,
            },
          ],
        },
        {
          name: 'result',
          label: '结果页',
          description:
            '结果页先展示推荐方向摘要；完整报告（各方向匹配度、推荐课程、下一步建议）在留下联系方式后展开。完整报告用于引导咨询，并非访问控制。',
          fields: [
            {
              name: 'summaryTitle',
              type: 'text',
              label: '摘要标题',
              required: true,
              defaultValue: D.result.summaryTitle,
            },
            {
              name: 'gatedTitle',
              type: 'text',
              label: '留资区标题',
              required: true,
              defaultValue: D.result.gatedTitle,
              admin: { description: '未留资时，完整报告位置显示的标题' },
            },
            {
              name: 'gatedDescription',
              type: 'textarea',
              label: '留资区说明',
              defaultValue: D.result.gatedDescription,
              admin: { description: `说明完整报告包含哪些内容。${COMPLIANCE_HINT}` },
            },
            {
              name: 'unlockLabel',
              type: 'text',
              label: '解锁按钮文字',
              required: true,
              defaultValue: D.result.unlockLabel,
            },
            {
              name: 'reportTitle',
              type: 'text',
              label: '完整报告标题',
              required: true,
              defaultValue: D.result.reportTitle,
              admin: { description: '留资后展开的完整报告的标题' },
            },
            {
              name: 'disclaimer',
              type: 'textarea',
              label: '结果说明',
              defaultValue: D.result.disclaimer,
              admin: {
                description: `显示在结果页底部，说明测试结果仅供参考。清空则不显示。${COMPLIANCE_HINT}`,
              },
            },
            {
              name: 'nextStepsTitle',
              type: 'text',
              label: '下一步建议标题',
              required: true,
              defaultValue: D.result.nextStepsTitle,
            },
            {
              name: 'nextSteps',
              type: 'array',
              label: '下一步建议',
              labels: { singular: '建议', plural: '下一步建议' },
              maxRows: 5,
              defaultValue: D.result.nextSteps.map((step) => ({ ...step })),
              admin: {
                description: `完整报告末尾的行动建议，按顺序显示。${COMPLIANCE_HINT}`,
              },
              fields: [
                { name: 'title', type: 'text', label: '标题', required: true },
                { name: 'description', type: 'textarea', label: '说明' },
              ],
            },
          ],
        },
        seoTab,
      ],
    },
  ],
}
