import Link from 'next/link'

import { zh } from '@/i18n/zh'
import {
  buildFilterOptions,
  COURSE_FILTER_KEYS,
  courseFilterHref,
  filterCourses,
  hasActiveFilters,
} from '@/lib/course/filters'
import { formatMessage } from '@/lib/course/format'
import { COURSES_PATH } from '@/lib/course/paths'
import type {
  CourseCardData,
  CourseFilterKey,
  CourseFilters,
  FilterOption,
} from '@/lib/course/types'
import { cn } from '@/lib/utils'

import { RevealSelectedFilters } from './reveal-selected-filters'

const t = zh.course

export type CourseFilterBarProps = {
  /** 全部课程（未筛选），用于推导每一行的可选项与数量 */
  cards: readonly CourseCardData[]
  filters: CourseFilters
  /** 当前条件下的课程数（“共 N 门课程”） */
  resultCount: number
  /** 静态预览站：在筛选栏下提示不支持筛选 */
  previewNotice?: boolean
  className?: string
}

/** 筛选链接的公共属性：不传递权重（防爬虫陷阱）、不预取、切换时保持滚动位置 */
const linkProps = { rel: 'nofollow', prefetch: false, scroll: false } as const

/**
 * 课程筛选栏（服务端组件，不需要 JS）：四行单选（专业方向 / 班型 / 授课方式 / 城市），
 * 每行“全部”+ 有课程的取值（显示数量），全部是普通链接，筛选条件写在 URL 里。
 * 当前项 aria-current="true"，并以实心底色 + 加粗区分。
 * 移动端每行横向滚动（标签固定在左），选中项不在可见范围时自动滚到它（RevealSelectedFilters）；
 * 桌面端自动换行。底部显示结果数与“清除筛选”。
 */
export function CourseFilterBar({
  cards,
  filters,
  resultCount,
  previewNotice = false,
  className,
}: CourseFilterBarProps) {
  const options = buildFilterOptions(cards, filters)
  const [countBefore, countAfter = ''] = t.filters.resultCount.split('{count}')
  const selection = COURSE_FILTER_KEYS.map((key) => filters[key] ?? '').join('|')

  return (
    <nav aria-label={t.filters.label} className={cn('flex flex-col gap-3', className)}>
      <div className="overflow-hidden rounded-md border border-border bg-card text-card-foreground">
        <div className="divide-y divide-border">
          {COURSE_FILTER_KEYS.map((key) => (
            <FilterRow
              key={key}
              filterKey={key}
              filters={filters}
              options={options[key]}
              allCount={filterCourses(cards, { ...filters, [key]: undefined }).length}
            />
          ))}
        </div>
        <div className="flex min-h-14 items-center justify-between gap-4 border-t border-border bg-muted py-1 pr-2 pl-4 md:pr-4 md:pl-6">
          <p role="status" className="text-sm text-muted-foreground">
            {countBefore}
            <span className="numeric font-semibold text-foreground">{resultCount}</span>
            {countAfter}
          </p>
          {hasActiveFilters(filters) ? (
            <Link
              href={COURSES_PATH}
              {...linkProps}
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-emphasis underline-offset-4 hover:underline"
            >
              {t.filters.clear}
            </Link>
          ) : null}
        </div>
      </div>
      {previewNotice ? (
        <p role="note" className="text-sm text-muted-foreground">
          {t.filters.previewNotice}
        </p>
      ) : null}
      <RevealSelectedFilters selection={selection} />
    </nav>
  )
}

function FilterRow({
  filterKey,
  filters,
  options,
  allCount,
}: {
  filterKey: CourseFilterKey
  filters: CourseFilters
  options: FilterOption[]
  allCount: number
}) {
  const labelId = `course-filter-${filterKey}`

  return (
    <div className="flex items-start gap-2 py-2 pl-4 md:gap-4 md:px-6 md:py-3">
      <p
        id={labelId}
        className="flex h-11 w-16 shrink-0 items-center text-sm font-medium text-muted-foreground md:h-9 md:w-20"
      >
        {t.filters[filterKey]}
      </p>
      {/* 内边距给键盘焦点描边留出空间（横向滚动容器会裁切溢出部分） */}
      <ul
        role="list"
        aria-labelledby={labelId}
        className="-my-1 flex min-w-0 flex-1 gap-1 overflow-x-auto p-1 pe-4 md:flex-wrap md:overflow-visible md:pe-1"
      >
        <li className="shrink-0">
          <FilterLink
            href={courseFilterHref(filters, filterKey, undefined)}
            label={t.filters.all}
            count={allCount}
            selected={filters[filterKey] === undefined}
          />
        </li>
        {options.map((option) => (
          <li key={option.value} className="shrink-0">
            <FilterLink
              href={courseFilterHref(filters, filterKey, option.value)}
              label={option.label}
              count={option.count}
              selected={option.selected}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function FilterLink({
  href,
  label,
  count,
  selected,
}: {
  href: string
  label: string
  count: number
  selected: boolean
}) {
  return (
    <Link
      href={href}
      {...linkProps}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        // relative：读屏文字（sr-only，绝对定位）以链接为定位基准，留在横向滚动容器内，不撑宽页面
        'relative inline-flex h-11 items-center gap-1.5 rounded-sm px-3 text-sm whitespace-nowrap transition-colors duration-150 ease-standard md:h-9',
        selected
          ? 'bg-secondary font-semibold text-secondary-foreground'
          : 'text-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {label}
      <span aria-hidden className={cn('numeric text-xs', !selected && 'text-muted-foreground')}>
        {count}
      </span>
      <span className="sr-only">{formatMessage(t.list.optionCount, { count })}</span>
    </Link>
  )
}
