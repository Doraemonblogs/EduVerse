import {
  publishedDoc,
  toDisciplineRef,
  toTeacherCard,
  type DisciplineSource,
  type TeacherSource,
} from '@/lib/course/mappers'
import type { DisciplineRef } from '@/lib/course/types'
import type { Campus, Discipline, Teacher } from '@/payload-types'

import type { TeacherExperience, TeacherListItem } from './types'

/**
 * Payload 文档 → 师资视图模型（纯函数，供 src/lib/data/teachers.ts 使用，可单测）。
 * 按 depth 填充进来的专业方向、校区即使是从未发布过的草稿也会被填充出来，这里再按 `_status` 过滤。
 */

type Relation<T> = number | T | null | undefined

type PublishableDiscipline = DisciplineSource & Pick<Discipline, '_status'>

/** 讲师的专业方向：只保留已填充且已发布的，保持后台关联顺序，按 ID 去重 */
export function publishedDisciplines(
  values: readonly Relation<PublishableDiscipline>[] | null | undefined,
): DisciplineRef[] {
  const seen = new Set<number>()
  const refs: DisciplineRef[] = []
  for (const value of values ?? []) {
    const doc = publishedDoc(value)
    if (!doc || seen.has(doc.id)) continue
    seen.add(doc.id)
    refs.push(toDisciplineRef(doc))
  }
  return refs
}

export type TeacherListSource = TeacherSource & {
  disciplines?: readonly Relation<PublishableDiscipline>[] | null
}

/** 讲师 → 列表卡片（M3 讲师卡片 + 已发布的专业方向） */
export function toTeacherListItem(teacher: TeacherListSource): TeacherListItem {
  return { ...toTeacherCard(teacher), disciplines: publishedDisciplines(teacher.disciplines) }
}

/** 讲师所在校区：仅已填充且已发布时给出名称、slug（链接到校区详情）与城市 */
export function toTeacherCampus(
  value: Relation<Pick<Campus, 'name' | 'slug' | 'city' | '_status'>>,
): { name: string; slug: string; city: string } | null {
  const campus = publishedDoc(value)
  return campus ? { name: campus.name, slug: campus.slug, city: campus.city } : null
}

/** 从业经历：去掉机构或职位为空的条目，时间可为空 */
export function toTeacherExperience(items: Teacher['experience']): TeacherExperience[] {
  return (items ?? [])
    .map((item) => ({
      period: item.period?.trim() || null,
      org: item.org.trim(),
      role: item.role.trim(),
    }))
    .filter((item) => item.org && item.role)
}
