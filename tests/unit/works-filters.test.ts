import { describe, expect, it } from 'vitest'

import {
  buildWorkFilterOptions,
  buildWorkFilterRows,
  filterWorks,
  hasActiveWorkFilters,
  parseWorkFilters,
  workFilterHref,
  workListHref,
  WORKS_PER_PAGE,
} from '@/lib/works/filters'
import type { WorkFilters } from '@/lib/works/types'

import { GAME, UI, workCard, workFacets } from '../helpers/work-fixtures'

/**
 * 作品列表 /works 的筛选与分页参数（纯函数）。
 */

const works = [
  workCard({ id: 6, software: ['maya', 'zbrush'], featured: true }),
  workCard({ id: 5, software: ['blender'] }),
  workCard({ id: 4, discipline: GAME, software: ['zbrush'], featured: true }),
  workCard({ id: 3, discipline: GAME, software: ['maya'] }),
  workCard({ id: 2, discipline: null, software: [] }),
]
const facets = workFacets()

describe('parseWorkFilters', () => {
  it('解析三个维度与页码，参数都合法时原样保留', () => {
    expect(
      parseWorkFilters({ discipline: 'game-art', software: 'maya', featured: '1', page: '2' }),
    ).toEqual({
      filters: { discipline: 'game-art', software: 'maya', featured: true },
      page: 2,
      hasFilterParams: true,
    })
  })

  it('非法取值忽略（按“全部”），但只要出现筛选参数就算 hasFilterParams', () => {
    expect(parseWorkFilters({ discipline: 'Bad Slug', featured: 'yes', software: '' })).toEqual({
      filters: {},
      page: 1,
      hasFilterParams: true,
    })
    expect(parseWorkFilters(new URLSearchParams('featured=0'))).toMatchObject({
      filters: {},
      hasFilterParams: true,
    })
  })

  it('只有 page 不算筛选（第 N 页可以收录）；非法页码按第 1 页', () => {
    expect(parseWorkFilters({ page: '3' })).toEqual({
      filters: {},
      page: 3,
      hasFilterParams: false,
    })
    expect(parseWorkFilters({ page: 'abc' })).toEqual({
      filters: {},
      page: 1,
      hasFilterParams: false,
    })
    expect(parseWorkFilters({})).toEqual({ filters: {}, page: 1, hasFilterParams: false })
  })

  it('重复参数取第一个，取值两侧空格去掉', () => {
    expect(parseWorkFilters({ discipline: [' game-art ', 'ui-ux'] }).filters).toEqual({
      discipline: 'game-art',
    })
  })

  it('每页 24 件', () => {
    expect(WORKS_PER_PAGE).toBe(24)
  })
})

describe('filterWorks', () => {
  it('各维度同时满足，保持原有顺序', () => {
    expect(filterWorks(works, {}).map((w) => w.id)).toEqual([6, 5, 4, 3, 2])
    expect(filterWorks(works, { discipline: 'game-art' }).map((w) => w.id)).toEqual([4, 3])
    expect(filterWorks(works, { software: 'zbrush' }).map((w) => w.id)).toEqual([6, 4])
    expect(filterWorks(works, { featured: true }).map((w) => w.id)).toEqual([6, 4])
    expect(
      filterWorks(works, { discipline: '3d-animation', software: 'maya', featured: true }).map(
        (w) => w.id,
      ),
    ).toEqual([6])
  })

  it('专业方向未发布（discipline 为 null）的作品不匹配任何专业方向', () => {
    expect(filterWorks(works, { discipline: 'unknown' })).toEqual([])
    expect(filterWorks(works, {}).some((w) => w.discipline === null)).toBe(true)
  })

  it('hasActiveWorkFilters', () => {
    expect(hasActiveWorkFilters({})).toBe(false)
    expect(hasActiveWorkFilters({ featured: true })).toBe(true)
  })
})

