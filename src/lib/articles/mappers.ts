import { populated } from '@/lib/course/mappers'
import type { CourseCardData } from '@/lib/course/types'
import { pickCareerCourses } from '@/lib/home/rules'
import { imageSource } from '@/lib/media'
import type { Article, ArticleCategory } from '@/payload-types'

import { normalizeViews } from './format'
import type { ArticleCardData, ArticleCategoryItem, ArticleCategoryRef } from './types'

/**
 * Payload 文档 → 资讯视图模型，以及列表 / 详情的排序与挑选规则（纯函数，可单测）。
 * 文章的发布状态由查询条件保证；分类没有草稿。
 */

type Relation<T> = number | T | null | undefined

const textOrNull = (value: string | null | undefined) => value?.trim() || null

export type ArticleCategorySource = Pick<ArticleCategory, 'id' | 'name' | 'slug'> &
  Partial<Pick<ArticleCategory, 'description' | 'order'>>

/** 文章的分类（已填充时）；只有 ID 或已删除时为 null */
export function toArticleCategoryRef(
  category: Relation<ArticleCategorySource>,
): ArticleCategoryRef | null {
  const doc = populated(category)
  return doc ? { id: doc.id, name: doc.name.trim(), slug: doc.slug } : null
}

export type ArticleCardSource = Pick<
  Article,
  'id' | 'slug' | 'title' | 'excerpt' | 'cover' | 'publishedAt' | 'views' | 'authorName'
> & {
  category: Relation<ArticleCategorySource>
}

export function toArticleCard(article: ArticleCardSource): ArticleCardData {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title.trim(),
    excerpt: article.excerpt.trim(),
    cover: imageSource(article.cover, 'card'),
    headlineCover: imageSource(article.cover, 'hero'),
    category: toArticleCategoryRef(article.category),
    publishedAt: article.publishedAt,
    views: normalizeViews(article.views),
    authorName: textOrNull(article.authorName),
  }
}

const timeOf = (value: string | null | undefined): number | null => {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

/**
 * 文章排序：发布时间降序，相同时 ID 降序；没有（或无效的）发布时间排在最后。
 * PostgreSQL 降序时把 NULL 排在最前，所以查出后统一用它排序（发布时间是必填项，NULL 只可能来自历史数据）。
 */
export function compareArticles(
  a: Pick<ArticleCardData, 'id' | 'publishedAt'>,
  b: Pick<ArticleCardData, 'id' | 'publishedAt'>,
): number {
  const ta = timeOf(a.publishedAt)
  const tb = timeOf(b.publishedAt)
  if (ta !== tb) {
    if (ta === null) return 1
    if (tb === null) return -1
    return tb - ta
  }
  return b.id - a.id
}

/** 按 compareArticles 排序，返回新数组 */
export function sortArticles<T extends Pick<ArticleCardData, 'id' | 'publishedAt'>>(
  articles: readonly T[],
): T[] {
  return [...articles].sort(compareArticles)
}

/**
 * 分类导航：只保留在 articles 中出现过的分类（count ≥ 1），按后台排序（order → ID）。
 * categories 为全部分类文档（含描述与排序）。
 */
export function buildArticleCategories(
  categories: readonly ArticleCategorySource[],
  articles: readonly Pick<ArticleCardData, 'category'>[],
): ArticleCategoryItem[] {
  const counts = new Map<number, number>()
  for (const article of articles) {
    if (article.category)
      counts.set(article.category.id, (counts.get(article.category.id) ?? 0) + 1)
  }
  return [...categories]
    .filter((category) => (counts.get(category.id) ?? 0) > 0)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)
    .map((category) => ({
      id: category.id,
      name: category.name.trim(),
      slug: category.slug,
      description: textOrNull(category.description),
      count: counts.get(category.id) ?? 0,
    }))
}

/** 某个分类（按 slug）下的文章，保持原有顺序 */
export function articlesInCategory<T extends Pick<ArticleCardData, 'category'>>(
  articles: readonly T[],
  categorySlug: string,
): T[] {
  return articles.filter((article) => article.category?.slug === categorySlug)
}

/** 按 slug 找分类导航中的分类；没有已发布文章的分类找不到（分类页 404） */
export function findArticleCategory(
  categories: readonly ArticleCategoryItem[],
  slug: string,
): ArticleCategoryItem | null {
  return categories.find((category) => category.slug === slug) ?? null
}

/**
 * 同分类的相关文章：排除本文，按 compareArticles 排序后取前 limit 篇。
 * candidates 为同分类的已发布文章（可以包含本文）。
 */
export function pickRelatedArticles(
  candidates: readonly ArticleCardData[],
  currentId: number,
  limit: number,
): ArticleCardData[] {
  return sortArticles(candidates.filter((article) => article.id !== currentId)).slice(0, limit)
}

/** 资讯详情侧栏“热门课程”的数量 */
export const HOT_COURSES_LIMIT = 3

/**
 * 侧栏“热门课程”：后台标记为精选（featured）的课程，按课程列表顺序取前 limit 门；
 * 一门精选都没有时，取每个专业方向排序最靠前的长期就业班（与首页精选课程的自动规则一致）。
 * courses 为可公开访问的课程卡片（课程列表顺序）。
 */
export function pickHotCourses(
  courses: readonly CourseCardData[],
  limit: number = HOT_COURSES_LIMIT,
): CourseCardData[] {
  const featured = courses.filter((course) => course.featured).slice(0, limit)
  return featured.length > 0 ? featured : pickCareerCourses(courses, limit)
}
