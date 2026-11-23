import { articlePath } from '@/lib/articles/paths'
import { populated, publishedDoc } from '@/lib/course/mappers'
import { coursePath, majorPath } from '@/lib/course/paths'
import { imageSource } from '@/lib/media'
import { teacherPath } from '@/lib/teachers/paths'
import { workPath } from '@/lib/works/paths'
import type { Article, Course, Discipline, Teacher, Work } from '@/payload-types'

import { buildExcerpt, firstMatchIndex } from './highlight'
import type { SearchHit } from './types'

/**
 * Payload 文档 → 搜索结果条目（纯函数，供 src/lib/data/search.ts 使用，可单测）。
 * 文档已在查询里按发布状态 / 授权过滤；填充进来的关联（专业方向）再按 `_status` 过滤。
 * 摘要都是纯文本（buildExcerpt），高亮在渲染时用 splitHighlight 拆片段。
 */

/** 每组最多显示的条数 */
export const SEARCH_GROUP_LIMIT = 10

const text = (value: string | null | undefined) => value?.trim() || null

export type CourseHitSource = Pick<
  Course,
  'id' | 'title' | 'slug' | 'summary' | 'cover' | 'discipline'
>

export function toCourseHit(doc: CourseHitSource, terms: readonly string[]): SearchHit {
  return {
    id: doc.id,
    title: doc.title,
    href: coursePath(doc.slug),
    excerpt: buildExcerpt(doc.summary, terms),
    meta: publishedDoc(doc.discipline)?.name ?? null,
    image: imageSource(doc.cover, 'thumbnail'),
  }
}

export type DisciplineHitSource = Pick<Discipline, 'id' | 'name' | 'slug' | 'tagline' | 'cover'>

export function toDisciplineHit(doc: DisciplineHitSource, terms: readonly string[]): SearchHit {
  return {
    id: doc.id,
    title: doc.name,
    href: majorPath(doc.slug),
    excerpt: buildExcerpt(doc.tagline, terms),
    meta: null,
    image: imageSource(doc.cover, 'thumbnail'),
  }
}

export type ArticleHitSource = Pick<
  Article,
  'id' | 'title' | 'slug' | 'excerpt' | 'searchText' | 'cover' | 'category'
>

/**
 * 文章摘要：文章摘要（excerpt）里有匹配时用它；否则在正文（searchText 去掉开头的标题与摘要）中
 * 截取第一个匹配附近的一段；都没有匹配（只有标题匹配）时用文章摘要。
 */
function articleExcerpt(doc: ArticleHitSource, terms: readonly string[]): string | null {
  const excerpt = text(doc.excerpt)
  if (excerpt && firstMatchIndex(excerpt, terms) >= 0) return buildExcerpt(excerpt, terms)
  let body = doc.searchText ?? ''
  for (const prefix of [doc.title, doc.excerpt]) {
    const head = body.trimStart()
    if (prefix && head.startsWith(prefix)) body = head.slice(prefix.length)
  }
  if (firstMatchIndex(body, terms) >= 0) return buildExcerpt(body, terms)
  return buildExcerpt(excerpt, terms)
}

export function toArticleHit(doc: ArticleHitSource, terms: readonly string[]): SearchHit {
  return {
    id: doc.id,
    title: doc.title,
    href: articlePath(doc.slug),
    excerpt: articleExcerpt(doc, terms),
    meta: text(populated(doc.category)?.name),
    image: imageSource(doc.cover, 'thumbnail'),
  }
}

export type TeacherHitSource = Pick<
  Teacher,
  'id' | 'name' | 'slug' | 'title' | 'avatar' | 'specialties'
>

export function toTeacherHit(doc: TeacherHitSource, terms: readonly string[]): SearchHit {
  const specialties = (doc.specialties ?? [])
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join('、')
  return {
    id: doc.id,
    title: doc.name,
    href: teacherPath(doc.slug),
    excerpt: buildExcerpt(specialties, terms),
    meta: text(doc.title),
    image: imageSource(doc.avatar, 'thumbnail'),
  }
}

export type WorkHitSource = Pick<Work, 'id' | 'title' | 'description' | 'cover' | 'author'>

export function toWorkHit(doc: WorkHitSource, terms: readonly string[]): SearchHit {
  return {
    id: doc.id,
    title: doc.title,
    href: workPath(doc.id),
    excerpt: buildExcerpt(doc.description, terms),
    // 作者署名一律是学员化名
    meta: text(doc.author?.displayName),
    image: imageSource(doc.cover, 'thumbnail'),
  }
}

/**
 * 组内排序：标题包含全部检索词的在前，其次标题包含部分检索词的，其余（只在正文 / 简介中匹配）在后；
 * 同一档内保持查询顺序（稳定排序）。取前 limit 条。
 */
export function rankHits(
  hits: readonly SearchHit[],
  terms: readonly string[],
  limit: number = SEARCH_GROUP_LIMIT,
): SearchHit[] {
  const tier = (hit: SearchHit) => {
    const matched = terms.filter((term) => firstMatchIndex(hit.title, [term]) >= 0).length
    if (terms.length > 0 && matched === terms.length) return 0
    return matched > 0 ? 1 : 2
  }
  return hits
    .map((hit, index) => ({ hit, index, tier: tier(hit) }))
    .sort((a, b) => a.tier - b.tier || a.index - b.index)
    .slice(0, limit)
    .map(({ hit }) => hit)
}
