import type { CollectionConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { orderField } from '@/fields/common'
import { slug } from '@/fields/slug'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

export const ArticleCategories: CollectionConfig = {
  slug: 'article-categories',
  labels: { singular: '文章分类', plural: '文章分类' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order', 'updatedAt'],
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromConsultant,
  },
  defaultSort: 'order',
  access: {
    read: anyone,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: revalidateCollection('article-categories'),
  fields: [
    { name: 'name', type: 'text', label: '名称', required: true },
    { name: 'description', type: 'textarea', label: '描述' },
    slug('name'),
    orderField,
  ],
}
