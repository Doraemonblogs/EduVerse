// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest'

import { HorizontalScroller } from '@/components/common/horizontal-scroller'
import { computeScrollerState } from '@/components/common/horizontal-scroller-controls'

/**
 * 通用横滑容器：列表语义、键盘可聚焦、按钮的禁用与滚动方向、减少动态效果、不能滚动时隐藏控件。
 * jsdom 没有布局，用原型上的 getter 模拟列表（<ul>）的 scrollWidth / clientWidth。版式由 e2e 覆盖。
 */

const metrics = { scrollWidth: 0, clientWidth: 0 }

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName === 'UL' ? metrics.scrollWidth : 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName === 'UL' ? metrics.clientWidth : 0
    },
  })
})

afterAll(() => {
  // jsdom 把这两个属性定义在 Element.prototype 上：删掉 HTMLElement 上的覆盖即可恢复
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth')
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
})

beforeEach(() => {
  metrics.scrollWidth = 1000
  metrics.clientWidth = 400
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderScroller(props: Partial<React.ComponentProps<typeof HorizontalScroller>> = {}) {
  render(
    <HorizontalScroller label="精选课程" controls {...props}>
      <a href="#course-a">课程 A</a>
      <a href="#course-b">课程 B</a>
      <a href="#course-c">课程 C</a>
    </HorizontalScroller>,
  )
  const list = screen.getByRole('list', { name: '精选课程' })
  const scrollBy = vi.fn()
  list.scrollBy = scrollBy as unknown as HTMLElement['scrollBy']
  return { list, scrollBy }
}

function setScrollLeft(list: HTMLElement, value: number) {
  Object.defineProperty(list, 'scrollLeft', { configurable: true, value })
  fireEvent.scroll(list)
}

describe('computeScrollerState', () => {
  it('内容没有超出可视区域时不能滚动', () => {
    expect(computeScrollerState({ scrollLeft: 0, scrollWidth: 400, clientWidth: 400 })).toEqual({
      overflowing: false,
      atStart: true,
      atEnd: true,
      thumbSize: 1,
      thumbOffset: 0,
    })
    // 1px 以内的差值（缩放下的小数像素）也视为没有超出
    expect(
      computeScrollerState({ scrollLeft: 0, scrollWidth: 401, clientWidth: 400 }).overflowing,
    ).toBe(false)
  })

  it('在开头、中间、结尾时的状态与进度', () => {
    const at = (scrollLeft: number) =>
      computeScrollerState({ scrollLeft, scrollWidth: 1000, clientWidth: 400 })
    expect(at(0)).toMatchObject({ atStart: true, atEnd: false, thumbSize: 0.4, thumbOffset: 0 })
    expect(at(300)).toMatchObject({ atStart: false, atEnd: false, thumbOffset: 0.5 })
    expect(at(599.5)).toMatchObject({ atStart: false, atEnd: true })
    // 越界（弹性滚动）时按两端处理
    expect(at(-20)).toMatchObject({ atStart: true, thumbOffset: 0 })
    expect(at(700)).toMatchObject({ atEnd: true, thumbOffset: 1 })
  })
})

describe('HorizontalScroller', () => {
  it('每个子元素是一个列表项；列表可用 Tab 聚焦并有无障碍名称', () => {
    const { list } = renderScroller()
    expect(list.tagName).toBe('UL')
    expect(list.tabIndex).toBe(0)
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(within(list).getByRole('link', { name: '课程 B' })).toBeTruthy()
  })

  it('在开头时“上一组”禁用；点击“下一组”向后滚动约一屏', () => {
    const { list, scrollBy } = renderScroller()
    const previous = screen.getByRole('button', { name: '精选课程：上一组' })
    const next = screen.getByRole('button', { name: '精选课程：下一组' })
    expect(previous.hasAttribute('disabled')).toBe(true)
    expect(next.hasAttribute('disabled')).toBe(false)
    expect(next.getAttribute('aria-controls')).toBe(list.id)

    fireEvent.click(next)
    expect(scrollBy).toHaveBeenCalledWith({ left: 340, behavior: 'smooth' })
  })

  it('滚到结尾时“下一组”禁用，“上一组”向前滚动', () => {
    const { list, scrollBy } = renderScroller()
    act(() => setScrollLeft(list, 600))
    const previous = screen.getByRole('button', { name: '精选课程：上一组' })
    expect(screen.getByRole('button', { name: '精选课程：下一组' }).hasAttribute('disabled')).toBe(
      true,
    )
    fireEvent.click(previous)
    expect(scrollBy).toHaveBeenCalledWith({ left: -340, behavior: 'smooth' })
  })

  it('系统开启“减少动态效果”时按钮直接跳转，不平滑滚动', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query.includes('reduce'), media: query })),
    )
    const { scrollBy } = renderScroller()
    fireEvent.click(screen.getByRole('button', { name: '精选课程：下一组' }))
    expect(scrollBy).toHaveBeenCalledWith({ left: 340, behavior: 'auto' })
  })

  it('进度条是装饰性的（aria-hidden），按可视比例与滚动位置显示', () => {
    const { list } = renderScroller({ controls: false })
    expect(screen.queryByRole('button')).toBeNull()
    const thumb = document.querySelector<HTMLElement>('[data-slot="scroller-progress"]')!
    expect(thumb.closest('[aria-hidden]')).not.toBeNull()
    expect(thumb.style.width).toBe('40%')
    expect(thumb.style.left).toBe('0%')
    act(() => setScrollLeft(list, 600))
    expect(thumb.style.left).toBe('60%')
  })

  it('键盘聚焦到没有完整显示的列表项时，把该项滚到起点；完整显示或鼠标点击时不滚动', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    // jsdom 不区分键盘与鼠标聚焦：模拟 :focus-visible（键盘聚焦为 true）
    let keyboard = true
    const matches = Element.prototype.matches
    const spy = vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      return selector === ':focus-visible' ? keyboard : matches.call(this, selector)
    })
    onTestFinished(() => spy.mockRestore())
    const { list } = renderScroller()
    const scrollTo = vi.fn()
    list.scrollTo = scrollTo as unknown as HTMLElement['scrollTo']
    // 可视宽度 400：第 1 项（0–280）完整显示，第 2 项（300–580）只露出一部分
    list.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 200 })
    within(list)
      .getAllByRole('listitem')
      .forEach((item, index) => {
        item.getBoundingClientRect = () =>
          DOMRect.fromRect({ x: index * 300, y: 0, width: 280, height: 200 })
      })

    act(() => within(list).getByRole('link', { name: '课程 A' }).focus())
    expect(scrollTo).not.toHaveBeenCalled()
    keyboard = false
    act(() => within(list).getByRole('link', { name: '课程 B' }).focus())
    expect(scrollTo).not.toHaveBeenCalled()
    keyboard = true
    act(() => within(list).getByRole('link', { name: '课程 A' }).focus())
    act(() => within(list).getByRole('link', { name: '课程 B' }).focus())
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' })
  })

  it('内容没有超出可视区域时不显示控件，列表也不再可聚焦', () => {
    metrics.scrollWidth = 400
    const { list } = renderScroller()
    expect(screen.queryByRole('button')).toBeNull()
    expect(document.querySelector('[data-slot="scroller-progress"]')).toBeNull()
    expect(list.hasAttribute('tabindex')).toBe(false)
  })

  it('上一组 / 下一组按钮：< md 为 44px 触控目标，≥ md 收为 36px', () => {
    renderScroller()
    for (const name of ['精选课程：上一组', '精选课程：下一组']) {
      const classes = screen.getByRole('button', { name }).className.split(/\s+/)
      expect(classes).toContain('size-11')
      expect(classes).toContain('md:size-9')
      expect(classes).not.toContain('size-9')
    }
  })

  it('desktop="grid"：默认 lg 起改为网格并隐藏控件；gridFrom="xl" 时 lg–xl 继续横滑，xl 起才改为网格', () => {
    const { list } = renderScroller({ desktop: 'grid', columns: 4 })
    const classes = list.className.split(/\s+/)
    expect(classes).toEqual(expect.arrayContaining(['lg:grid', 'lg:grid-cols-4']))
    expect(classes.some((name) => name.startsWith('xl:'))).toBe(false)
    const controls = screen.getByRole('button', { name: '精选课程：下一组' }).parentElement!
      .parentElement!
    expect(controls.className).toContain('lg:hidden')
    cleanup()

    const { list: wide } = renderScroller({ desktop: 'grid', columns: 4, gridFrom: 'xl' })
    const wideClasses = wide.className.split(/\s+/)
    // lg–xl：与 desktop="scroll" 相同的横滑排布
    expect(wideClasses).toEqual(
      expect.arrayContaining([
        'lg:-mx-1',
        'lg:px-1',
        'xl:mx-0',
        'xl:px-0',
        'xl:grid',
        'xl:grid-cols-4',
      ]),
    )
    expect(wideClasses).not.toContain('lg:grid')
    expect(wideClasses.some((name) => name.startsWith('lg:grid-cols-'))).toBe(false)
    const wideControls = screen.getByRole('button', { name: '精选课程：下一组' }).parentElement!
      .parentElement!
    expect(wideControls.className).toContain('xl:hidden')
    expect(wideControls.className).not.toContain('lg:hidden')
  })

  it('没有子元素时不渲染', () => {
    const { container } = render(<HorizontalScroller label="空列表">{[]}</HorizontalScroller>)
    expect(container.innerHTML).toBe('')
  })
})
