import { describe, expect, it } from 'vitest'

import {
  buildTeacherFilterRows,
  filterTeachers,
  parseTeacherFilters,
  teacherFilterHref,
} from '@/lib/teachers/filters'
import {
  publishedDisciplines,
  toTeacherCampus,
  toTeacherExperience,
  toTeacherListItem,
  type TeacherListSource,
} from '@/lib/teachers/mappers'
import { teacherPath } from '@/lib/teachers/paths'

import { ANIMATION, GAME, teacherListItem, UI } from '../helpers/work-fixtures'

/**
 * 师资：Payload 文档 → 视图模型、/teachers 的专业方向筛选。
 */

const discipline = (id: number, slug: string, status: 'draft' | 'published') => ({
  id,
  name: `方向 ${id}`,
  shortName: `简称 ${id}`,
  slug,
  _status: status,
})

describe('师资 mappers', () => {
  it('publishedDisciplines：只保留已填充且已发布的，保持顺序并去重', () => {
    expect(
      publishedDisciplines([
        discipline(2, 'game-art', 'published'),
        discipline(3, 'draft-one', 'draft'),
        9,
        discipline(1, '3d-animation', 'published'),
        discipline(2, 'game-art', 'published'),
      ]),
    ).toEqual([
      { id: 2, name: '方向 2', shortName: '简称 2', slug: 'game-art' },
      { id: 1, name: '方向 1', shortName: '简称 1', slug: '3d-animation' },
    ])
    expect(publishedDisciplines(null)).toEqual([])
  })

  it('toTeacherListItem：M3 讲师卡片（头像 thumbnail）+ 已发布的专业方向', () => {
    const teacher: TeacherListSource = {
      id: 5,
      slug: 'lin',
      name: '林老师',
      title: '三维动画讲师',
      avatar: 3,
      yearsOfExperience: 9,
      specialties: [{ text: ' 角色绑定 ' }, { text: '' }],
      disciplines: [discipline(1, '3d-animation', 'published'), discipline(3, 'x', 'draft')],
    }
    expect(toTeacherListItem(teacher)).toEqual({
      id: 5,
      slug: 'lin',
      name: '林老师',
      title: '三维动画讲师',
      avatar: null,
      yearsOfExperience: 9,
      specialties: ['角色绑定'],
      disciplines: [{ id: 1, name: '方向 1', shortName: '简称 1', slug: '3d-animation' }],
    })
  })

  it('toTeacherCampus：只有已发布的校区给出名称、slug（链接到校区详情）与城市', () => {
    expect(
      toTeacherCampus({
        name: '北京海淀校区',
        slug: 'beijing-haidian',
        city: '北京',
        _status: 'published',
      }),
    ).toEqual({ name: '北京海淀校区', slug: 'beijing-haidian', city: '北京' })
    expect(
      toTeacherCampus({ name: '草稿校区', slug: 'draft', city: '上海', _status: 'draft' }),
    ).toBeNull()
    expect(toTeacherCampus(4)).toBeNull()
    expect(toTeacherCampus(null)).toBeNull()
  })

  it('toTeacherExperience：去空格，时间可空，机构或职位为空的条目去掉', () => {
    expect(
      toTeacherExperience([
        { period: ' 2018–2022 ', org: ' 某动画工作室 ', role: '动画师' },
        { period: '', org: '某游戏公司', role: '角色美术' },
        { period: '2015', org: ' ', role: '实习' },
      ]),
    ).toEqual([
      { period: '2018–2022', org: '某动画工作室', role: '动画师' },
      { period: null, org: '某游戏公司', role: '角色美术' },
    ])
    expect(toTeacherExperience(null)).toEqual([])
  })

  it('teacherPath', () => {
    expect(teacherPath('lin-yu-qing')).toBe('/teachers/lin-yu-qing')
  })
})

describe('讲师筛选', () => {
  const teachers = [
    teacherListItem({ id: 1, slug: 'a', disciplines: [ANIMATION] }),
    teacherListItem({ id: 2, slug: 'b', disciplines: [GAME, ANIMATION] }),
    teacherListItem({ id: 3, slug: 'c', disciplines: [GAME] }),
    teacherListItem({ id: 4, slug: 'd', disciplines: [] }),
  ]

  it('parseTeacherFilters：合法 slug 保留；出现参数即 hasFilterParams（非法值也算）', () => {
    expect(parseTeacherFilters({ discipline: 'game-art' })).toEqual({
      filters: { discipline: 'game-art' },
      hasFilterParams: true,
    })
    expect(parseTeacherFilters({ discipline: 'Bad!' })).toEqual({
      filters: {},
      hasFilterParams: true,
    })
    expect(parseTeacherFilters(new URLSearchParams('discipline='))).toEqual({
      filters: {},
      hasFilterParams: true,
    })
    expect(parseTeacherFilters({ page: '2' })).toEqual({ filters: {}, hasFilterParams: false })
  })

  it('filterTeachers：讲师属于多个方向时任一匹配即可，保持顺序', () => {
    expect(filterTeachers(teachers, {}).map((t) => t.id)).toEqual([1, 2, 3, 4])
    expect(filterTeachers(teachers, { discipline: 'game-art' }).map((t) => t.id)).toEqual([2, 3])
    expect(filterTeachers(teachers, { discipline: 'unknown' })).toEqual([])
  })

  it('teacherFilterHref：选择 / 再点取消 / 全部', () => {
    expect(teacherFilterHref({}, 'game-art')).toBe('/teachers?discipline=game-art')
    expect(teacherFilterHref({ discipline: 'game-art' }, 'game-art')).toBe('/teachers')
    expect(teacherFilterHref({ discipline: 'game-art' }, '3d-animation')).toBe(
      '/teachers?discipline=3d-animation',
    )
    expect(teacherFilterHref({ discipline: 'game-art' }, undefined)).toBe('/teachers')
  })

  it('buildTeacherFilterRows：一行专业方向，按传入顺序列出有讲师的方向（简称），选中项可取消', () => {
    const [row, ...rest] = buildTeacherFilterRows(teachers, { discipline: 'game-art' }, [
      ANIMATION,
      GAME,
      UI,
    ])
    expect(rest).toEqual([])
    expect(row).toEqual({
      key: 'discipline',
      label: '专业方向',
      options: [
        {
          label: '三维动画',
          count: 2,
          href: '/teachers?discipline=3d-animation',
          selected: false,
        },
        { label: '游戏', count: 2, href: '/teachers', selected: true },
      ],
      allHref: '/teachers',
      allCount: 4,
      allSelected: false,
    })
  })

  it('当前选择没有讲师时仍保留（便于取消），不在专业方向清单里的取值不显示', () => {
    const [row] = buildTeacherFilterRows(teachers, { discipline: 'ui-ux' }, [ANIMATION, GAME, UI])
    expect(row!.options.at(-1)).toEqual({
      label: 'UI/UX',
      count: 0,
      href: '/teachers',
      selected: true,
    })
    const [unknown] = buildTeacherFilterRows(teachers, { discipline: 'unknown' }, [ANIMATION])
    expect(unknown!.allSelected).toBe(false)
    expect(unknown!.options.some((o) => o.selected)).toBe(false)
  })
})
