import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { hiddenFromConsultant, isStaffEditor, publishedOrEditor } from '@/access/roles'
import { seoTab } from '@/fields/seo'
import { slug } from '@/fields/slug'
import { revalidateCollection } from '@/hooks/revalidate'
import { lexicalToPlainText, truncateText } from '@/lib/lexical-text'

import { ADMIN_GROUPS } from './groups'

/** searchText 最大长度（字符） */
export const ARTICLE_SEARCH_TEXT_MAX_LENGTH = 5000

/**
 * 生成站内搜索用的纯文本：标题 + 摘要 + 正文。
 * 部分更新（如前台只更新 views）时 data 中没有这些字段，回退到数据库中的原值。
 */
const buildSearchText: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const pick = (key: 'title' | 'excerpt' | 'content'): unknown =>
    key in data ? data[key] : originalDoc?.[key]

  const parts = [pick('title'), pick('excerpt')]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .concat(lexicalToPlainText(pick('content'), ARTICLE_SEARCH_TEXT_MAX_LENGTH))
    .filter(Boolean)

  data.searchText = truncateText(parts.join('\n'), ARTICLE_SEARCH_TEXT_MAX_LENGTH)
  return data
}

/**
 * 浏览量只由前台计数（M6 原生 SQL 自增）。后台编辑表单载入的是版本快照，
 * 保存时会把旧计数写回，因此更新时总是以主表当前值为准。
 */
const preserveViews: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (operation !== 'update' || !originalDoc?.id) return data
  const current = await req.payload.findByID({
    collection: 'articles',
    id: originalDoc.id,
    depth: 0,
    select: { views: true },
    disableErrors: true,
    req,
  })
  return { ...data, views: current?.views ?? originalDoc.views ?? 0 }
}

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: '文章', plural: '文章' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt', '_status', 'views'],
    listSearchableFields: ['title', 'slug'],
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromConsultant,
  },
  defaultSort: '-publishedAt',
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrEditor,
    readVersions: isStaffEditor,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: {
    ...revalidateCollection('articles'),
    beforeChange: [buildSearchText, preserveViews],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '内容',
          fields: [
            { name: 'title', type: 'text', label: '标题', required: true },
            {
              name: 'category',
              type: 'relationship',
              relationTo: 'article-categories',
              label: '分类',
              required: true,
              index: true,
            },
            { name: 'cover', type: 'upload', relationTo: 'media', label: '封面图', required: true },
            {
              name: 'excerpt',
              type: 'textarea',
              label: '摘要',
              required: true,
              maxLength: 200,
              admin: { description: '列表页与分享卡片展示，建议 60–120 个汉字' },
            },
            { name: 'content', type: 'richText', label: '正文', required: true },
          ],
        },
        {
          label: '关联',
          fields: [
            {
              name: 'relatedCourses',
              type: 'relationship',
              relationTo: 'courses',
              hasMany: true,
              label: '相关课程',
              admin: { description: '文章底部推荐的课程' },
            },
          ],
        },
        seoTab,
      ],
    },
    slug('title'),
    {
      name: 'authorName',
      type: 'text',
      label: '作者',
      defaultValue: '教研中心',
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: '发布时间',
      required: true,
      index: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'yyyy-MM-dd HH:mm' },
      },
    },
    {
      name: 'views',
      type: 'number',
      label: '浏览量',
      defaultValue: 0,
      min: 0,
      admin: { position: 'sidebar', readOnly: true, description: '由前台自动统计' },
    },
    {
      name: 'searchText',
      type: 'textarea',
      label: '搜索文本',
      admin: { hidden: true },
    },
  ],
}
