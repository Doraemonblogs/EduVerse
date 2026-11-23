import type { GlobalConfig, TextFieldSingleValidation } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { sectionFields, validateHref } from '@/fields/common'
import { seoTab } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

import { HOME_PAGE_DEFAULTS } from './home-page-defaults'

const D = HOME_PAGE_DEFAULTS

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
 * 关联内容留空时由前台数据层按规则自动取数（规则见 src/lib/home/rules.ts）；
 * 默认值见 src/globals/home-page-defaults.ts（前台兜底共用）。
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
                {
                  name: 'autoplay',
                  type: 'checkbox',
                  label: '自动轮播',
                  defaultValue: D.hero.autoplay,
                  admin: { description: '访客开启“减少动态效果”时不会自动轮播' },
                },
                {
                  name: 'interval',
                  type: 'number',
                  label: '轮播间隔（秒）',
                  defaultValue: D.hero.interval,
                  min: D.hero.minInterval,
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
            ...sectionFields(D.sections.quickEntries),
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
            ...sectionFields(D.sections.hotDisciplines),
            {
              name: 'disciplines',
              type: 'relationship',
              relationTo: 'disciplines',
              hasMany: true,
              label: '指定专业',
              admin: {
                description:
                  '按所选顺序展示；留空则取全部“在导航大菜单中显示”的已发布专业（按排序，最多 8 个）',
              },
            },
          ],
        },
        {
          name: 'courses',
          label: '精选课程',
          fields: [
            ...sectionFields(D.sections.courses),
            {
              name: 'courses',
              type: 'relationship',
              relationTo: 'courses',
              hasMany: true,
              label: '指定课程',
              admin: {
                description:
                  '按所选顺序展示；留空则取每个专业方向排序最靠前的长期就业班（按专业方向排序）。未发布的课程不会出现在前台',
              },
            },
          ],
        },
        {
          name: 'featuredWorks',
          label: '学员作品',
          fields: [
            ...sectionFields(D.sections.featuredWorks),
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
                  defaultValue: D.featuredWorks.limit,
                  min: D.featuredWorks.min,
                  max: D.featuredWorks.max,
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
                description:
                  '按所选顺序展示；未发布或未确认授权的作品不会出现在前台，全部不可用时改为自动取精选作品',
              },
            },
          ],
        },
        {
          name: 'stories',
          label: '学员故事',
          description: '受站点设置“展示学员故事模块”总开关控制',
          fields: [
            ...sectionFields(D.sections.stories),
            {
              name: 'stories',
              type: 'relationship',
              relationTo: 'stories',
              hasMany: true,
              label: '指定学员故事',
              admin: {
                description:
                  '按所选顺序展示；留空则取精选学员故事。未发布或未确认授权的故事不会出现在前台',
              },
            },
          ],
        },
        {
          name: 'teachers',
          label: '师资团队',
          fields: [
            ...sectionFields(D.sections.teachers),
            {
              name: 'teachers',
              type: 'relationship',
              relationTo: 'teachers',
              hasMany: true,
              label: '指定讲师',
              admin: {
                description:
                  '按所选顺序展示（最多 8 位）；留空则取精选讲师，再按排序补足到 4 或 8 位',
              },
            },
          ],
        },
        {
          name: 'campuses',
          label: '校区分布',
          description: '校区信息在「校区」中维护',
          fields: sectionFields(D.sections.campuses),
        },
        {
          name: 'partners',
          label: '合作企业',
          description: '合作企业在「合作企业」中维护',
          fields: sectionFields(D.sections.partners),
        },
        {
          name: 'articles',
          label: '最新资讯',
          fields: [
            ...sectionFields(D.sections.articles),
            {
              name: 'limit',
              type: 'number',
              label: '展示数量',
              defaultValue: D.articles.limit,
              min: D.articles.min,
              max: D.articles.max,
            },
          ],
        },
        {
          name: 'leadForm',
          label: '预约试听',
          fields: [
            ...sectionFields(D.sections.leadForm),
            {
              name: 'submitLabel',
              type: 'text',
              label: '提交按钮文字',
              defaultValue: D.leadForm.submitLabel,
            },
          ],
        },
        seoTab,
      ],
    },
  ],
}
