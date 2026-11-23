import { describe, expect, it } from 'vitest'

import { groupCoursesByDiscipline } from '@/components/course/list/group-courses'

import { courseCard, disciplineRef } from '../helpers/course-fixtures'

const ANIMATION = disciplineRef()
const GAME = disciplineRef({ id: 2, name: '游戏美术', shortName: '游戏美术', slug: 'game-art' })

describe('groupCoursesByDiscipline', () => {
  it('按专业方向首次出现的顺序分组，组内保持原有顺序', () => {
    const cards = [
      courseCard({ id: 1, slug: 'a', discipline: ANIMATION }),
      courseCard({ id: 2, slug: 'b', discipline: GAME }),
      courseCard({ id: 3, slug: 'c', discipline: ANIMATION }),
      courseCard({ id: 4, slug: 'd', discipline: GAME }),
    ]
    const groups = groupCoursesByDiscipline(cards)
    expect(groups.map((g) => g.discipline.slug)).toEqual(['3d-animation', 'game-art'])
    expect(groups[0]!.courses.map((c) => c.id)).toEqual([1, 3])
    expect(groups[1]!.courses.map((c) => c.id)).toEqual([2, 4])
  })

  it('分组使用课程上的专业方向信息（全称、简称、slug）', () => {
    const [group] = groupCoursesByDiscipline([courseCard({ discipline: GAME })])
    expect(group!.discipline).toEqual(GAME)
  })

  it('没有课程时返回空数组（页面显示空状态）', () => {
    expect(groupCoursesByDiscipline([])).toEqual([])
  })
})
