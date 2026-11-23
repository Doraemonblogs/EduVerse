/**
 * 课程模块的站内路径（不含 basePath；交给 next/link 会自动补上）。
 * 与富文本站内链接的前缀一致（src/components/common/rich-text.tsx：courses → /courses，disciplines → /majors）。
 */

/** 课程列表页；也是带筛选参数时的规范地址（canonical） */
export const COURSES_PATH = '/courses'

/** 课程详情页 */
export function coursePath(slug: string): string {
  return `${COURSES_PATH}/${slug}`
}

/** 专业方向落地页 */
export function majorPath(slug: string): string {
  return `/majors/${slug}`
}