describe('buildWorkFilterOptions', () => {
  it('只列出有作品的取值，顺序按 facets（后台排序），数量按其它维度的当前选择计算', () => {
    const options = buildWorkFilterOptions(works, { featured: true }, facets)
    // 精选作品：三维动画 1、游戏 1；UI/UX 没有作品，不列出
    expect(options.discipline).toEqual([
      { value: '3d-animation', label: '三维动画', count: 1, selected: false },
      { value: 'game-art', label: '游戏', count: 1, selected: false },
    ])
    // 软件：精选作品里 maya 1、zbrush 2；blender 只出现在非精选作品，figma 没有作品
    expect(options.software.map((o) => [o.value, o.count])).toEqual([
      ['maya', 1],
      ['zbrush', 2],
    ])
    // 精选一行：只有“只看精选”，当前选中；数量 = 其它维度不限时的精选作品数
    expect(options.featured).toEqual([{ value: '1', label: '只看精选', count: 2, selected: true }])
  })

  it('当前选择即使数量为 0 也保留（便于取消）；不在 facets 里的取值不显示', () => {
    const options = buildWorkFilterOptions(
      works,
      { discipline: 'game-art', software: 'blender' },
      facets,
    )
    expect(options.software.find((o) => o.value === 'blender')).toEqual({
      value: 'blender',
      label: 'Blender',
      count: 0,
      selected: true,
    })
    expect(options.discipline.find((o) => o.selected)?.value).toBe('game-art')

    const unknown = buildWorkFilterOptions(works, { software: 'houdini' }, facets)
    expect(unknown.software.some((o) => o.selected)).toBe(false)
  })

  it('UI/UX 有作品时按 facets 顺序排在游戏之后', () => {
    const options = buildWorkFilterOptions(
      [...works, workCard({ id: 1, discipline: UI, software: ['figma'] })],
      {},
      facets,
    )
    expect(options.discipline.map((o) => o.label)).toEqual(['三维动画', '游戏', 'UI/UX'])
  })
})

describe('workFilterHref / workListHref', () => {
  const filters: WorkFilters = { discipline: 'game-art', featured: true }

  it('参数顺序固定 discipline → software → featured → page，第 1 页不带 page', () => {
    expect(workListHref({})).toBe('/works')
    expect(workListHref({}, 1)).toBe('/works')
    expect(workListHref({}, 2)).toBe('/works?page=2')
    expect(workListHref({ featured: true, software: 'maya', discipline: 'ui-ux' }, 3)).toBe(
      '/works?discipline=ui-ux&software=maya&featured=1&page=3',
    )
  })

  it('切换维度：替换取值、回到第 1 页；再点同一项取消；undefined 为“全部”', () => {
    expect(workFilterHref(filters, 'software', 'maya')).toBe(
      '/works?discipline=game-art&software=maya&featured=1',
    )
    expect(workFilterHref(filters, 'discipline', 'ui-ux')).toBe(
      '/works?discipline=ui-ux&featured=1',
    )
    expect(workFilterHref(filters, 'discipline', 'game-art')).toBe('/works?featured=1')
    expect(workFilterHref(filters, 'featured', '1')).toBe('/works?discipline=game-art')
    expect(workFilterHref({}, 'featured', '1')).toBe('/works?featured=1')
    expect(workFilterHref(filters, 'discipline', undefined)).toBe('/works?featured=1')
  })
})

describe('buildWorkFilterRows', () => {
  it('三行：专业方向 / 软件 / 精选；链接回到第 1 页，“全部”数量与当前项', () => {
    const rows = buildWorkFilterRows(works, { discipline: 'game-art' }, facets)
    expect(rows.map((row) => [row.key, row.label])).toEqual([
      ['discipline', '专业方向'],
      ['software', '软件'],
      ['featured', '精选'],
    ])
    const [discipline, software, featured] = rows
    expect(discipline).toMatchObject({ allHref: '/works', allCount: 5, allSelected: false })
    expect(discipline!.options.find((o) => o.selected)).toMatchObject({
      label: '游戏',
      count: 2,
      href: '/works',
    })
    expect(software).toMatchObject({ allHref: '/works?discipline=game-art', allSelected: true })
    expect(software!.options.map((o) => [o.label, o.count, o.href])).toEqual([
      ['Maya', 1, '/works?discipline=game-art&software=maya'],
      ['ZBrush', 1, '/works?discipline=game-art&software=zbrush'],
    ])
    expect(featured!.options).toEqual([
      {
        label: '只看精选',
        count: 1,
        href: '/works?discipline=game-art&featured=1',
        selected: false,
      },
    ])
  })

  it('URL 里是合法但不存在的取值时，“全部”与选项都不是当前项', () => {
    const [discipline] = buildWorkFilterRows(works, { discipline: 'unknown' }, facets)
    expect(discipline!.allSelected).toBe(false)
    expect(discipline!.options.some((o) => o.selected)).toBe(false)
  })
})
