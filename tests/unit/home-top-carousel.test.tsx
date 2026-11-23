// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import type { HomeBanner, HomeHeroData } from '@/lib/home/types'

import {
  canAutoplay,
  createCountdown,
  isAutoplayRunning,
  nearestSlideIndex,
  pauseCountdown,
  resolvePlaying,
  startCountdown,
  wrapIndex,
  type AutoplayHolds,
} from '@/components/home/top/hero-carousel-logic'

/**
 * 首页主视觉轮播：纯逻辑（环绕、按滚动位置求当前张、自动轮播的让路条件、可暂停的倒计时），
 * 客户端外壳的计时 / 暂停 / 减少动态效果 / 键盘行为，以及服务端组件输出的标题层级与按钮。
 * jsdom 没有布局与滚动：用原型上的 getter 模拟滚动区域（每张 1000px 宽、scrollTo 改变 scrollLeft 并派发 scroll），
 * :focus-visible 也按测试里的“输入方式”模拟；当前张以圆点的 aria-current 判断。真实的滑动与吸附由 e2e 覆盖。
 */
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const { LeadDialogProvider } = await import('@/components/lead/lead-dialog')
const { HeroCarouselFrame } = await import('@/components/home/top/hero-carousel-frame')
const { HeroCarousel } = await import('@/components/home/top/hero-carousel')

const config: LeadFormConfig = {
  disciplines: [],
  cities: [],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const NO_HOLDS: AutoplayHolds = {
  hovered: false,
  focused: false,
  touching: false,
  hidden: false,
  offscreen: false,
}

describe('轮播纯逻辑', () => {
  it('索引首尾环绕', () => {
    expect(wrapIndex(3, 3)).toBe(0)
    expect(wrapIndex(-1, 3)).toBe(2)
    expect(wrapIndex(7, 3)).toBe(1)
    expect(wrapIndex(1, 0)).toBe(0)
  })

  it('按滚动位置取最接近的一张，并夹在范围内', () => {
    expect(nearestSlideIndex(0, 400, 3)).toBe(0)
    expect(nearestSlideIndex(190, 400, 3)).toBe(0)
    expect(nearestSlideIndex(210, 400, 3)).toBe(1)
    expect(nearestSlideIndex(5000, 400, 3)).toBe(2)
    expect(nearestSlideIndex(100, 0, 3)).toBe(0)
  })

  it('只有后台开启且至少 2 张时才能自动轮播', () => {
    expect(canAutoplay(true, 2)).toBe(true)
    expect(canAutoplay(true, 1)).toBe(false)
    expect(canAutoplay(false, 4)).toBe(false)
  })

  it('播放状态：访客的选择优先，否则减少动态效果时默认不播放', () => {
    expect(resolvePlaying(null, false)).toBe(true)
    expect(resolvePlaying(null, true)).toBe(false)
    expect(resolvePlaying(true, true)).toBe(true)
    expect(resolvePlaying(false, false)).toBe(false)
  })

  it('悬停、键盘聚焦、触摸、后台标签页、滚出视口任一成立时暂停', () => {
    expect(isAutoplayRunning(true, true, NO_HOLDS)).toBe(true)
    expect(isAutoplayRunning(false, true, NO_HOLDS)).toBe(false)
    expect(isAutoplayRunning(true, false, NO_HOLDS)).toBe(false)
    for (const key of Object.keys(NO_HOLDS) as (keyof AutoplayHolds)[]) {
      expect(isAutoplayRunning(true, true, { ...NO_HOLDS, [key]: true }), key).toBe(false)
    }
  })

  it('倒计时：暂停时扣除已走时间，继续时接着走；换一轮（key 变化）从头开始', () => {
    let clock = createCountdown('0:0', 6000)
    clock = startCountdown(clock, '0:0', 6000, 1000)
    expect(clock).toEqual({ key: '0:0', remaining: 6000, startedAt: 1000 })
    clock = pauseCountdown(clock, 3500)
    expect(clock).toEqual({ key: '0:0', remaining: 3500, startedAt: null })
    // 暂停中再暂停不变
    expect(pauseCountdown(clock, 9000)).toBe(clock)
    clock = startCountdown(clock, '0:0', 6000, 10_000)
    expect(clock.remaining).toBe(3500)
    expect(startCountdown(clock, '1:0', 6000, 11_000).remaining).toBe(6000)
    // 间隔被改短、或已经走完时从头开始
    expect(
      startCountdown({ key: '0:0', remaining: 5000, startedAt: null }, '0:0', 4000, 0),
    ).toEqual({ key: '0:0', remaining: 4000, startedAt: 0 })
    expect(
      startCountdown({ key: '0:0', remaining: 0, startedAt: null }, '0:0', 4000, 0).remaining,
    ).toBe(4000)
  })
})

const TITLES = ['第一张标题', '第二张标题', '第三张标题']

/** 模拟布局：滚动区域（.snap-x）宽 1000px，第 n 张的 offsetLeft = n × 1000 */
const SLIDE_WIDTH = 1000
const scrollPositions = new WeakMap<Element, number>()
const isTrack = (element: Element) => element.classList.contains('snap-x')
/** 当前是否“键盘操作”：决定聚焦元素是否匹配 :focus-visible */
let keyboardModality = true
const originalOffsetLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft')
const originalMatches = Element.prototype.matches

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return isTrack(this) ? SLIDE_WIDTH : 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
    configurable: true,
    get(this: HTMLElement) {
      return scrollPositions.get(this) ?? 0
    },
    set(this: HTMLElement, value: number) {
      scrollPositions.set(this, value)
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      const parent = this.parentElement
      return parent && isTrack(parent) ? [...parent.children].indexOf(this) * SLIDE_WIDTH : 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value(this: HTMLElement, options: ScrollToOptions) {
      this.scrollLeft = options.left ?? 0
      this.dispatchEvent(new Event('scroll'))
    },
  })
  Element.prototype.matches = function (this: Element, selector: string) {
    if (selector === ':focus-visible') return keyboardModality && document.activeElement === this
    return originalMatches.call(this, selector)
  }
})

