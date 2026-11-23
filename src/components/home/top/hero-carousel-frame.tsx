'use client'

import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from 'lucide-react'
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'

import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { cn } from '@/lib/utils'

import {
  canAutoplay,
  createCountdown,
  HERO_VIEWPORT_CLASS,
  isAutoplayRunning,
  nearestSlideIndex,
  pauseCountdown,
  resolvePlaying,
  startCountdown,
  wrapIndex,
} from './hero-carousel-logic'

const t = zh.home.top.hero

/** 程序滚动到目标张的最长等待（毫秒）：超时后按实际滚动位置同步当前张（被手势打断等情况） */
const SETTLE_TIMEOUT = 1000
/** 判断“已滚到目标张”的误差（像素） */
const SETTLE_EPSILON = 2

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * 控件尺寸：< md（触屏为主）暂停 / 播放、上一张 / 下一张为 44px 触控目标、圆点 44px 宽高，≥ md 收为 36px。
 * 360px 宽的手机上一行放得下暂停 + 4 个圆点 + 上一张 / 下一张（< sm 不显示装饰性的“01 / 04”页码，间距收窄）。
 */
const CONTROL_SIZE = 'md:size-9'

/**
 * < sm 时与上一张 / 下一张同行的圆点上限：超过时这一段隐藏上一张 / 下一张（圆点与手指滑动已能切换到任意一张），
 * 一行放得下暂停 + 6 个圆点；圆点再多时圆点组自身换行。
 */
const MOBILE_ARROWS_MAX_SLIDES = 4

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const reducedMotionSnapshot = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}
const hiddenSnapshot = () => document.visibilityState === 'hidden'
/** 服务端渲染与水合时：不减少动态效果、页面可见 */
const serverFalse = () => false

/** 键盘聚焦（鼠标 / 触摸点击按钮不算，避免点一下圆点后自动轮播一直停着）；不支持 :focus-visible 时按键盘处理 */
function isKeyboardFocus(element: Element): boolean {
  try {
    return element.matches(':focus-visible')
  } catch {
    return true
  }
}

/**
 * 当前张圆点里的倒计时进度（Web Animations API，与 JS 计时同一时刻开始 / 暂停）。
 * 按“轮次”挂载（换张或重新播放时重新挂载，从 0 开始）；不支持 element.animate 的环境显示为空轨道。
 */
function CountdownFill({ running, durationMs }: { running: boolean; durationMs: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const animation = useRef<Animation | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof element.animate !== 'function') return
    const current = element.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: durationMs,
      easing: 'linear',
      fill: 'both',
    })
    current.pause()
    animation.current = current
    return () => {
      current.cancel()
      animation.current = null
    }
  }, [durationMs])

  useEffect(() => {
    const current = animation.current
    if (!current) return
    if (running) current.play()
    else current.pause()
  }, [running])

  return (
    <span
      ref={ref}
      data-slot="hero-countdown"
      // 初始为空轨道（transform 而不是 scale 属性：动画改的是 transform，两者会叠乘）
      className="absolute inset-0 origin-left bg-foreground [transform:scaleX(0)]"
    />
  )
}

export type HeroCarouselFrameProps = {
  /** 各张标题（圆点的无障碍名称、手动切换后的读屏播报），顺序与 children 一致 */
  titles: string[]
  /** 后台“自动轮播” */
  autoplay: boolean
  /** 轮播间隔（毫秒） */
  intervalMs: number
  /** 没有任何一张带按钮时让滚动区域本身可聚焦（键盘可用方向键滑动）；有按钮时焦点落在按钮上 */
  focusableTrack: boolean
  /** 服务端渲染的各张（HeroSlide），每张与滚动区域同宽 */
  children: ReactNode
}

/**
 * 主视觉轮播的客户端外壳（只有 2 张及以上时使用）：
 * - 滑动：CSS scroll-snap（每张吸附、一次只滑一张），不引入轮播库；按钮 / 圆点用 scrollTo 切换，
 *   减少动态效果时直接跳转；当前张按滚动位置同步（手指滑动、窗口缩放后也正确）；
 * - 上一张 / 下一张（首尾环绕）、圆点（aria-current，按钮名“第 n 张：标题”）、暂停 / 播放按钮；
 * - 自动轮播：后台开启且张数 > 1；系统开启“减少动态效果”时默认不播放（可手动开始）；
 *   鼠标悬停、键盘聚焦（暂停 / 播放按钮本身除外）、手指滑动、页面切到后台、轮播滚出视口时暂停，
 *   恢复后从剩余时间继续；换张后重新计时；
 * - 键盘焦点进入某一张（Tab 到它的按钮）时切换到该张，焦点不会落在看不见的地方；
 * - 手动切换后用视觉隐藏的 aria-live 区域播报“第 n 张，共 N 张：标题”，自动轮播时不播报。
 */
