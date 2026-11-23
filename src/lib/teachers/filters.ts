import { z } from 'zod'

import type { FilterBarRow } from '@/components/common/filter-bar'
import { zh } from '@/i18n/zh'
import type { DisciplineRef } from '@/lib/course/types'
import { readSearchParam, slugParam, type SearchParamsInput } from '@/lib/search-params'

import { TEACHERS_PATH } from './paths'
import type { TeacherFilters, TeacherListItem } from './types'

/**
 * 讲师列表 /teachers 的筛选（纯函数）：只有“专业方向”一个维度（单选，?discipline=slug）。
 */

const filtersSchema = z.object({ discipline: slugParam.optional().catch(undefined) })

/**
 * 解析并校验筛选参数（zod）：非法取值忽略，按“全部”处理。
 * `hasFilterParams`：URL 中出现了 discipline 参数（不论取值是否合法）——页面输出 `noindex, follow`，
 * canonical 始终是 /teachers。合法但不存在的取值保留在 filters 里，结果为空，页面显示空状态。
 */
export function parseTeacherFilters(searchParams: SearchParamsInput): {
  filters: TeacherFilters
  hasFilterParams: boolean
} {
  const raw = readSearchParam(searchParams, 'discipline')
  const parsed = filtersSchema.parse({ discipline: raw?.trim() })
  const filters: TeacherFilters = {}
  if (parsed.discipline) filters.discipline = parsed.discipline
  return { filters, hasFilterParams: raw !== undefined }
}

/** 按专业方向过滤讲师（讲师可属于多个方向，任一匹配即可），保持原有顺序 */
export function filterTeachers(
  teachers: readonly TeacherListItem[],
  filters: TeacherFilters,
): TeacherListItem[] {
  const { discipline } = filters
  if (discipline === undefined) return [...teachers]
  return teachers.filter((teacher) => teacher.disciplines.some((d) => d.slug === discipline))
}

/** /teachers 或 /teachers?discipline=…；value 与当前选择相同时取消（再点一次即取消） */
export function teacherFilterHref(filters: TeacherFilters, value: string | undefined): string {
  const next = value !== undefined && filters.discipline === value ? undefined : value
  return next ? `${TEACHERS_PATH}?${new URLSearchParams({ discipline: next })}` : TEACHERS_PATH
}

/**
 * 通用筛选栏（<FilterBar rows>）的一行：专业方向。
 * 选项按 disciplines（后台排序）列出至少有一位讲师的方向，标签为简称；
 * 当前选中的方向即使没有讲师也保留（便于取消），不在 disciplines 里的取值不显示。
 */
export function buildTeacherFilterRows(
  teachers: readonly TeacherListItem[],
  filters: TeacherFilters,
  disciplines: readonly DisciplineRef[],
): FilterBarRow[] {
  const options = disciplines
    .map((discipline) => ({
      label: discipline.shortName,
      count: filterTeachers(teachers, { discipline: discipline.slug }).length,
      href: teacherFilterHref(filters, discipline.slug),
      selected: filters.discipline === discipline.slug,
    }))
    .filter((option) => option.count > 0 || option.selected)
  return [
    {
      key: 'discipline',
      label: zh.teachers.filters.discipline,
      options,
      allHref: TEACHERS_PATH,
      allCount: teachers.length,
      allSelected: filters.discipline === undefined,
    },
  ]
}