afterAll(() => {
  for (const key of ['clientWidth', 'scrollLeft', 'scrollTo'] as const) {
    Reflect.deleteProperty(HTMLElement.prototype, key)
  }
  if (originalOffsetLeft)
    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', originalOffsetLeft)
  Element.prototype.matches = originalMatches
})

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderFrame(props: Partial<React.ComponentProps<typeof HeroCarouselFrame>> = {}) {
  return render(
    <HeroCarouselFrame titles={TITLES} autoplay intervalMs={6000} focusableTrack={false} {...props}>
      {TITLES.map((title) => (
        <div key={title}>
          <h2>{title}</h2>
          <button type="button">{`${title}按钮`}</button>
        </div>
      ))}
    </HeroCarouselFrame>,
  )
}

/** 当前张（圆点 aria-current，从 0 开始） */
function currentSlide(): number {
  const dots = within(screen.getByRole('group', { name: '选择轮播图' })).getAllByRole('button')
  return dots.findIndex((dot) => dot.getAttribute('aria-current') === 'true')
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('reduce') && matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

describe('HeroCarouselFrame（自动轮播与控件）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    keyboardModality = true
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('按后台间隔自动切到下一张，最后一张之后回到第一张；自动切换不播报', async () => {
    renderFrame()
    expect(currentSlide()).toBe(0)
    await advance(5999)
    expect(currentSlide()).toBe(0)
    await advance(1)
    expect(currentSlide()).toBe(1)
    await advance(6000)
    await advance(6000)
    expect(currentSlide()).toBe(0)
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe('')
  })

  it('暂停按钮停止自动轮播，再按“开始”从头计时', async () => {
    renderFrame()
    await advance(3000)
    fireEvent.click(screen.getByRole('button', { name: '暂停自动轮播' }))
    await advance(20_000)
    expect(currentSlide()).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: '开始自动轮播' }))
    expect(screen.getByRole('button', { name: '暂停自动轮播' })).toBeTruthy()
    await advance(5000)
    expect(currentSlide()).toBe(0)
    await advance(1000)
    expect(currentSlide()).toBe(1)
  })

  it('鼠标悬停时暂停，移开后从剩余时间继续（触摸指针不算悬停）', async () => {
    const { container } = renderFrame()
    const root = container.firstElementChild!
    await advance(4000)
    fireEvent.pointerEnter(root, { pointerType: 'mouse' })
    await advance(10_000)
    expect(currentSlide()).toBe(0)
    fireEvent.pointerLeave(root, { pointerType: 'mouse' })
    await advance(1999)
    expect(currentSlide()).toBe(0)
    await advance(1)
    expect(currentSlide()).toBe(1)

    fireEvent.pointerEnter(root, { pointerType: 'touch' })
    await advance(6000)
    expect(currentSlide()).toBe(2)
  })

  it('键盘焦点在轮播内时暂停，离开后继续；聚焦暂停按钮本身不暂停', async () => {
    renderFrame()
    const firstCta = screen.getByRole('button', { name: '第一张标题按钮' })
    act(() => firstCta.focus())
    await advance(12_000)
    expect(currentSlide()).toBe(0)

    // 焦点移到暂停按钮：不再让路，计时继续（剩余 6 秒）
    act(() => screen.getByRole('button', { name: '暂停自动轮播' }).focus())
    await advance(6000)
    expect(currentSlide()).toBe(1)

    act(() => screen.getByRole('button', { name: '暂停自动轮播' }).blur())
    await advance(6000)
    expect(currentSlide()).toBe(2)
  })

  it('键盘焦点进入某一张（Tab 到它的按钮）时切换到该张', () => {
    renderFrame({ autoplay: false })
    act(() => screen.getByRole('button', { name: '第三张标题按钮' }).focus())
    expect(currentSlide()).toBe(2)
  })

  it('鼠标点击（非键盘聚焦）控件后不会一直暂停', async () => {
    keyboardModality = false
    renderFrame()
    act(() => screen.getByRole('button', { name: '第 1 张：第一张标题' }).focus())
    await advance(6000)
    expect(currentSlide()).toBe(1)
  })

  it('手指滑动（滚动区域滚动）后当前张随滚动位置更新，并重新计时', async () => {
    const { container } = renderFrame()
    const track = container.querySelector<HTMLElement>('.snap-x')!
    await advance(4000)
    act(() => {
      track.scrollLeft = 2 * SLIDE_WIDTH + 120
      track.dispatchEvent(new Event('scroll'))
    })
    await advance(20)
    expect(currentSlide()).toBe(2)
    await advance(5900)
    expect(currentSlide()).toBe(2)
    await advance(200)
    expect(currentSlide()).toBe(0)
  })

  it('页面切到后台时暂停', async () => {
    renderFrame()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await advance(20_000)
    expect(currentSlide()).toBe(0)
    visibility.mockReturnValue('visible')
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await advance(6000)
    expect(currentSlide()).toBe(1)
    visibility.mockRestore()
  })

  it('系统开启“减少动态效果”时默认不自动轮播，访客可以手动开始', async () => {
    stubReducedMotion(true)
    renderFrame()
    expect(screen.queryByRole('button', { name: '暂停自动轮播' })).toBeNull()
    await advance(30_000)
    expect(currentSlide()).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: '开始自动轮播' }))
    await advance(6000)
    expect(currentSlide()).toBe(1)
  })

  it('后台关闭自动轮播时没有暂停 / 播放按钮，也不会自动切换', async () => {
    renderFrame({ autoplay: false })
    expect(screen.queryByRole('button', { name: /自动轮播/ })).toBeNull()
    await advance(60_000)
    expect(currentSlide()).toBe(0)
  })

  it('上一张 / 下一张首尾环绕，圆点直达；手动切换后读屏播报当前张', () => {
    renderFrame({ autoplay: false })
    const live = document.querySelector('[aria-live="polite"]')!
    fireEvent.click(screen.getByRole('button', { name: '上一张' }))
    expect(currentSlide()).toBe(2)
    expect(live.textContent).toBe('第 3 张，共 3 张：第三张标题')
    fireEvent.click(screen.getByRole('button', { name: '下一张' }))
    expect(currentSlide()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: '第 2 张：第二张标题' }))
    expect(currentSlide()).toBe(1)
    expect(live.textContent).toBe('第 2 张，共 3 张：第二张标题')
  })

  it('手动切换后重新计时', async () => {
    renderFrame()
    await advance(5000)
    fireEvent.click(screen.getByRole('button', { name: '下一张' }))
    expect(currentSlide()).toBe(1)
    await advance(5000)
    expect(currentSlide()).toBe(1)
    await advance(1000)
    expect(currentSlide()).toBe(2)
  })

  it('没有任何一张带按钮时滚动区域本身可聚焦', () => {
    const { container, rerender } = renderFrame({ focusableTrack: true })
    expect(container.querySelector('.snap-x')?.getAttribute('tabindex')).toBe('0')
    rerender(
      <HeroCarouselFrame titles={TITLES} autoplay intervalMs={6000} focusableTrack={false}>
        <div />
      </HeroCarouselFrame>,
    )
    expect(container.querySelector('.snap-x')?.hasAttribute('tabindex')).toBe(false)
  })
})

