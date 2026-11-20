import type { GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { seoTab } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

/** 职业测试页文案；题目与计分在「职业测试题」中维护 */
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
              defaultValue: '找到适合你的数字艺术方向',
            },
            { name: 'description', type: 'textarea', label: '描述' },
            {
              name: 'startLabel',
              type: 'text',
              label: '开始按钮文字',
              required: true,
              defaultValue: '开始测试',
            },
          ],
        },
        {
          name: 'result',
          label: '结果页',
          description: '结果页先展示推荐方向摘要，完整报告需留下联系方式后查看。',
          fields: [
            {
              name: 'summaryTitle',
              type: 'text',
              label: '摘要标题',
              required: true,
              defaultValue: '你的推荐方向',
            },
            {
              name: 'gatedTitle',
              type: 'text',
              label: '完整报告标题',
              required: true,
              defaultValue: '获取完整报告',
            },
            {
              name: 'gatedDescription',
              type: 'textarea',
              label: '完整报告说明',
              admin: { description: '说明完整报告包含哪些内容，不得承诺学习或就业效果' },
            },
            {
              name: 'unlockLabel',
              type: 'text',
              label: '解锁按钮文字',
              required: true,
              defaultValue: '留下联系方式查看完整报告',
            },
          ],
        },
        seoTab,
      ],
    },
  ],
}
