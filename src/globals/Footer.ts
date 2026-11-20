import type { Field, GlobalConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { validateHref } from '@/fields/common'
import { revalidateGlobal } from '@/hooks/revalidate'

/** 文字 + 地址，两者都必填 */
const linkFields: Field[] = [
  {
    type: 'row',
    fields: [
      { name: 'label', type: 'text', label: '文字', required: true },
      {
        name: 'href',
        type: 'text',
        label: '地址',
        required: true,
        validate: validateHref,
        admin: { description: '站内路径如 /courses，外链如 https://example.com' },
      },
    ],
  },
]

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: '页脚',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('footer') },
  fields: [
    {
      name: 'columns',
      type: 'array',
      label: '链接分栏',
      labels: { singular: '分栏', plural: '链接分栏' },
      maxRows: 5,
      fields: [
        { name: 'title', type: 'text', label: '分栏标题', required: true },
        {
          name: 'links',
          type: 'array',
          label: '链接',
          labels: { singular: '链接', plural: '链接' },
          fields: linkFields,
        },
      ],
    },
    {
      name: 'qrcodes',
      type: 'array',
      label: '二维码',
      labels: { singular: '二维码', plural: '二维码' },
      maxRows: 3,
      admin: { description: '如：微信公众号、视频号、咨询微信' },
      fields: [
        { name: 'label', type: 'text', label: '说明文字', required: true },
        { name: 'image', type: 'upload', relationTo: 'media', label: '二维码图片', required: true },
      ],
    },
    {
      name: 'bottomLinks',
      type: 'array',
      label: '底部链接',
      labels: { singular: '链接', plural: '底部链接' },
      admin: { description: '版权信息旁的小链接，如：隐私政策、用户协议、网站地图' },
      fields: linkFields,
    },
    {
      name: 'copyright',
      type: 'text',
      label: '版权信息',
      defaultValue: '© {year} EduVerse 数艺学院',
      admin: { description: '支持 {year} 占位，会替换为当前年份' },
    },
  ],
}
