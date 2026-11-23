import { describe, expect, it } from 'vitest'

import { paginate, paginationItems, parsePageParam } from '@/lib/pagination'
import { isValidSlug, readSearchParam } from '@/lib/search-params'

/**
 * 分页与查询参数的纯函数。
 */

describe('parsePageParam', () => {
  it('不带前导 0 的正整数原样返回', () => {
    expect(parsePageParam('1')).toBe(1)
    expect(parsePageParam('3')).toBe(3)
    expect(parsePageParam(' 12 ')).toBe(12)
    expect(parsePageParam('999999')).toBe(999999)
  })

  it.each([undefined, '', '0', '-1', '1.5', '02', 'abc', '2abc', '1e3', '1000000'])(
    '非法页码 %s 按第 1 页处理',
    (value) => {
      expect(parsePageParam(value)).toBe(1)
    },
  )
})

describe('paginate', () => {
  const items = Array.from({ length: 60 }, (_, i) => i + 1)

  it('按每页件数切片，第 3 页是最后 12 件', () => {
    const first = paginate(items, 1, 24)
    expect(first).toMatchObject({
      page: 1,
      perPage: 24,
      total: 60,
      totalPages: 3,
      outOfRange: false,
    })
    expect(first.items).toEqual(items.slice(0, 24))
    const third = paginate(items, 3, 24)
    expect(third.items).toEqual(items.slice(48))
    expect(third.outOfRange).toBe(false)
  })

  it('页码超出总页数：outOfRange（页面 404），当前页为空', () => {
    const slice = paginate(items, 4, 24)
    expect(slice.outOfRange).toBe(true)
    expect(slice.items).toEqual([])
  })

  it('没有条目时第 1 页是空列表、不算超出（显示空状态），总页数为 1', () => {
    expect(paginate([], 1, 24)).toEqual({
      items: [],
      page: 1,
      perPage: 24,
      total: 0,
      totalPages: 1,
      outOfRange: false,
    })
    // 没有条目时任何页码都不算超出：交给空状态
    expect(paginate([], 5, 24).outOfRange).toBe(false)
  })

  it('非法页码与每页件数按 1 处理，不修改传入的数组', () => {
    const source = [1, 2, 3]
    expect(paginate(source, 0, 2).page).toBe(1)
    expect(paginate(source, 1.5, 2).page).toBe(1)
    expect(paginate(source, 1, 0).items).toEqual([1])
    expect(source).toEqual([1, 2, 3])
  })
})

describe('paginationItems', () => {
  it.each([
    [1, 1, [1]],
    [1, 2, [1, 2]],
    [2, 3, [1, 2, 3]],
    [1, 10, [1, 2, 'ellipsis-end', 10]],
    [3, 10, [1, 2, 3, 4, 'ellipsis-end', 10]],
    // 只差一页时直接显示页码，不用省略号
    [4, 10, [1, 2, 3, 4, 5, 'ellipsis-end', 10]],
    [5, 10, [1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10]],
    [7, 10, [1, 'ellipsis-start', 6, 7, 8, 9, 10]],
    [10, 10, [1, 'ellipsis-start', 9, 10]],
  ])('第 %i 页 / 共 %i 页 → %j', (page, total, expected) => {
    expect(paginationItems(page, total)).toEqual(expected)
  })

  it('页码超出范围时按最近的有效页计算', () => {
    expect(paginationItems(0, 3)).toEqual([1, 2, 3])
    expect(paginationItems(99, 3)).toEqual([1, 2, 3])
    expect(paginationItems(1, 0)).toEqual([1])
  })

  it('siblings 可调', () => {
    expect(paginationItems(10, 20, 2)).toEqual([
      1,
      'ellipsis-start',
      8,
      9,
      10,
      11,
      12,
      'ellipsis-end',
      20,
    ])
  })
})

describe('查询参数', () => {
  it('readSearchParam：不存在返回 undefined，重复取第一个，URLSearchParams 与对象都支持', () => {
    expect(readSearchParam({}, 'page')).toBeUndefined()
    expect(readSearchParam({ page: ['2', '3'] }, 'page')).toBe('2')
    expect(readSearchParam({ page: [] }, 'page')).toBe('')
    expect(readSearchParam(new URLSearchParams('page=2&page=3'), 'page')).toBe('2')
    expect(readSearchParam(new URLSearchParams('page='), 'page')).toBe('')
    expect(readSearchParam(new URLSearchParams(''), 'page')).toBeUndefined()
  })

  it('isValidSlug：与后台 slug 格式一致', () => {
    for (const slug of ['lin-yu-qing', 'a1', 'maya']) expect(isValidSlug(slug)).toBe(true)
    for (const slug of ['', 'Lin', 'a b', '../x', 'a--b', '-a', 'x.html', 'a'.repeat(81)]) {
      expect(isValidSlug(slug)).toBe(false)
    }
  })
})
