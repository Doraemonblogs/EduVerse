// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FilterBarRow } from '@/components/common/filter-bar'

/**
 * 通用筛选栏 FilterBar 与分页导航 Pagination（jsdom）。版式与响应式由页面 e2e 覆盖。
 */
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch,
    scroll,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean; scroll?: boolean }) => (
    <a
      href={href}
      data-prefetch={String(prefetch)}
      data-scroll={scroll === undefined ? undefined : String(scroll)}
      {...rest}
    >
      {children}
    </a>
  ),
}))

const { FilterBar } = await import('@/components/common/filter-bar')
const { FILTER_ROW_SELECTOR } = await import('@/components/common/reveal-selected-filters')
const { Pagination } = await import('@/components/common/pagination')

afterEach(cleanup)

const rows: FilterBarRow[] = [
  {
    key: 'discipline',
    label: '专业方向',
    options: [
      { label: '三维动画', count: 30, href: '/works?discipline=a', selected: true },
      { label: '游戏', count: 20, href: '/works?discipline=g', selected: false },
    ],
    allHref: '/works',
    allCount: 60,
    allSelected: false,
  },
  {
    key: 'featured',
    label: '精选',
    options: [{ label: '只看精选', count: 4, href: '/works?featured=1', selected: false }],
    allHref: '/works?discipline=a',
    allCount: 30,
    allSelected: true,
  },
]

function renderBar(props: Partial<React.ComponentProps<typeof FilterBar>> = {}) {
  return render(
    <FilterBar
      label="作品筛选"
      idPrefix="work-filter"
      rows={rows}
      resultCount={30}
      resultTemplate="共 {count} 件作品"
      optionCountTemplate="（{count} 件作品）"
      clearHref="/works"
      {...props}
    />,
  )
}

describe('FilterBar', () => {
  it('按传入的行渲染：每行“全部”在前，标签是该行列表的无障碍名称', () => {
    const { container } = renderBar()
    const nav = screen.getByRole('navigation', { name: '作品筛选' })
    const discipline = within(nav).getByRole('list', { name: '专业方向' })
    expect(discipline.getAttribute('aria-labelledby')).toBe('work-filter-discipline')
    expect(
      within(discipline)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['全部60（60 件作品）', '/works'],
      ['三维动画30（30 件作品）', '/works?discipline=a'],
      ['游戏20（20 件作品）', '/works?discipline=g'],
    ])
    // 每一行都能被“选中项滚进可见范围”找到
    expect(container.querySelectorAll(FILTER_ROW_SELECTOR)).toHaveLength(2)
    expect(container.querySelector('nav span[hidden]')).not.toBeNull()
  })

  it('当前项 aria-current="true"；allSelected 决定“全部”是否为当前项', () => {
    renderBar()
    const current = (name: string) =>
      within(screen.getByRole('list', { name }))
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'true')
        .map((link) => link.textContent)
    expect(current('专业方向')).toEqual(['三维动画30（30 件作品）'])
    expect(current('精选')).toEqual(['全部30（30 件作品）'])
  })

  it('筛选链接 nofollow、不预取、保持滚动位置', () => {
    renderBar()
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('rel')).toBe('nofollow')
      expect(link.getAttribute('data-prefetch')).toBe('false')
      expect(link.getAttribute('data-scroll')).toBe('false')
    }
  })

  it('结果数按模板显示；clearHref 有值时显示“清除筛选”，为 null 时不显示', () => {
    renderBar()
    expect(screen.getByRole('status').textContent).toBe('共 30 件作品')
    expect(screen.getByRole('link', { name: '清除筛选' }).getAttribute('href')).toBe('/works')
    cleanup()
    renderBar({ clearHref: null })
    expect(screen.queryByRole('link', { name: '清除筛选' })).toBeNull()
  })

  it('有说明时在筛选栏下方显示（静态预览站），没有时不渲染', () => {
    renderBar({ notice: '静态预览站不支持筛选与翻页' })
    expect(screen.getByRole('note').textContent).toBe('静态预览站不支持筛选与翻页')
    cleanup()
    renderBar()
    expect(screen.queryByRole('note')).toBeNull()
  })
})

describe('Pagination', () => {
  const href = (page: number) => (page > 1 ? `/works?page=${page}` : '/works')

  it('只有 1 页时不渲染', () => {
    const { container } = render(<Pagination page={1} totalPages={1} href={href} />)
    expect(container.innerHTML).toBe('')
  })

  it('“分页”导航：页码链接可抓取（不 nofollow），当前页 aria-current="page"', () => {
    render(<Pagination page={2} totalPages={3} href={href} />)
    const nav = screen.getByRole('navigation', { name: '分页' })
    const pages = within(nav).getAllByRole('link', { name: /^第 \d 页$/ })
    expect(pages.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['1', '/works'],
      ['2', '/works?page=2'],
      ['3', '/works?page=3'],
    ])
    expect(within(nav).getByRole('link', { name: '第 2 页' }).getAttribute('aria-current')).toBe(
      'page',
    )
    expect(nav.querySelectorAll('[aria-current]')).toHaveLength(1)
    for (const link of within(nav).getAllByRole('link')) {
      expect(link.getAttribute('rel') ?? '').not.toContain('nofollow')
    }
    expect(within(nav).getByRole('link', { name: '上一页' }).getAttribute('href')).toBe('/works')
    expect(within(nav).getByRole('link', { name: '下一页' }).getAttribute('href')).toBe(
      '/works?page=3',
    )
    // 移动端紧凑显示的读屏文字
    expect(within(nav).getByText('第 2 页，共 3 页')).toBeTruthy()
  })

  it('第一页没有“上一页”，最后一页没有“下一页”', () => {
    render(<Pagination page={1} totalPages={3} href={href} />)
    expect(screen.queryByRole('link', { name: '上一页' })).toBeNull()
    expect(screen.getByRole('link', { name: '下一页' })).toBeTruthy()
    cleanup()
    render(<Pagination page={3} totalPages={3} href={href} />)
    expect(screen.getByRole('link', { name: '上一页' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: '下一页' })).toBeNull()
  })

  it('页数多时首尾 + 当前页前后各 1 页，其余省略号（读屏隐藏）', () => {
    const { container } = render(<Pagination page={5} totalPages={10} href={href} />)
    expect(
      screen.getAllByRole('link', { name: /^第 \d+ 页$/ }).map((link) => link.textContent),
    ).toEqual(['1', '4', '5', '6', '10'])
    const ellipses = [...container.querySelectorAll('li[aria-hidden]')]
    expect(ellipses.map((li) => li.textContent)).toEqual(['…', '…'])
  })

  it('可自定义导航名称（同页多个分页时区分）', () => {
    render(<Pagination page={1} totalPages={2} href={href} label="作品分页" />)
    expect(screen.getByRole('navigation', { name: '作品分页' })).toBeTruthy()
  })
})
