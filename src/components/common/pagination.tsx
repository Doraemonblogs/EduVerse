import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'

import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { paginationItems } from '@/lib/pagination'
import { cn } from '@/lib/utils'

const t = zh.pagination

export type PaginationProps = {
  /** 当前页（从 1 开始） */
  page: number
  totalPages: number
  /**
   * 第 n 页的地址（不含 basePath，交给 next/link）。第 1 页应返回不带 page 参数的地址，
   * 筛选条件保持不变，如作品列表的 `(n) => workListHref(filters, n)`。
   */
  href: (page: number) => string
  /** <nav> 的无障碍名称，默认“分页”；同一页面有多个分页导航时传入以区分 */
  label?: string
  className?: string
}

const itemClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-3 text-sm transition-colors duration-150 ease-standard'

/**
 * 分页导航（服务端组件，不需要 JS）：上一页 / 页码（首页、末页、当前页前后各 1 页，其余省略号）/ 下一页。
 * - 全部是可抓取的普通链接（next/link，不加 nofollow），当前页 aria-current="page"，以实心底色 + 加粗区分；
 * - 第一页不显示“上一页”，最后一页不显示“下一页”；只有 1 页时不渲染；
 * - 移动端紧凑：页码列表换成“2 / 5”（读屏“第 2 页，共 5 页”），上一页 / 下一页只显示箭头（有无障碍名称）；
 * - 触控目标不小于 44px。
 */
export function Pagination({
  page,
  totalPages,
  href,
  label = t.label,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null
  const current = Math.min(Math.max(1, page), totalPages)
  const items = paginationItems(current, totalPages)

  return (
    <nav aria-label={label} className={cn('flex justify-center', className)}>
      <ul role="list" className="flex items-center gap-1">
        {current > 1 ? (
          <li>
            <Link
              href={href(current - 1)}
              prefetch={false}
              rel="prev"
              aria-label={t.previous}
              className={cn(
                itemClass,
                'gap-1 border border-border text-foreground hover:bg-accent sm:pl-2',
              )}
            >
              <ChevronLeftIcon aria-hidden className="size-4" />
              <span aria-hidden className="hidden sm:inline">
                {t.previous}
              </span>
            </Link>
          </li>
        ) : null}

        {items.map((item) =>
          typeof item === 'number' ? (
            <li key={item} className="hidden sm:block">
              <Link
                href={href(item)}
                prefetch={false}
                aria-current={item === current ? 'page' : undefined}
                aria-label={formatMessage(t.page, { page: item })}
                className={cn(
                  itemClass,
                  'numeric',
                  item === current
                    ? 'bg-secondary font-semibold text-secondary-foreground'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {item}
              </Link>
            </li>
          ) : (
            <li
              key={item}
              aria-hidden
              className="hidden min-h-11 min-w-6 items-center justify-center text-sm text-muted-foreground sm:flex"
            >
              …
            </li>
          ),
        )}

        {/* 移动端：只显示“当前页 / 总页数” */}
        <li className="sm:hidden">
          <p className="numeric flex min-h-11 items-center px-3 text-sm text-foreground">
            <span aria-hidden>
              {current} / {totalPages}
            </span>
            <span className="sr-only">
              {formatMessage(t.status, { page: current, total: totalPages })}
            </span>
          </p>
        </li>

        {current < totalPages ? (
          <li>
            <Link
              href={href(current + 1)}
              prefetch={false}
              rel="next"
              aria-label={t.next}
              className={cn(
                itemClass,
                'gap-1 border border-border text-foreground hover:bg-accent sm:pr-2',
              )}
            >
              <span aria-hidden className="hidden sm:inline">
                {t.next}
              </span>
              <ChevronRightIcon aria-hidden className="size-4" />
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}
