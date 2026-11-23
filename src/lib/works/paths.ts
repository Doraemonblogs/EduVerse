/**
 * 学员作品的站内路径（不含 basePath；交给 next/link 会自动补上）。
 * 与富文本站内链接一致（src/components/common/rich-text.tsx 的 docHref：works → /works/{id}）。
 */

/** 作品列表页；也是带筛选参数时的规范地址（canonical） */
export const WORKS_PATH = '/works'

/** 作品详情页（按 ID，作品不设 slug） */
export function workPath(id: number): string {
  return `${WORKS_PATH}/${id}`
}

/** PostgreSQL integer 的上限：超出的 ID 不可能存在，也避免查询报错 */
const MAX_ID = 2_147_483_647

/**
 * 解析路由参数里的作品 ID：只接受不带前导 0 的正整数（如 "12"），
 * 其它（"0"、"012"、"1.5"、"abc"、超出整数范围）返回 null → 页面 notFound()，不查库。
 */
export function parseWorkId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null
  const id = Number(value)
  return id <= MAX_ID ? id : null
}
