import {
  populated,
  publishedDoc,
  toDisciplineRef,
  type DisciplineSource,
} from '@/lib/course/mappers'
import { withBasePath } from '@/lib/base-path'
import { imageSource, isMedia } from '@/lib/media'
import type { Discipline, Software, Work } from '@/payload-types'

import type { SoftwareTag, WorkCardData, WorkGalleryItem, WorkVideo } from './types'
import { isAllowedVideoEmbedUrl } from './video'

/**
 * Payload 文档 → 作品视图模型（纯函数，供 src/lib/data/works.ts 使用，可单测）。
 *
 * 草稿处理：按 depth 填充进来的专业方向即使是从未发布过的草稿也会被填充出来（Local API 默认
 * overrideAccess=true），这里再按 `_status === 'published'` 过滤。作品自身的发布状态与授权
 * 由查询条件保证（_status = published 且 consentConfirmed = true）。软件没有草稿。
 */

type Relation<T> = number | T | null | undefined

const textOrNull = (value: string | null | undefined) => value?.trim() || null

export type WorkCardSource = Pick<
  Work,
  'id' | 'title' | 'author' | 'cover' | 'featured' | 'publishedAt'
> & {
  discipline: Relation<DisciplineSource & Pick<Discipline, '_status'>>
  software?: readonly Relation<Pick<Software, 'id' | 'name' | 'slug'>>[] | null
}

/** 作品使用的软件（已填充的文档），保持后台关联顺序，按 slug 去重 */
export function toSoftwareTags(values: WorkCardSource['software']): SoftwareTag[] {
  const seen = new Set<string>()
  const tags: SoftwareTag[] = []
  for (const value of values ?? []) {
    const doc = populated(value)
    if (!doc || !doc.slug || seen.has(doc.slug)) continue
    seen.add(doc.slug)
    tags.push({ slug: doc.slug, name: doc.name })
  }
  return tags
}

/** 作品 → 作品卡片（专业方向未发布时 discipline 为 null） */
export function toWorkCard(work: WorkCardSource): WorkCardData {
  const discipline = publishedDoc(work.discipline)
  return {
    id: work.id,
    title: work.title,
    cover: imageSource(work.cover, 'card'),
    authorName: textOrNull(work.author?.displayName),
    cohortLabel: textOrNull(work.author?.cohortLabel),
    discipline: discipline ? toDisciplineRef(discipline) : null,
    software: toSoftwareTags(work.software).map((tag) => tag.slug),
    featured: Boolean(work.featured),
    publishedAt: work.publishedAt ?? null,
  }
}

const timeOf = (value: string | null) => {
  const time = value ? Date.parse(value) : Number.NaN
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

/**
 * 作品列表的排序：发布时间降序，相同（或都没有发布时间）再按 ID 降序；没有发布时间的排在最后。
 * 用作 Array.prototype.sort 的比较函数。
 */
export function compareWorks(
  a: Pick<WorkCardData, 'id' | 'publishedAt'>,
  b: Pick<WorkCardData, 'id' | 'publishedAt'>,
): number {
  const diff = timeOf(b.publishedAt) - timeOf(a.publishedAt)
  if (diff !== 0 && !Number.isNaN(diff)) return diff > 0 ? 1 : -1
  return b.id - a.id
}

/** 按 compareWorks 排序（返回新数组，不修改传入的数组） */
export function sortWorks<T extends Pick<WorkCardData, 'id' | 'publishedAt'>>(
  works: readonly T[],
): T[] {
  return [...works].sort(compareWorks)
}

/** 作品图集：只保留图片已填充的项；大图 hero 尺寸，缩略图 thumbnail（没有时退回 card / 原图） */
export function toWorkGallery(gallery: Work['gallery']): WorkGalleryItem[] {
  const items: WorkGalleryItem[] = []
  for (const entry of gallery ?? []) {
    const image = imageSource(entry.image, 'hero')
    const thumb = imageSource(entry.image, 'thumbnail') ?? imageSource(entry.image, 'card')
    if (!image || !thumb) continue
    items.push({ image, thumb, caption: textOrNull(entry.caption) })
  }
  return items
}

/**
 * 作品视频：
 * - embed：地址不在白名单（isAllowedVideoEmbedUrl）时当作无视频；
 * - file：视频文件需已填充、有地址且是 video/* 类型，地址补 basePath，封面作为 poster；
 * - none / 其它：null。
 */
export function toWorkVideo(
  video: Work['video'] | null | undefined,
  poster: WorkGalleryItem['image'] | null,
): WorkVideo | null {
  if (!video) return null
  if (video.kind === 'embed') {
    const embedUrl = video.embedUrl?.trim()
    return isAllowedVideoEmbedUrl(embedUrl) ? { kind: 'embed', embedUrl } : null
  }
  if (video.kind === 'file') {
    const file = video.file
    if (!isMedia(file) || !file.url || !file.mimeType?.startsWith('video/')) return null
    return { kind: 'file', src: withBasePath(file.url), mimeType: file.mimeType, poster }
  }
  return null
}

/**
 * 相关作品：同课程的在前，再补同专业方向的；排除本作品与重复项，最多 limit 件。
 * 两组各自保持传入的顺序（数据层已按发布时间降序）。
 */
export function mergeRelatedWorks(
  sameCourse: readonly WorkCardData[],
  sameDiscipline: readonly WorkCardData[],
  selfId: number,
  limit: number,
): WorkCardData[] {
  const seen = new Set<number>([selfId])
  const result: WorkCardData[] = []
  for (const work of [...sameCourse, ...sameDiscipline]) {
    if (result.length >= limit) break
    if (seen.has(work.id)) continue
    seen.add(work.id)
    result.push(work)
  }
  return result
}
