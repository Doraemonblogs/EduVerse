/**
 * 资讯的站内路径（不含 basePath；交给 next/link 会自动补上）。
 * 与富文本站内链接的前缀一致（src/components/common/rich-text.tsx：articles → /articles）。
 * 资讯列表与详情页在 M6 实现（导出脚本的 PLANNED_ROUTES 已登记 /articles）。
 */

/** 资讯列表页 */
export const ARTICLES_PATH = '/articles'

/** 资讯详情页 */
export function articlePath(slug: string): string {
  return `${ARTICLES_PATH}/${slug}`
}
