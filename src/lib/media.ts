import type { Media } from '@/payload-types'

import { withBasePath } from './base-path'

export type MediaSize = 'thumbnail' | 'card' | 'hero' | 'og'

export type ImageSource = {
  src: string
  alt: string
  width: number
  height: number
}

/** 关联字段可能只是 ID（未填充），这里只处理已填充的媒体文档 */
export function isMedia(value: unknown): value is Media {
  return Boolean(value && typeof value === 'object' && 'url' in value)
}

/**
 * 把媒体文档转为 next/image 可用的图片源（自动补 basePath）。
 * 指定尺寸不存在时回退到原图；没有可用地址时返回 null。
 */
export function imageSource(media: unknown, size?: MediaSize): ImageSource | null {
  if (!isMedia(media)) return null
  const variant = size ? media.sizes?.[size] : undefined
  const url = variant?.url || media.url
  if (!url) return null
  return {
    src: withBasePath(url),
    alt: media.alt ?? '',
    width: (variant?.url ? variant.width : media.width) ?? 1200,
    height: (variant?.url ? variant.height : media.height) ?? 800,
  }
}
