import Link from 'next/link'

import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { cn } from '@/lib/utils'

import { RevealSelectedFilters } from './reveal-selected-filters'

/** 筛选栏中的一个选项（链接） */
export type FilterBarOption = {
  /** 可见文字（如专业方向简称） */
  label: string
  /** 选中该项后的结果数（可见文字只显示数字，读屏补充 optionCountTemplate） */
  count: number
  /** 选中 / 取消该项的地址（同一项再点一次即取消，由调用方生成） */
  href: string
  /** 是否为当前选中项（aria-current="true" + 实心底色加粗） */
  selected: boolean
}

/** 筛选栏中的一行（单选） */
export type FilterBarRow = {
  /** 行标识：同一筛选栏内唯一，用于元素 id（`${idPrefix}-${key}`） */
  key: string
  /** 行标签，如“专业方向”；也是该行 <ul> 的无障碍名称 */
  label: string
  /** 除“全部”以外的选项 */
  options: FilterBarOption[]
  /** “全部”的地址（该维度不限） */
  allHref: string
  /** “全部”的结果数（其它维度保持当前选择） */
  allCount: number
  /**
   * “全部”是否为当前项：该维度没有选择时为 true。
   * 注意 URL 里有一个合法但不存在的取值时，“全部”与所有选项都不是当前项。
   */
  allSelected: boolean
}

export type FilterBarProps = {
  /** <nav> 的无障碍名称，如“课程筛选”“作品筛选” */
  label: string
  /** 元素 id 前缀（每行标签 id 为 `${idPrefix}-${row.key}`），同一页面内唯一 */
  idPrefix: string
  rows: FilterBarRow[]
  /** 当前条件下的结果数 */
  resultCount: number
  /** 结果数文案，{count} 处显示加粗数字，如“共 {count} 门课程” */
  resultTemplate: string
  /** 选项数量的读屏补充，{count} 为数量，如“（{count} 门课程）” */
  optionCountTemplate: string
  /** 有筛选条件时“清除筛选”的地址（如 /courses）；null 不显示（没有任何筛选条件） */
  clearHref: string | null
  /** 筛选栏下方的说明（静态预览站不支持筛选时传入）；不传不显示 */
  notice?: string | null
  className?: string
}

/** 筛选链接的公共属性：不传递权重（防爬虫陷阱）、不预取、切换时保持滚动位置 */
const linkProps = { rel: 'nofollow', prefetch: false, scroll: false } as const

/**
 * 通用筛选栏（服务端组件，不需要 JS；课程 / 作品 / 讲师列表共用）：
 * 每行“全部”+ 各选项（显示数量），全部是普通链接，筛选条件写在 URL 里。
 * 当前项 aria-current="true"，并以实心底色 + 加粗区分（不只靠颜色）。
 * 移动端每行横向滚动（标签固定在左），选中项不在可见范围时自动滚到它（RevealSelectedFilters）；
 * 桌面端自动换行。底部显示结果数（role="status"）与“清除筛选”。
 * 数据由调用方准备好（行、选项、链接、数量），组件只负责呈现。
 */
export function FilterBar({
  label,
  idPrefix,
  rows,
  resultCount,
  resultTemplate,
  optionCountTemplate,
  clearHref,
  notice,
  className,
}: FilterBarProps) {
  const [countBefore, countAfter = ''] = resultTemplate.split('{count}')
  // 选中状态变化时（客户端导航）重新把选中项滚进可见范围
  const selection = rows
    .map((row) => (row.allSelected ? '' : (row.options.find((o) => o.selected)?.href ?? '-')))
    .join('|')

  return (
    <nav aria-label={label} className={cn('flex flex-col gap-3', className)}>
      <div className="overflow-hidden rounded-md border border-border bg-card text-card-foreground">
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <FilterRow
              key={row.key}
              row={row}
              labelId={`${idPrefix}-${row.key}`}
              optionCountTemplate={optionCountTemplate}
            />
          ))}
        </div>
        <div className="flex min-h-14 items-center justify-between gap-4 border-t border-border bg-muted py-1 pr-2 pl-4 md:pr-4 md:pl-6">
          <p role="status" className="text-sm text-muted-foreground">
            {countBefore}
            <span className="numeric font-semibold text-foreground">{resultCount}</span>
            {countAfter}
          </p>
          {clearHref ? (
            <Link
              href={clearHref}
              {...linkProps}
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-emphasis underline-offset-4 hover:underline"
            >
              {zh.filterBar.clear}
            </Link>
          ) : null}
        </div>
      </div>
      {notice ? (
        <p role="note" className="text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}
      <RevealSelectedFilters selection={selection} />
    </nav>
  )
}

function FilterRow({
  row,
  labelId,
  optionCountTemplate,
}: {
  row: FilterBarRow
  labelId: string
  optionCountTemplate: string
}) {
  return (
    <div className="flex items-start gap-2 py-2 pl-4 md:gap-4 md:px-6 md:py-3">
      <p
        id={labelId}
        className="flex h-11 w-16 shrink-0 items-center text-sm font-medium text-muted-foreground md:h-9 md:w-20"
      >
        {row.label}
      </p>
      {/* 内边距给键盘焦点描边留出空间（横向滚动容器会裁切溢出部分） */}
      <ul
        role="list"
        aria-labelledby={labelId}
        data-filter-row=""
        className="-my-1 flex min-w-0 flex-1 gap-1 overflow-x-auto p-1 pe-4 md:flex-wrap md:overflow-visible md:pe-1"
      >
        <li className="shrink-0">
          <FilterLink
            href={row.allHref}
            label={zh.filterBar.all}
            count={row.allCount}
            selected={row.allSelected}
            optionCountTemplate={optionCountTemplate}
          />
        </li>
        {row.options.map((option) => (
          <li key={option.href} className="shrink-0">
            <FilterLink {...option} optionCountTemplate={optionCountTemplate} />
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
  optionCountTemplate,
}: FilterBarOption & { optionCountTemplate: string }) {
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
      <span className="sr-only">{formatMessage(optionCountTemplate, { count })}</span>
    </Link>
  )
}
