import { describe, expect, it } from 'vitest'

import {
  buildFilterOptions,
  COURSE_FILTER_KEYS,
  courseFilterHref,
  filterCourses,
  hasActiveFilters,
  parseCourseFilters,
} from '@/lib/course/filters'

import { BEIJING, courseCard, disciplineRef, SHANGHAI, SHENZHEN } from '../helpers/course-fixtures'

const ANIMATION = disciplineRef()
const GAME = disciplineRef({ id: 2, name: '游戏美术', shortName: '游戏', slug: 'game-art' })

/** 课程已按专业方向排序（与数据层一致） */
const cards = [
  courseCard({
    id: 1,
    slug: 'a1',
    discipline: ANIMATION,
    classType: 'long_term',
    deliveryModes: ['offline', 'dual'],
    campuses: [BEIJING, SHANGHAI],
  }),
  courseCard({
    id: 2,
    slug: 'a2',
    discipline: ANIMATION,
    classType: 'short_term',
    deliveryModes: ['online'],
    campuses: [],
  }),
  courseCard({
    id: 3,
    slug: 'g1',
    discipline: GAME,
    classType: 'long_term',
    deliveryModes: ['offline'],
    // 校区顺序与校区排序不一致：城市选项仍按校区排序排列
    campuses: [SHENZHEN, BEIJING],
  }),
  courseCard({
    id: 4,
    slug: 'g2',
    discipline: GAME,
    classType: 'short_term',
    deliveryModes: ['dual'],
    campuses: [SHANGHAI],
  }),
]

const slugs = (list: typeof cards) => list.map((c) => c.slug)

describe('parseCourseFilters', () => {
  it('解析四个维度的合法取值，并标记 URL 带有筛选参数', () => {
    expect(
      parseCourseFilters({
        discipline: '3d-animation',
        type: 'long_term',
        mode: 'dual',
        city: 'beijing',
      }),
    ).toEqual({
      filters: { discipline: '3d-animation', type: 'long_term', mode: 'dual', city: 'beijing' },
      hasParams: true,
    })
  })

  it('没有筛选参数时为空条件，其它参数（如 UTM）不算筛选参数', () => {
    expect(parseCourseFilters({})).toEqual({ filters: {}, hasParams: false })
    expect(parseCourseFilters({ utm_source: 'baidu', page: '2' })).toEqual({
      filters: {},
      hasParams: false,
    })
  })

  it('非法取值忽略（按“全部”处理），但仍算带了筛选参数（页面 noindex）', () => {
    expect(
      parseCourseFilters({
        discipline: 'Bad Slug',
        type: 'weekend',
        mode: 'ONLINE',
        city: '../etc',
      }),
    ).toEqual({ filters: {}, hasParams: true })
    expect(parseCourseFilters({ discipline: '' })).toEqual({ filters: {}, hasParams: true })
    expect(parseCourseFilters({ city: 'a'.repeat(81) })).toEqual({ filters: {}, hasParams: true })
  })

  it('一个参数非法不影响其它参数', () => {
    expect(parseCourseFilters({ type: 'foo', city: 'shanghai' }).filters).toEqual({
      city: 'shanghai',
    })
  })

  it('重复参数取第一个，首尾空白忽略', () => {
    expect(parseCourseFilters({ mode: ['online', 'offline'], city: ' beijing ' }).filters).toEqual({
      mode: 'online',
      city: 'beijing',
    })
  })

  it('支持 URLSearchParams', () => {
    expect(parseCourseFilters(new URLSearchParams('type=short_term&x=1'))).toEqual({
      filters: { type: 'short_term' },
      hasParams: true,
    })
    expect(parseCourseFilters(new URLSearchParams('mode='))).toEqual({
      filters: {},
      hasParams: true,
    })
  })
})

describe('filterCourses', () => {
  it('无条件时原样返回全部课程', () => {
    expect(slugs(filterCourses(cards, {}))).toEqual(['a1', 'a2', 'g1', 'g2'])
  })

  it('按专业方向、班型、授课方式过滤，多个条件同时满足', () => {
    expect(slugs(filterCourses(cards, { discipline: 'game-art' }))).toEqual(['g1', 'g2'])
    expect(slugs(filterCourses(cards, { type: 'long_term' }))).toEqual(['a1', 'g1'])
    expect(slugs(filterCourses(cards, { mode: 'dual' }))).toEqual(['a1', 'g2'])
    expect(slugs(filterCourses(cards, { discipline: '3d-animation', mode: 'dual' }))).toEqual([
      'a1',
    ])
  })

  it('按开设校区所在城市过滤，纯线上课程不出现在城市筛选结果里', () => {
    expect(slugs(filterCourses(cards, { city: 'beijing' }))).toEqual(['a1', 'g1'])
    expect(slugs(filterCourses(cards, { city: 'shenzhen' }))).toEqual(['g1'])
    expect(slugs(filterCourses(cards, { city: 'beijing', type: 'short_term' }))).toEqual([])
  })

  it('不存在的取值得到空结果', () => {
    expect(filterCourses(cards, { discipline: 'unknown' })).toEqual([])
  })
})

