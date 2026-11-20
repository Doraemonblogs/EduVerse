import path from 'path'
import type { CollectionConfig } from 'payload'

import { anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { revalidateCollection } from '@/hooks/revalidate'

import { ADMIN_GROUPS } from './groups'

const webp = { format: 'webp' as const, options: { quality: 80 } }

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: '媒体文件', plural: '媒体库' },
  admin: {
    group: ADMIN_GROUPS.system,
    hidden: hiddenFromConsultant,
    defaultColumns: ['filename', 'alt', 'mimeType', 'filesize', 'updatedAt'],
  },
  hooks: revalidateCollection('media'),
  access: {
    read: anyone,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  upload: {
    // 本地磁盘存储；部署时挂载卷。M8 起可通过环境变量切换到 S3 兼容对象存储
    staticDir: process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media'),
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/svg+xml',
      'video/mp4',
    ],
    focalPoint: true,
    adminThumbnail: 'thumbnail',
    imageSizes: [
      { name: 'thumbnail', width: 400, formatOptions: webp, withoutEnlargement: true },
      { name: 'card', width: 800, formatOptions: webp, withoutEnlargement: true },
      { name: 'hero', width: 1920, formatOptions: webp, withoutEnlargement: true },
      { name: 'og', width: 1200, height: 630, position: 'centre', formatOptions: webp },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: '替代文本（alt）',
      required: true,
      admin: {
        description: '描述图片内容，供读屏软件与搜索引擎使用，如“学员作品：雨夜街角场景渲染”',
      },
    },
    { name: 'caption', type: 'text', label: '图注' },
  ],
}
