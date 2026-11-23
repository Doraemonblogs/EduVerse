import { toBeijingIsoDate } from '@/lib/course/format'
import { absoluteUrl, type JsonLdData } from '@/lib/seo/json-ld'
import { workPath } from '@/lib/works/paths'
import type { WorkDetail } from '@/lib/works/types'

/**
 * 作品详情的 CreativeWork 结构化数据（schema.org），配合 <JsonLd data={...} /> 输出。
 * 纯函数：站点地址由调用方传入（getSiteUrl()，无末尾斜杠，子路径部署时含子路径），便于测试。
 *
 * - creator：Person，名称为作者署名（学员化名，不是真实姓名）；没有署名时不输出；
 * - genre / about：所属专业方向（已发布时才有）；
 * - image：大图（没有时用卡片封面）的绝对地址；
 * - dateCreated：发布时间的北京日期（YYYY-MM-DD）。
 * BreadcrumbList 由面包屑组件输出。
 */
export function workJsonLd(
  work: Pick<
    WorkDetail,
    | 'id'
    | 'title'
    | 'description'
    | 'heroImage'
    | 'cover'
    | 'authorName'
    | 'discipline'
    | 'publishedAt'
  >,
  siteUrl: string,
): JsonLdData {
  const image = work.heroImage ?? work.cover
  return compact({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: work.title,
    description: work.description ?? undefined,
    url: absoluteUrl(workPath(work.id), siteUrl),
    // 媒体地址已带 basePath（如 /EduVerse/api/media/…）：用 URL 解析替换站点地址的路径部分，不会重复子路径
    image: image ? new URL(image.src, `${siteUrl}/`).href : undefined,
    creator: work.authorName ? { '@type': 'Person', name: work.authorName } : undefined,
    genre: work.discipline?.name,
    about: work.discipline?.name,
    dateCreated: toBeijingIsoDate(work.publishedAt) || undefined,
    inLanguage: 'zh-CN',
  })
}

/** 去掉值为 undefined 的键，输出更干净的 JSON */
function compact(data: Record<string, unknown>): JsonLdData {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}
