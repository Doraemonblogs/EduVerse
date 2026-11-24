import { publishedDoc, toDisciplineRef } from '@/lib/course/mappers'
import { imageSource } from '@/lib/media'
import type { Tutorial } from '@/payload-types'

import { isTutorialLevel } from './format'
import type { TutorialCardData } from './types'
import { tutorialEmbedUrl } from './video'

/**
 * Payload 文档 → 免费教程视图模型（纯函数，供 src/lib/data/tutorials.ts 使用，可单测）。
 * 填充进来的专业方向按 `_status === 'published'` 再过滤（Local API 会把草稿也填充出来）。
 */

export type TutorialSource = Pick<
  Tutorial,
  | 'id'
  | 'title'
  | 'slug'
  | 'description'
  | 'cover'
  | 'discipline'
  | 'level'
  | 'provider'
  | 'videoId'
  | 'duration'
  | 'gated'
  | 'createdAt'
>

/** 教程卡片；难度缺失时按“入门”，播放器地址不合法时 embedUrl 为 null */
export function toTutorialCard(doc: TutorialSource): TutorialCardData {
  const discipline = publishedDoc(doc.discipline)
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    description: doc.description?.trim() || null,
    cover: imageSource(doc.cover, 'card'),
    shareImage: imageSource(doc.cover, 'og'),
    discipline: discipline ? toDisciplineRef(discipline) : null,
    level: isTutorialLevel(doc.level) ? doc.level : 'beginner',
    provider: doc.provider,
    videoId: doc.videoId,
    embedUrl: tutorialEmbedUrl(doc.provider, doc.videoId),
    duration: doc.duration?.trim() || null,
    gated: doc.gated === true,
    addedAt: doc.createdAt,
  }
}
