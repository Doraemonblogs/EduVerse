// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CourseFilters } from '@/lib/course/types'

import { BEIJING, courseCard, SHANGHAI, SHENZHEN } from '../helpers/course-fixtures'

/**
 * 移动端筛选行（横向滚动）把选中项滚进可见范围（jsdom 没有布局，这里模拟各元素的位置与尺寸）。
 */
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    scroll: _scroll,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const { FILTER_ROW_SELECTOR, RevealSelectedFilters, revealSelectedFilters } =
  await import('@/components/course/list/reveal-selected-filters')
const { CourseFilterBar } = await import('@/components/course/list/course-filter-bar')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

type Box = { left: number; width: number }

const rect = ({ left, width }: Box) => ({
  left,
  right: left + width,
  width,
  top: 0,
  bottom: 44,
  height: 44,
  x: left,
  y: 0,
  toJSON: () => ({}),
})

/**
 * 给一行筛选模拟布局：行宽 / 内容宽，选中项相对行左缘的位置（未滚动时）。
 * scrollLeft 可读写，选中项的位置随它变化（与浏览器一致）。
 */
function layoutRow(
  row: HTMLElement,
  {
    rowLeft = 80,
    clientWidth = 293,
    scrollWidth = 700,
    chip,
  }: {
    rowLeft?: number
    clientWidth?: number
    scrollWidth?: number
    chip: Box
  },
) {
  let scrollLeft = 0
  Object.defineProperty(row, 'scrollLeft', {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = Math.min(Math.max(0, value), scrollWidth - clientWidth)
    },
  })
  Object.defineProperty(row, 'clientWidth', { configurable: true, value: clientWidth })
  Object.defineProperty(row, 'scrollWidth', { configurable: true, value: scrollWidth })
  row.getBoundingClientRect = () => rect({ left: rowLeft, width: clientWidth }) as DOMRect
  const selected = row.querySelector<HTMLElement>('[aria-current="true"]')
  if (selected) {
    selected.getBoundingClientRect = () =>
      rect({ left: rowLeft + chip.left - scrollLeft, width: chip.width }) as DOMRect
  }
  return {
    get scrollLeft() {
      return scrollLeft
    },
  }
}

function Row({ name, selected }: { name: string; selected: number }) {
  return (
    <ul aria-labelledby={`course-filter-${name}`}>
      {['全部', '北京', '上海', '广州', '深圳', '杭州'].map((label, index) => (
        <li key={label}>
          <a href="#" aria-current={index === selected ? 'true' : undefined}>
            {label}
          </a>
        </li>
      ))}
    </ul>
  )
}

describe('revealSelectedFilters', () => {
  it('选中项在可见范围右侧时，把它滚到行中间（不使用 scrollIntoView，页面不跟着滚）', () => {
    const { container } = render(<Row name="city" selected={5} />)
    const row = container.querySelector('ul')!
    const state = layoutRow(row, { scrollWidth: 1000, chip: { left: 576, width: 90 } })
    const scrollIntoView = vi.fn()
    for (const el of container.querySelectorAll<HTMLElement>('ul, a')) {
      el.scrollIntoView = scrollIntoView
    }

    revealSelectedFilters(container)

    // 576 − (293 − 90) / 2 = 474.5
    expect(state.scrollLeft).toBe(474.5)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('选中项是最后一个时滚到行尾（浏览器把 scrollLeft 限制在最大值）', () => {
    const { container } = render(<Row name="city" selected={5} />)
    const row = container.querySelector('ul')!
    const state = layoutRow(row, { scrollWidth: 700, chip: { left: 610, width: 90 } })
    revealSelectedFilters(container)
    expect(state.scrollLeft).toBe(700 - 293)
  })

  it('选中项本来就完整可见时不挪动（点选可见的选项后不跳动）', () => {
    const { container } = render(<Row name="city" selected={1} />)
    const row = container.querySelector('ul')!
    const state = layoutRow(row, { chip: { left: 80, width: 70 } })
    revealSelectedFilters(container)
    expect(state.scrollLeft).toBe(0)
  })

  it('选中项在可见范围左侧（如清除筛选后选中“全部”）时滚回去', () => {
    const { container } = render(<Row name="city" selected={0} />)
    const row = container.querySelector('ul')!
    const state = layoutRow(row, { chip: { left: 0, width: 70 } })
    row.scrollLeft = 300
    revealSelectedFilters(container)
    expect(state.scrollLeft).toBe(0)
  })

  it('没有横向溢出的行（桌面端自动换行）不处理', () => {
    const { container } = render(<Row name="city" selected={5} />)
    const row = container.querySelector('ul')!
    const state = layoutRow(row, { scrollWidth: 293, chip: { left: 576, width: 90 } })
    revealSelectedFilters(container)
    expect(state.scrollLeft).toBe(0)
  })
})

describe('RevealSelectedFilters', () => {
  it('挂载后处理所在 <nav> 里的各行，筛选条件变化后再处理一次', () => {
    const view = (selection: string, selected: number) => (
      <nav>
        <Row name="city" selected={selected} />
        <RevealSelectedFilters selection={selection} />
      </nav>
    )
    const { container, rerender } = render(view('city=shenzhen', 4))
    const row = container.querySelector('ul')!
    // 挂载时（jsdom 没有布局、没有溢出）不处理；之后模拟出布局
    const state = layoutRow(row, { chip: { left: 480, width: 90 } })

    rerender(view('city=shenzhen', 4))
    expect(state.scrollLeft).toBe(0) // 条件没变，不重复处理

    rerender(view('city=shenzhen&mode=dual', 4))
    // 480 − (293 − 90) / 2 = 378.5
    expect(state.scrollLeft).toBe(378.5)
    expect(container.querySelector('span[hidden]')).not.toBeNull()
  })
})

describe('CourseFilterBar 接入', () => {
  const cards = [
    courseCard({ id: 1, campuses: [BEIJING, SHANGHAI, SHENZHEN] }),
    courseCard({ id: 2, slug: 'b', campuses: [SHENZHEN] }),
  ]

  it('筛选栏的四行都能被选择器找到，选中项带 aria-current="true"', () => {
    const filters: CourseFilters = { city: 'shenzhen' }
    const { container } = render(
      <CourseFilterBar cards={cards} filters={filters} resultCount={2} />,
    )
    const rows = container.querySelectorAll(FILTER_ROW_SELECTOR)
    expect(rows).toHaveLength(4)
    const city = rows[3]!
    expect(city.querySelector('[aria-current="true"]')?.textContent).toContain('深圳')
    // 不可见的挂载点在筛选栏 <nav> 内部
    expect(container.querySelector('nav span[hidden]')).not.toBeNull()
  })
})
