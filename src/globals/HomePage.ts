import type { GlobalConfig, TextFieldSingleValidation } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { sectionFields, validateHref } from '@/fields/common'
import { seoTab } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

export const QUICK_ENTRY_ACTION_OPTIONS = [
  { label: '跳转链接', value: 'link' },
  { label: '打开预约弹窗', value: 'lead' },
]

export const FEATURED_WORKS_MODE_OPTIONS = [
  { label: '自动取精选作品', value: 'auto' },
  { label: '手动挑选', value: 'manual' },
]

/** 点击行为为“跳转链接”时地址必填（字段被 condition 隐藏时 Payload 不执行校验） */
const validateEntryHref: TextFieldSingleValidation = (value, options) => {
  const action = (options.siblingData as { action?: string } | undefined)?.action
  if (action === 'link' && !value) return '请填写链接地址'
  return validateHref(value, options)
}

/**
 * 首页配置：每个标签页对应一个区块（数据按区块分组存储，如 hotDisciplines.title）。
 * 关联内容留空时由前台数据层按规则自动取数。
 */
export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: '首页',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('home-page') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'hero',
          label: '主视觉',
          description: '主视觉轮播图在「轮播图」中维护（投放位置：首页主视觉）',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'autoplay', type: 'checkbox', label: '自动轮播', defaultValue: true },
                {
                  name: 'interval',
                  type: 'number',
                  label: '轮播间隔（秒）',
                  defaultValue: 6,
                  min: 3,
                  admin: { condition: (_, siblingData) => siblingData?.autoplay !== false },
                },
              ],
            },
          ],
        },
        {
          name: 'quickEntries',
          label: '快速了解',
          fields: [
            ...sectionFields({ title: '快速了解', eyebrow: 'Start Here' }),
            {
              name: 'items',
              type: 'array',
              label: '入口卡片',
              labels: { singular: '入口', plural: '入口卡片' },
              maxRows: 4,
              fields: [
                { name: 'title', type: 'text', label: '标题', required: true },
                { name: 'description', type: 'text', label: '说明' },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'action',
                      type: 'select',
                      label: '点击行为',
                      required: true,
                      defaultValue: 'link',
                      options: QUICK_ENTRY_ACTION_OPTIONS,
                    },
                    {
                      name: 'href',
                      type: 'text',
                      label: '链接地址',
                      validate: validateEntryHref,
                      admin: {
                        condition: (_, siblingData) => siblingData?.action === 'link',
                        description: '站内路径如 /courses，外链如 https://example.com',
                      },
                    },
                  ],
                },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  label: '配图',
                  admin: { description: '留空则只显示文字' },
                },
              ],
            },
          ],
        },
        {
          name: 'hotDisciplines',
          label: '热门专业',
          fields: [
            ...sectionFields({ title: '热门专业', eyebrow: 'Majors' }),
            {
              name: 'disciplines',
              type: 'relationship',
              relationTo: 'disciplines',
              hasMany: true,
              label: '指定专业',
              admin: { description: '留空则按排序取前 6 个' },
            },
          ],
        },
        {
          name: 'featuredWorks',
          label: '学员作品',
          fields: [
            ...sectionFields({ title: '学员作品', eyebrow: 'Student Works' }),
            {
              type: 'row',
              fields: [
                {
                  name: 'mode',
                  type: 'select',
                  label: '取数方式',
                  required: true,
                  defaultValue: 'auto',
                  options: FEATURED_WORKS_MODE_OPTIONS,
                },
                {
                  name: 'limit',
                  type: 'number',
                  label: '展示数量',
                  defaultValue: 12,
                  min: 4,
                  max: 24,
                },
              ],
            },
            {
              name: 'works',
              type: 'relationship',
              relationTo: 'works',
              hasMany: true,
              label: '指定作品',
              admin: {
                condition: (_, siblingData) => siblingData?.mode === 'manual',
                description: '按所选顺序展示；未发布的作品不会出现在前台',
              },
            },
          ],
        },
        {
          name: 'stories',
          label: '学员故事',
          description: '受站点设置“展示学员故事模块”总开关控制',
          fields: [
            ...sectionFields({ title: '学员故事', eyebrow: 'Stories' }),
            {
              name: 'stories',
              type: 'relationship',
              relationTo: 'stories',
              hasMany: true,
              label: '指定学员故事',
              admin: { description: '留空则取精选学员故事' },
            },
          ],
        },
        {
          name: 'teachers',
          label: '师资团队',
          fields: [
            ...sectionFields({ title: '师资团队', eyebrow: 'Mentors' }),
            {
              name: 'teachers',
              type: 'relationship',
              relationTo: 'teachers',
              hasMany: true,
              label: '指定讲师',
              admin: { description: '留空则取精选讲师' },
            },
          ],
        },
        {
          name: 'campuses',
          label: '校区分布',
          description: '校区信息在「校区」中维护',
          fields: sectionFields({ title: '校区分布', eyebrow: 'Campuses' }),
        },
        {
          name: 'partners',
          label: '合作企业',
          description: '合作企业在「合作企业」中维护',
          fields: sectionFields({ title: '合作企业', eyebrow: 'Partners' }),
        },
        {
          name: 'articles',
          label: '最新资讯',
          fields: [
            ...sectionFields({ title: '最新资讯', eyebrow: 'News' }),
            {
              name: 'limit',
              type: 'number',
              label: '展示数量',
              defaultValue: 6,
              min: 1,
              max: 12,
            },
          ],
        },
        {
          name: 'leadForm',
          label: '预约试听',
          fields: [
            ...sectionFields({ title: '预约一节免费试听课', eyebrow: 'Free Trial' }),
            { name: 'submitLabel', type: 'text', label: '提交按钮文字', defaultValue: '立即预约' },
          ],
        },
        seoTab,
      ],
    },
  ],
}
