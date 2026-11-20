import type { GlobalConfig, TextFieldSingleValidation } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { validateHref } from '@/fields/common'
import { revalidateGlobal } from '@/hooks/revalidate'

export const NAV_ITEM_TYPE_OPTIONS = [
  { label: '普通链接', value: 'link' },
  { label: '专业课程大菜单', value: 'course_menu' },
]

/** 类型为“普通链接”时地址必填（字段被 condition 隐藏时 Payload 不执行校验） */
const validateItemHref: TextFieldSingleValidation = (value, options) => {
  const type = (options.siblingData as { type?: string } | undefined)?.type
  if (type === 'link' && !value) return '请填写链接地址'
  return validateHref(value, options)
}

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: '导航',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('navigation') },
  fields: [
    {
      name: 'items',
      type: 'array',
      label: '导航菜单',
      labels: { singular: '导航项', plural: '导航项' },
      maxRows: 10,
      admin: { description: '按顺序显示在页头；移动端收进侧边菜单。' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', label: '文字', required: true },
            {
              name: 'type',
              type: 'select',
              label: '类型',
              required: true,
              defaultValue: 'link',
              options: NAV_ITEM_TYPE_OPTIONS,
              admin: {
                description:
                  '专业课程大菜单自动读取「专业方向」中勾选了“在导航大菜单中显示”的专业及其课程',
              },
            },
          ],
        },
        {
          name: 'href',
          type: 'text',
          label: '链接地址',
          validate: validateItemHref,
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'link',
            description: '站内路径如 /courses，外链如 https://example.com',
          },
        },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      label: '页头按钮',
      admin: { description: '页头右侧的主按钮，点击打开预约试听弹窗' },
      fields: [{ name: 'label', type: 'text', label: '按钮文字', defaultValue: '预约试听' }],
    },
    {
      name: 'showSearch',
      type: 'checkbox',
      label: '显示搜索入口',
      defaultValue: true,
    },
  ],
}
