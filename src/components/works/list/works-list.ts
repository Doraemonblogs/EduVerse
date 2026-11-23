import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { workListHref } from '@/lib/works/filters'
import { WORKS_PATH } from '@/lib/works/paths'

/**
 * 作品列表页 /works 的纯函数：收录规则、分页标题、结果数文案。
 */

export type WorksListIndexing = {
  /** canonical 与 og:url 的站内路径（不含 basePath） */
  path: string
  /** 是否输出 `noindex, follow` */
  noindex: boolean
  /** 标题里显示的页码；第 1 页为 null（标题不加页码） */
  titlePage: number | null
}

/**
 * 收录规则（PRD §7 / M4 规格 §1）：
 * - URL 带任一筛选参数（discipline / software / featured，取值合法与否都算）→ `noindex, follow`，canonical 为 /works；
 * - 不带筛选参数的第 N 页（N > 1）→ 可以收录，canonical 为 /works?page=N，标题加“（第 N 页）”避免各页重复；
 * - 第 1 页（含非法 page 参数，按第 1 页处理）→ canonical /works。
 * 页码超出总页数由页面直接 notFound()，不经过这里。
 */
export function worksListIndexing({
  hasFilterParams,
  page,
}: {
  hasFilterParams: boolean
  page: number
}): WorksListIndexing {
  const titlePage = Number.isInteger(page) && page > 1 ? page : null
  if (hasFilterParams) return { path: WORKS_PATH, noindex: true, titlePage }
  return { path: titlePage ? workListHref({}, titlePage) : WORKS_PATH, noindex: false, titlePage }
}

/** 第 2 页起在标题后加“（第 N 页）”；titlePage 为 null 时原样返回 */
export function pagedTitle(title: string, titlePage: number | null): string {
  return titlePage ? formatMessage(zh.works.list.pagedTitle, { title, page: titlePage }) : title
}

/**
 * 筛选栏底部结果数的文案模板（保留 {count} 交给 FilterBar 加粗显示）：
 * 只有 1 页时“共 {count} 件作品”；多于 1 页时加上“第 2 / 3 页”，翻页后在页面上方也能看到当前页。
 */
export function worksResultTemplate(page: number, totalPages: number): string {
  if (totalPages <= 1) return zh.works.filters.resultCount
  return formatMessage(zh.works.list.resultCountPaged, { page, total: totalPages })
}
