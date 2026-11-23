import { zh } from '@/i18n/zh'
import { ARTICLES_PATH, articleCategoryPath } from '@/lib/articles/paths'
import type { ArticleCategoryItem } from '@/lib/articles/types'
import { formatMessage } from '@/lib/course/format'

/**
 * 资讯列表 /articles 与分类页 /articles/category/[slug] 的纯函数：分页标题、头条版式、分类导航。
 * 收录规则（规格 §1）：分页可收录，canonical 为 articlesPageHref(page, slug)（第 1 页不带 ?page=），
 * 第 2 页起标题加“（第 N 页）”；页码超出总页数由页面直接 notFound()。
 */

/** 第 2 页起在标题后加“（第 N 页）”；第 1 页（或非法页码）原样返回 */
export function articlesPagedTitle(title: string, page: number): string {
  return Number.isInteger(page) && page > 1
    ? formatMessage(zh.articles.list.pagedTitle, { title, page })
    : title
}

/** 头条版式至少需要的文章数：头条占 2 × 2 格，右侧再排两篇，凑满前两行 */
export const HEADLINE_MIN_ITEMS = 3

/**
 * 是否用头条版式：只在第 1 页，且当前页至少有 HEADLINE_MIN_ITEMS 篇。
 * 第 1 页 12 篇时：头条（2 × 2）+ 右侧 2 篇 + 3 × 3 网格，三列网格正好排满五行。
 */
export function hasArticleHeadline(page: number, count: number): boolean {
  return page === 1 && count >= HEADLINE_MIN_ITEMS
}

/** 分类导航中的一项（链接到资讯列表或分类页的第 1 页） */
export type ArticleCategoryNavItem = {
  /** React key：“全部”为 all，其余为分类 slug */
  key: string
  label: string
  href: string
  /** 文章数（可见文字只显示数字，读屏补充“（N 篇）”） */
  count: number
  /** 是否为当前页面所在的分类（aria-current="page"） */
  current: boolean
}

/**
 * 分类导航：“全部”（/articles，文章总数）+ 有已发布文章的分类（后台排序）。
 * currentSlug 为当前分类页的 slug；资讯列表页传 null（“全部”为当前项）。
 */
export function buildArticleCategoryNav(
  categories: readonly Pick<ArticleCategoryItem, 'name' | 'slug' | 'count'>[],
  total: number,
  currentSlug: string | null,
): ArticleCategoryNavItem[] {
  return [
    {
      key: 'all',
      label: zh.articles.list.all,
      href: ARTICLES_PATH,
      count: total,
      current: currentSlug === null,
    },
    ...categories.map((category) => ({
      key: category.slug,
      label: category.name,
      href: articleCategoryPath(category.slug),
      count: category.count,
      current: category.slug === currentSlug,
    })),
  ]
}
