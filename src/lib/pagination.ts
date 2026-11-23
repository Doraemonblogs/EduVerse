/**
 * 列表分页（纯函数）：解析页码参数、切出当前页、生成分页导航的页码序列。
 * 作品列表 /works 使用（每页 24 件）；以后的文章列表等同样适用。
 */

/** 页码参数的上限位数：超出的按“非法”处理（回到第 1 页），避免超大数字 */
const PAGE_PATTERN = /^[1-9]\d{0,5}$/

/**
 * 解析 ?page= 参数：只接受不带前导 0 的正整数（"2"），
 * 缺失、空字符串、0、负数、小数、"02"、非数字、超过 6 位等一律按第 1 页处理。
 * 超出总页数不在这里判断：交给 paginate() 的 outOfRange（页面 notFound()）。
 */
export function parsePageParam(value: string | undefined): number {
  if (value === undefined) return 1
  const trimmed = value.trim()
  return PAGE_PATTERN.test(trimmed) ? Number(trimmed) : 1
}

export type PageSlice<T> = {
  /** 当前页的条目 */
  items: T[]
  /** 当前页码（从 1 开始，原样返回传入的页码） */
  page: number
  perPage: number
  /** 条目总数 */
  total: number
  /** 总页数；没有条目时为 1（空状态仍是“第 1 页”） */
  totalPages: number
  /** 页码超出总页数（且总数 > 0）：页面应返回 404（notFound()） */
  outOfRange: boolean
}

/**
 * 切出第 page 页（page 从 1 开始，perPage ≥ 1）。保持原有顺序，不修改传入的数组。
 * 总数为 0 时第 1 页是空列表（outOfRange = false，页面显示空状态）。
 */
export function paginate<T>(items: readonly T[], page: number, perPage: number): PageSlice<T> {
  const size = Math.max(1, Math.floor(perPage))
  const current = Number.isInteger(page) && page >= 1 ? page : 1
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / size))
  const start = (current - 1) * size
  return {
    items: items.slice(start, start + size),
    page: current,
    perPage: size,
    total,
    totalPages,
    outOfRange: total > 0 && current > totalPages,
  }
}

/** 分页导航中的一项：页码，或省略号（start / end 区分两侧，用作 React key） */
export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end'

/**
 * 分页导航的页码序列：首页、末页、当前页及其前后各 siblings 页，其余用省略号。
 * 省略号只代替至少 2 个页码（只差 1 页时直接显示该页码，省略号不比页码省地方）。
 *
 *   paginationItems(1, 3)   → [1, 2, 3]
 *   paginationItems(5, 10)  → [1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10]
 *   paginationItems(3, 10)  → [1, 2, 3, 4, 'ellipsis-end', 10]
 *
 * totalPages ≤ 1 时返回 [1]；page 超出范围时按最近的有效页计算。
 */
export function paginationItems(page: number, totalPages: number, siblings = 1): PaginationItem[] {
  const last = Math.max(1, Math.floor(totalPages))
  const current = Math.min(Math.max(1, Math.floor(page)), last)
  const from = Math.max(2, current - siblings)
  const to = Math.min(last - 1, current + siblings)

  const items: PaginationItem[] = [1]
  if (from > 3) items.push('ellipsis-start')
  else for (let p = 2; p < from; p += 1) items.push(p)
  for (let p = from; p <= to; p += 1) items.push(p)
  if (to < last - 2) items.push('ellipsis-end')
  else for (let p = Math.max(to + 1, 2); p < last; p += 1) items.push(p)
  if (last > 1) items.push(last)
  return items
}
