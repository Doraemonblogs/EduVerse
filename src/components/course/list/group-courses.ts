import type { CourseCardData, DisciplineRef } from '@/lib/course/types'

/** 课程列表的一个分组：一个专业方向及其（筛选后的）课程 */
export type CourseGroup = {
  discipline: DisciplineRef
  courses: CourseCardData[]
}

/**
 * 按专业方向分组（纯函数）：分组顺序 = 专业方向在课程中首次出现的顺序
 * （数据层已按专业方向排序、课程排序排好），组内保持原有顺序；没有课程的专业方向不出现。
 */
export function groupCoursesByDiscipline(cards: readonly CourseCardData[]): CourseGroup[] {
  const groups = new Map<number, CourseGroup>()
  for (const card of cards) {
    const group = groups.get(card.discipline.id)
    if (group) group.courses.push(card)
    else groups.set(card.discipline.id, { discipline: card.discipline, courses: [card] })
  }
  return [...groups.values()]
}
