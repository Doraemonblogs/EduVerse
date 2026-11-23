import { zh } from '@/i18n/zh'

import type { WorkCardData, WorkDetail, WorkGalleryItem } from './types'

/**
 * 作品的展示工具（纯函数，服务端与客户端组件都能用）。
 */

/** 署名行：“林同学 · 2026 届”；只有其一时只显示其一，都没有返回空字符串 */
export function workByline(work: Pick<WorkCardData, 'authorName' | 'cohortLabel'>): string {
  return [work.authorName, work.cohortLabel].filter(Boolean).join(zh.course.work.authorSeparator)
}

/** 作品图片的替代文字：媒体库填写的优先，未填写时用作品名 */
export function workImageAlt(image: { alt: string } | null | undefined, title: string): string {
  return image?.alt.trim() || title
}

/**
 * 灯箱的图片序列：封面（hero 大图 + card 缩略图）在前，其后是作品图集。
 * 序号“2 / 5”按这个序列计算；没有封面时只有图集。
 */
export function workLightboxItems(
  work: Pick<WorkDetail, 'heroImage' | 'cover' | 'gallery'>,
): WorkGalleryItem[] {
  const cover =
    work.heroImage && work.cover
      ? [{ image: work.heroImage, thumb: work.cover, caption: null }]
      : []
  return [...cover, ...work.gallery]
}