const image = (name: string) => ({
  src: `/api/media/file/${name}.webp`,
  alt: `${name}（占位图）`,
  width: 1920,
  height: 800,
})

const banner = (id: number, overrides: Partial<HomeBanner> = {}): HomeBanner => ({
  id,
  title: `轮播图 ${id}`,
  subtitle: `副标题 ${id}`,
  ctaLabel: `按钮 ${id}`,
  link: { href: '/courses', external: false },
  image: image(`banner-${id}`),
  mobileImage: { ...image(`banner-${id}-mobile`), width: 750, height: 1000 },
  startAt: null,
  endAt: null,
  ...overrides,
})

const hero = (banners: HomeBanner[], overrides: Partial<HomeHeroData> = {}): HomeHeroData => ({
  autoplay: true,
  intervalMs: 6000,
  banners,
  ...overrides,
})

const renderHero = (data: HomeHeroData) =>
  render(
    <LeadDialogProvider config={config}>
      <HeroCarousel hero={data} brandName="EduVerse 数艺学院" />
    </LeadDialogProvider>,
  )

describe('HeroCarousel（服务端输出）', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', NoopResizeObserver)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('没有轮播图时只输出视觉隐藏的品牌名 h1', () => {
    renderHero(hero([]))
    const h1 = screen.getByRole('heading', { level: 1, name: 'EduVerse 数艺学院' })
    expect(h1.id).toBe('home-hero-title')
    expect(h1.className).toContain('sr-only')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('只有 1 张时是静态横幅：标题为 h1，没有任何轮播控件与轮播语义', () => {
    const { container } = renderHero(hero([banner(1)]))
    expect(screen.getByRole('heading', { level: 1, name: '轮播图 1' }).id).toBe('home-hero-title')
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('[aria-roledescription]')).toBeNull()
    expect(screen.getByRole('link', { name: /按钮 1/ }).getAttribute('href')).toBe('/courses')
  })

  it('多张时第一张标题为 h1、其余为 h2，每张有“第 n 张，共 N 张”的分组名称', () => {
    renderHero(hero([banner(1), banner(2), banner(3)]))
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: '轮播图 1' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      '轮播图 2',
      '轮播图 3',
    ])
    const region = screen.getByRole('region', { name: '主视觉' })
    expect(region.getAttribute('aria-roledescription')).toBe('轮播')
    const slides = within(region).getAllByRole('group', { name: /^第 \d 张，共 3 张$/ })
    expect(slides).toHaveLength(3)
    expect(slides[0]!.getAttribute('aria-roledescription')).toBe('幻灯片')
    expect(screen.getByRole('button', { name: '上一张' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '第 3 张：轮播图 3' })).toBeTruthy()
  })

  it('桌面图与移动端图按断点切换（<picture>），只有第一张立即加载', () => {
    const { container } = renderHero(hero([banner(1), banner(2)]))
    const pictures = [...container.querySelectorAll('picture')]
    expect(pictures).toHaveLength(2)
    const [first, second] = pictures.map((picture) => ({
      source: picture.querySelector('source')!,
      img: picture.querySelector('img')!,
    }))
    expect(first!.source.getAttribute('media')).toBe('(min-width: 640px)')
    expect(first!.source.getAttribute('srcset')).toContain('banner-1.webp')
    expect(first!.img.getAttribute('src')).toContain('banner-1-mobile.webp')
    expect(first!.img.getAttribute('alt')).toBe('banner-1（占位图）')
    expect(first!.img.getAttribute('loading')).toBe('eager')
    expect(first!.img.getAttribute('fetchpriority')).toBe('high')
    expect(second!.img.getAttribute('loading')).toBe('lazy')
    expect(second!.img.getAttribute('fetchpriority')).toBeNull()
  })

  it('sizes 按 object-cover 的裁切放大：12:5 横幅在 640–1279px 的较高框里不会挑到过小的候选', () => {
    const { container } = renderHero(hero([banner(1)]))
    const source = container.querySelector('picture source')!
    const img = container.querySelector('picture img')!
    expect(source.getAttribute('sizes')).toBe(
      '(min-width: 1360px) 1280px, (min-width: 1280px) 92vw, (min-width: 1024px) 111vw, (min-width: 768px) 143vw, 152vw',
    )
    // 竖图（3:4）比 4:5 的框窄：按框宽
    expect(img.getAttribute('sizes')).toBe('95vw')
    // srcset 里有足够宽的候选（不会被 800 宽封顶）
    expect(source.getAttribute('srcset')).toContain('w=1920')
    // 框的宽高比与计算 sizes 用的一致
    const slide = img.closest('picture')!.parentElement!
    for (const aspect of [
      'aspect-[4/5]',
      'sm:aspect-[3/2]',
      'md:aspect-[16/10]',
      'lg:aspect-[2/1]',
      'xl:aspect-[12/5]',
    ]) {
      expect(slide.classList.contains(aspect), aspect).toBe(true)
    }
  })

  it('没有竖图、移动端回退到横幅桌面图时，移动端 sizes 放大到约 3 倍框宽（LCP 图不被拉伸）', () => {
    const wide = image('banner-1')
    const { container } = renderHero(hero([banner(1, { mobileImage: wide })]))
    const img = container.querySelector('picture img')!
    expect(img.getAttribute('sizes')).toBe('285vw')
    expect(img.getAttribute('srcset')).toContain('w=1920')
  })

  it('不输出 preload 提示（避免预取首页时把轮播图预加载插入其它页面），只有第一张立即加载且高优先级', () => {
    const before = document.head.querySelectorAll('link[rel="preload"][as="image"]').length
    const { container } = renderHero(hero([banner(11), banner(12), banner(13)]))
    expect(document.head.querySelectorAll('link[rel="preload"][as="image"]')).toHaveLength(before)
    const imgs = [...container.querySelectorAll('picture img')]
    expect(imgs).toHaveLength(3)
    expect(imgs[0]!.getAttribute('loading')).not.toBe('lazy')
    expect(imgs[0]!.getAttribute('fetchpriority')).toBe('high')
    for (const img of imgs.slice(1)) {
      expect(img.getAttribute('loading')).toBe('lazy')
      expect(img.getAttribute('fetchpriority')).toBeNull()
    }
  })

  it('lg 起版心右侧给悬浮操作栏让位（下一张按钮不被盖住）', () => {
    renderHero(hero([banner(1), banner(2)]))
    const region = screen.getByRole('region', { name: '主视觉' })
    const container = region.firstElementChild!
    expect(container.classList.contains('container-site')).toBe(true)
    expect(container.classList.contains('lg:avoid-floating-actions')).toBe(true)
    expect(within(container as HTMLElement).getByRole('button', { name: '下一张' })).toBeTruthy()
  })

  it('按钮：有链接时跳转（外链新窗口），没有链接时打开留资弹窗（home_hero），没有按钮文字时不显示', async () => {
    renderHero(
      hero([
        banner(1, { link: { href: 'https://example.com/event', external: true } }),
        banner(2, { link: null }),
        banner(3, { ctaLabel: null }),
      ]),
    )
    const external = screen.getByRole('link', { name: /按钮 1/ })
    expect(external.getAttribute('target')).toBe('_blank')
    expect(external.getAttribute('rel')).toBe('noopener noreferrer')
    expect(external.textContent).toContain('（在新窗口打开）')
    expect(screen.queryByText('按钮 3')).toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '按钮 2' }))
    })
    const form = screen.getByRole('dialog').querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe('home_hero')
    expect(form.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('trial')
  })
})
