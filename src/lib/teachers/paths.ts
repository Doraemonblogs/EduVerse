/**
 * 讲师的站内路径（不含 basePath；交给 next/link 会自动补上）。
 * 与富文本站内链接的前缀一致（src/components/common/rich-text.tsx：teachers → /teachers）。
 */

/** 讲师列表页；也是带筛选参数时的规范地址（canonical） */
export const TEACHERS_PATH = '/teachers'

/** 讲师详情页 */
export function teacherPath(slug: string): string {
  return `${TEACHERS_PATH}/${slug}`
}