describe('buildFilterOptions', () => {
  it('无条件时列出每个维度出现过的取值与课程数，顺序符合后台排序', () => {
    const options = buildFilterOptions(cards, {})
    expect(Object.keys(options)).toEqual([...COURSE_FILTER_KEYS])
    expect(options.discipline).toEqual([
      { value: '3d-animation', label: '三维动画', count: 2, selected: false },
      { value: 'game-art', label: '游戏', count: 2, selected: false },
    ])
    expect(options.type).toEqual([
      { value: 'long_term', label: '长期就业班', count: 2, selected: false },
      { value: 'short_term', label: '短期提升班', count: 2, selected: false },
    ])
    expect(options.mode).toEqual([
      { value: 'offline', label: '线下面授', count: 2, selected: false },
      { value: 'online', label: '线上直播', count: 1, selected: false },
      { value: 'dual', label: '双师课堂', count: 2, selected: false },
    ])
    expect(options.city).toEqual([
      { value: 'beijing', label: '北京', count: 2, selected: false },
      { value: 'shanghai', label: '上海', count: 2, selected: false },
      { value: 'shenzhen', label: '深圳', count: 1, selected: false },
    ])
  })

  it('数量按“其它维度保持当前选择”计算：本维度的数量不受自身选择影响', () => {
    const options = buildFilterOptions(cards, { discipline: '3d-animation' })
    expect(options.discipline).toEqual([
      { value: '3d-animation', label: '三维动画', count: 2, selected: true },
      { value: 'game-art', label: '游戏', count: 2, selected: false },
    ])
    expect(options.type.map((o) => [o.value, o.count])).toEqual([
      ['long_term', 1],
      ['short_term', 1],
    ])
    // 只列出至少有一门课程的取值：三维动画没有深圳校区
    expect(options.city.map((o) => [o.value, o.count])).toEqual([
      ['beijing', 1],
      ['shanghai', 1],
    ])
  })

  it('当前选中的取值在其它条件下没有课程时仍保留（数量 0），便于取消', () => {
    const options = buildFilterOptions(cards, { discipline: 'game-art', mode: 'online' })
    expect(options.mode).toEqual([
      { value: 'offline', label: '线下面授', count: 1, selected: false },
      { value: 'online', label: '线上直播', count: 0, selected: true },
      { value: 'dual', label: '双师课堂', count: 1, selected: false },
    ])
  })

  it('不存在的取值不会出现在选项里', () => {
    const options = buildFilterOptions(cards, { discipline: 'unknown' })
    expect(options.discipline.map((o) => o.value)).toEqual(['3d-animation', 'game-art'])
    expect(options.discipline.some((o) => o.selected)).toBe(false)
    // 其它维度在“专业方向不存在”的条件下没有课程
    expect(options.type).toEqual([])
  })
})

describe('courseFilterHref', () => {
  it('选择某一项：生成 /courses?参数', () => {
    expect(courseFilterHref({}, 'discipline', '3d-animation')).toBe(
      '/courses?discipline=3d-animation',
    )
  })

  it('参数顺序固定为 discipline、type、mode、city', () => {
    expect(courseFilterHref({ city: 'beijing', mode: 'online' }, 'type', 'short_term')).toBe(
      '/courses?type=short_term&mode=online&city=beijing',
    )
    expect(
      courseFilterHref({ city: 'beijing', mode: 'dual', type: 'long_term' }, 'discipline', 'x'),
    ).toBe('/courses?discipline=x&type=long_term&mode=dual&city=beijing')
  })

  it('再点一次当前选中项即取消；全部取消后回到 /courses', () => {
    expect(courseFilterHref({ discipline: 'x' }, 'discipline', 'x')).toBe('/courses')
    expect(courseFilterHref({ discipline: 'x', type: 'long_term' }, 'type', 'long_term')).toBe(
      '/courses?discipline=x',
    )
  })

  it('单选：选择同一维度的另一项会替换原值', () => {
    expect(courseFilterHref({ discipline: 'x', type: 'long_term' }, 'discipline', 'y')).toBe(
      '/courses?discipline=y&type=long_term',
    )
  })

  it('传 undefined 表示该维度“全部”', () => {
    expect(courseFilterHref({ discipline: 'x', mode: 'online' }, 'discipline', undefined)).toBe(
      '/courses?mode=online',
    )
    expect(courseFilterHref({}, 'city', undefined)).toBe('/courses')
  })

  it('不修改传入的筛选条件', () => {
    const filters = { discipline: 'x' }
    courseFilterHref(filters, 'discipline', 'x')
    courseFilterHref(filters, 'type', 'long_term')
    expect(filters).toEqual({ discipline: 'x' })
  })
})

describe('hasActiveFilters', () => {
  it('任一维度有选择时为 true', () => {
    expect(hasActiveFilters({})).toBe(false)
    expect(hasActiveFilters({ city: 'beijing' })).toBe(true)
  })
})
