/**
 * 校区的站内路径（不含 basePath；交给 next/link 会自动补上）。
 * 与富文本站内链接的前缀一致（src/components/common/rich-text.tsx：campuses → /campuses）。
 * 校区列表与详情页在 M6 实现（导出脚本的 PLANNED_ROUTES 已登记 /campuses）。
 */

/** 校区列表页 */
export const CAMPUSES_PATH = '/campuses'

/** 校区详情页 */
export function campusPath(slug: string): string {
  return `${CAMPUSES_PATH}/${slug}`
}
