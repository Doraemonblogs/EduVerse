import type { CollectionConfig, RowField } from 'payload'

import { hiddenFromConsultant, isStaffEditor, publishedOrEditor } from '@/access/roles'
import { CtaBlock } from '@/blocks/CtaBlock'
import { ImageTextBlock } from '@/blocks/ImageTextBlock'
import { RichTextBlock } from '@/blocks/RichTextBlock'
import { StatsBlock } from '@/blocks/StatsBlock'
import { TimelineBlock } from '@/blocks/TimelineBlock'
import { seoTab } from '@/fields/seo'
import { slug } from '@/fields/slug'
import { revalidateCollection } from '@/hooks/revalidate'
import { validateReservedSlug } from '@/lib/reserved-slugs'

import { ADMIN_GROUPS } from './groups'

/** 前台固定路由对应的页面 slug */
export const RESERVED_PAGE_SLUGS = {
  about: 'about',
  contact: 'contact',
  privacy: 'privacy',
  terms: 'terms',
} as const

// 说明文字会写进 payload-types.ts 的注释，修改后需重新生成类型
const SLUG_DESCRIPTION =
  '关于我们 about / 联系我们 contact / 隐私政策 privacy / 用户协议 terms 使用固定 slug'

/**
 * 复用通用 slug 字段：替换说明文字，并拒绝被前台固定路由占用的 slug
 * （页面挂在 /[pageSlug] 下，同名页面保存后也永远无法访问）。
 */
function pageSlugField(): RowField {
  return slug('title', { description: SLUG_DESCRIPTION, validate: validateReservedSlug })
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: '页面', plural: '页面' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromConsultant,
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrEditor,
    readVersions: isStaffEditor,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: revalidateCollection('pages'),
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '内容',
          fields: [
            { name: 'title', type: 'text', label: '标题', required: true },
            {
              name: 'layout',
              type: 'blocks',
              label: '页面区块',
              labels: { singular: '区块', plural: '区块' },
              required: true,
              minRows: 1,
              blocks: [RichTextBlock, ImageTextBlock, StatsBlock, TimelineBlock, CtaBlock],
            },
          ],
        },
        seoTab,
      ],
    },
    pageSlugField(),
  ],
}
