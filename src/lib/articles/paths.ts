import { withBasePath } from '@/lib/base-path'

/**
 * 资讯的站内路径（不含 basePath；交给 next/link 会自动补上）。
 * 与富文本站内链接的前缀一致（src/components/common/rich-text.tsx：articles → /articles，
 * article-categories → /articles/category）。
 */

/** 资讯列表页；也是第 1 页的规范地址（canonical） */
export const ARTICLES_PATH = '/articles'

/** 分类页的路径前缀 */
export const ARTICLE_CATEGORY_PATH = `${ARTICLES_PATH}/category`

/** 资讯列表与分类页每页的文章数 */
export const ARTICLES_PAGE_SIZE = 12

/** 资讯详情页 */
export function articlePath(slug: string): string {
  return `${ARTICLES_PATH}/${slug}`
}

/** 资讯分类页 */
export function articleCategoryPath(slug: string): string {
  return `${ARTICLE_CATEGORY_PATH}/${slug}`
}

/**
 * 列表 / 分类页第 page 页的地址（分页链接与 canonical 共用）：第 1 页不带 ?page=，
 * 其余为 `?page=N`。categorySlug 为空时是全部资讯 /articles。
 */
export function articlesPageHref(page: number, categorySlug?: string | null): string {
  const base = categorySlug ? articleCategoryPath(categorySlug) : ARTICLES_PATH
  return page > 1 ? `${base}?page=${page}` : base
}

/**
 * 阅读量上报接口 POST /api/articles/:id/view 的地址（已补 basePath，客户端 sendBeacon / fetch 直接用）。
 * 静态预览站没有服务端，页面不应上报（见 src/endpoints/article-view.ts）。
 */
export function articleViewUrl(id: number, basePath?: string): string {
  return withBasePath(`/api/articles/${id}/view`, basePath)
}

/** 同一会话同一文章只上报一次：sessionStorage 里的标记键 */
export function articleViewSessionKey(id: number): string {
  return `eduverse:article-viewed:${id}`
}