export function HeroCarouselFrame({
  titles,
  autoplay,
  intervalMs,
  focusableTrack,
  children,
}: HeroCarouselFrameProps) {
  const count = titles.length
  const trackId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const playButtonRef = useRef<HTMLButtonElement>(null)

  const [index, setIndex] = useState(0)
  /** 访客按暂停 / 播放按钮的选择；null = 未选择（按默认） */
  const [userChoice, setUserChoice] = useState<boolean | null>(null)
  /** 每按一次暂停 / 播放加 1：重新播放时倒计时与进度从头开始 */
  const [epoch, setEpoch] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [touching, setTouching] = useState(false)
  const [offscreen, setOffscreen] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    serverFalse,
  )
  const hidden = useSyncExternalStore(subscribeVisibility, hiddenSnapshot, serverFalse)

  const available = canAutoplay(autoplay, count)
  const playing = available && resolvePlaying(userChoice, reducedMotion)
  const running = isAutoplayRunning(available, playing, {
    hovered,
    focused,
    touching,
    hidden,
    offscreen,
  })
  /** 本轮倒计时的标识：换张或重新播放时变化 */
  const round = `${index}:${epoch}`

  /** 正在程序滚动去的目标张：滚动途中经过的其他张不更新当前张（避免圆点闪烁、计时被反复重置） */
  const pending = useRef<{ index: number; timer: number } | null>(null)

  const releasePending = () => {
    if (!pending.current) return
    window.clearTimeout(pending.current.timer)
    pending.current = null
  }

  const scrollToSlide = (target: number) => {
    const track = trackRef.current
    const slide = track?.children[target]
    if (!track || !(slide instanceof HTMLElement)) return
    releasePending()
    pending.current = {
      index: target,
      timer: window.setTimeout(() => {
        pending.current = null
        setIndex(nearestSlideIndex(track.scrollLeft, track.clientWidth, count))
      }, SETTLE_TIMEOUT),
    }
    if (typeof track.scrollTo === 'function') {
      track.scrollTo({ left: slide.offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' })
    }
  }

  const goTo = (target: number, announce: boolean) => {
    const next = wrapIndex(target, count)
    setIndex(next)
    scrollToSlide(next)
    if (announce) {
      setAnnouncement(
        formatMessage(t.announce, { index: next + 1, total: count, title: titles[next] ?? '' }),
      )
    }
  }

  // 滚动（手指滑动、按钮、窗口缩放后的重新吸附）→ 当前张
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let frame = 0
    const sync = () => {
      frame = 0
      const target = pending.current
      if (target) {
        const slide = track.children[target.index]
        const settled =
          slide instanceof HTMLElement &&
          Math.abs(track.scrollLeft - slide.offsetLeft) <= SETTLE_EPSILON
        if (!settled) return
        window.clearTimeout(target.timer)
        pending.current = null
      }
      setIndex(nearestSlideIndex(track.scrollLeft, track.clientWidth, count))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sync)
    }
    // 访客自己动手滑动时放弃程序滚动的目标，以实际位置为准
    const onUserScroll = () => {
      if (!pending.current) return
      window.clearTimeout(pending.current.timer)
      pending.current = null
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    track.addEventListener('touchstart', onUserScroll, { passive: true })
    track.addEventListener('wheel', onUserScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      track.removeEventListener('scroll', onScroll)
      track.removeEventListener('touchstart', onUserScroll)
      track.removeEventListener('wheel', onUserScroll)
      if (pending.current) window.clearTimeout(pending.current.timer)
    }
  }, [count])

  // 轮播滚出视口时暂停（只在可以自动轮播时观察）
  useEffect(() => {
    const root = rootRef.current
    if (!available || !root || typeof IntersectionObserver !== 'function') return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setOffscreen(!entry.isIntersecting)
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [available])

  // 自动轮播计时：可暂停的倒计时，暂停时保留剩余时间（见 hero-carousel-logic.ts）
  const countdown = useRef(createCountdown(round, intervalMs))
  const advance = useEffectEvent(() => goTo(index + 1, false))
  useEffect(() => {
    if (!running) return
    const started = startCountdown(countdown.current, round, intervalMs, Date.now())
    countdown.current = started
    let fired = false
    const timer = window.setTimeout(() => {
      fired = true
      countdown.current = createCountdown(round, intervalMs)
      advance()
    }, started.remaining)
    return () => {
      window.clearTimeout(timer)
      if (!fired) countdown.current = pauseCountdown(countdown.current, Date.now())
    }
  }, [running, round, intervalMs])

  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const target: Element = event.target
    const keyboard = isKeyboardFocus(target)
    // 暂停 / 播放按钮本身不算：聚焦它是为了操作它，按下“开始”应立即生效
    setFocused(keyboard && target !== playButtonRef.current)
    const track = trackRef.current
    if (!keyboard || !track || target === track) return
    const slideIndex = Array.from(track.children).findIndex((slide) => slide.contains(target))
    if (slideIndex >= 0 && slideIndex !== index) goTo(slideIndex, false)
  }

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (!(next instanceof Node) || !rootRef.current?.contains(next)) setFocused(false)
  }

  const onPointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovered(true)
  }
  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovered(false)
  }

  const togglePlaying = () => {
    setUserChoice(!playing)
    setEpoch((value) => value + 1)
  }

  return (
    <div
      ref={rootRef}
      className="flex flex-col gap-3 sm:gap-4"
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onTouchStart={() => setTouching(true)}
      onTouchEnd={() => setTouching(false)}
      onTouchCancel={() => setTouching(false)}
    >
      <div className={HERO_VIEWPORT_CLASS}>
        <div
          ref={trackRef}
          id={trackId}
          tabIndex={focusableTrack ? 0 : undefined}
          className={cn(
            'relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none',
            'focus-visible:-outline-offset-2',
          )}
        >
          {children}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-4">
        {available ? (
          <Button
            ref={playButtonRef}
            type="button"
            variant="outline"
            size="icon"
            className={CONTROL_SIZE}
            aria-controls={trackId}
            aria-label={playing ? t.pause : t.play}
            onClick={togglePlaying}
          >
            {playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
          </Button>
        ) : null}

        <div role="group" aria-label={t.dotsLabel} className="flex min-w-0 flex-wrap items-center">
          {titles.map((title, slide) => {
            const current = slide === index
            return (
              <button
                key={`${slide}-${title}`}
                type="button"
                aria-label={formatMessage(t.goTo, { index: slide + 1, title })}
                aria-current={current ? 'true' : undefined}
                aria-controls={trackId}
                onClick={() => goTo(slide, true)}
                className="group/dot flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-xs px-1 md:h-9 md:min-w-0"
              >
                <span
                  className={cn(
                    'relative block h-0.5 overflow-hidden bg-input',
                    'transition-[width,background-color] duration-300 ease-standard',
                    current ? 'w-8 sm:w-12' : 'w-5 group-hover/dot:bg-foreground sm:w-6',
                  )}
                >
                  {current ? (
                    playing && !reducedMotion ? (
                      <CountdownFill key={round} running={running} durationMs={intervalMs} />
                    ) : (
                      <span className="absolute inset-0 bg-foreground" />
                    )
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>

        <p aria-hidden className="numeric ml-auto hidden text-sm text-muted-foreground sm:block">
          <span className="text-foreground">{String(index + 1).padStart(2, '0')}</span>
          {' / '}
          {String(count).padStart(2, '0')}
        </p>

        {/* < sm 页码隐藏时，由这一组把自己推到行尾 */}
        <div
          className={cn(
            'ml-auto flex shrink-0 gap-2 sm:ml-0',
            count > MOBILE_ARROWS_MAX_SLIDES && 'max-sm:hidden',
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={CONTROL_SIZE}
            aria-controls={trackId}
            aria-label={t.previous}
            onClick={() => goTo(index - 1, true)}
          >
            <ChevronLeftIcon aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={CONTROL_SIZE}
            aria-controls={trackId}
            aria-label={t.next}
            onClick={() => goTo(index + 1, true)}
          >
            <ChevronRightIcon aria-hidden />
          </Button>
        </div>
      </div>

      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
