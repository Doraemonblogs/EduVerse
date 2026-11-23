import { FilterBar, type FilterBarRow } from '@/components/common/filter-bar'
import { zh } from '@/i18n/zh'
import {
  buildFilterOptions,
  COURSE_FILTER_KEYS,
  courseFilterHref,
  filterCourses,
  hasActiveFilters,
} from '@/lib/course/filters'
import { COURSES_PATH } from '@/lib/course/paths'
import type { CourseCardData, CourseFilters } from '@/lib/course/types'

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

/** 课程筛选栏的四行：专业方向 / 班型 / 授课方式 / 城市（每行“全部”的数量按其它维度的当前选择计算） */
export function buildCourseFilterRows(
  cards: readonly CourseCardData[],
  filters: CourseFilters,
): FilterBarRow[] {
  const options = buildFilterOptions(cards, filters)
  return COURSE_FILTER_KEYS.map((key) => ({
    key,
    label: t.filters[key],
    options: options[key].map((option) => ({
      label: option.label,
      count: option.count,
      href: courseFilterHref(filters, key, option.value),
      selected: option.selected,
    })),
    allHref: courseFilterHref(filters, key, undefined),
    allCount: filterCourses(cards, { ...filters, [key]: undefined }).length,
    allSelected: filters[key] === undefined,
  }))
}

/**
 * 课程筛选栏（服务端组件，不需要 JS）：通用筛选栏 FilterBar 的四行单选
 * （专业方向 / 班型 / 授课方式 / 城市），每行“全部”+ 有课程的取值（显示数量），筛选条件写在 URL 里。
 * 行为与版式见 src/components/common/filter-bar.tsx；底部显示“共 N 门课程”与“清除筛选”（回到 /courses）。
 */
export function CourseFilterBar({
  cards,
  filters,
  resultCount,
  previewNotice = false,
  className,
}: CourseFilterBarProps) {
  return (
    <FilterBar
      label={t.filters.label}
      idPrefix="course-filter"
      rows={buildCourseFilterRows(cards, filters)}
      resultCount={resultCount}
      resultTemplate={t.filters.resultCount}
      optionCountTemplate={t.list.optionCount}
      clearHref={hasActiveFilters(filters) ? COURSES_PATH : null}
      notice={previewNotice ? t.filters.previewNotice : null}
      className={className}
    />
  )
}
