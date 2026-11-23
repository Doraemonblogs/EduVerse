import type { HomeArticle, HomeArticleCategory } from '@/lib/home/types'

/**
 * 首页“最新资讯”分类 Tab 的规则（纯函数，客户端组件 ArticleTabs 使用，单元测试覆盖）。
 */

/** “全部”Tab 的 key（分类 Tab 的 key 见 articleTabKey，两者不会冲突） */
export const ALL_ARTICLES_TAB = 'all'

export type ArticleTab = {
  /** Tab 的稳定标识（DOM id 片段）：“全部”为 ALL_ARTICLES_TAB，分类为 `category-{分类 id}` */
  key: string
  label: string
  /** null = 全部 */
  categoryId: number | null
}

/** 分类 Tab 的 key：用分类 id（数字）而不是 slug，保证可作为 DOM id 片段且不与“全部”冲突 */
export function articleTabKey(categoryId: number): string {
  return `category-${categoryId}`
}

/**
 * Tab 列表：第一项“全部”，其后是按 categories 顺序、在 articles 中确实出现过的分类（同一分类只出现一次）。
 * 出现的分类不足 2 个时 Tab 没有意义（“全部”与唯一分类内容相同），返回空数组，组件只显示列表。
 */
export function buildArticleTabs(
  categories: readonly HomeArticleCategory[],
  articles: readonly Pick<HomeArticle, 'category'>[],
  allLabel: string,
): ArticleTab[] {
  const used = new Set(
    articles.flatMap((article) => (article.category ? [article.category.id] : [])),
  )
  const seen = new Set<number>()
  const categoryTabs: ArticleTab[] = []
  for (const category of categories) {
    if (!used.has(category.id) || seen.has(category.id)) continue
    seen.add(category.id)
    categoryTabs.push({
      key: articleTabKey(category.id),
      label: category.name,
      categoryId: category.id,
    })
  }
  if (categoryTabs.length < 2) return []
  return [{ key: ALL_ARTICLES_TAB, label: allLabel, categoryId: null }, ...categoryTabs]
}

/** 某个 Tab 下的文章（保持原有顺序，即按发布时间倒序）；“全部”返回全部文章 */
export function articlesForTab<T extends Pick<HomeArticle, 'category'>>(
  articles: readonly T[],
  tab: Pick<ArticleTab, 'categoryId'>,
): T[] {
  if (tab.categoryId === null) return [...articles]
  return articles.filter((article) => article.category?.id === tab.categoryId)
}

/**
 * 键盘切换 Tab（WAI-ARIA Tabs，水平方向、自动激活）：左 / 右方向键循环切换，Home / End 到首尾。
 * 返回目标 Tab 的下标；其它按键返回 null（不处理，交给浏览器）。
 */
export function nextTabIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count
    case 'ArrowLeft':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}
