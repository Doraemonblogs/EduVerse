'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { cn } from '@/lib/utils'

const t = zh.scroller

/** 横滑列表的滚动状态（由 scrollLeft / scrollWidth / clientWidth 计算） */
export type ScrollerState = {
  /** 内容宽于可视区域（可以滚动） */
  overflowing: boolean
  atStart: boolean
  atEnd: boolean
  /** 进度条滑块占轨道的比例（0–1） */
  thumbSize: number
  /** 滚动进度（0–1） */
  thumbOffset: number
}

/** 误差容忍（像素）：缩放与小数像素下 scrollLeft 可能差 1px 到不了两端 */
const EPSILON = 1

/** 根据滚动容器的尺寸计算状态（纯函数，可单测） */
export function computeScrollerState({
  scrollLeft,
  scrollWidth,
  clientWidth,
}: {
  scrollLeft: number
  scrollWidth: number
  clientWidth: number
}): ScrollerState {
  const max = Math.max(0, scrollWidth - clientWidth)
  if (max <= EPSILON || clientWidth <= 0) {
    return { overflowing: false, atStart: true, atEnd: true, thumbSize: 1, thumbOffset: 0 }
  }
  const left = Math.min(max, Math.max(0, scrollLeft))
  return {
    overflowing: true,
    atStart: left <= EPSILON,
    atEnd: left >= max - EPSILON,
    thumbSize: clientWidth / scrollWidth,
    thumbOffset: left / max,
  }
}

const sameState = (a: ScrollerState | null, b: ScrollerState) =>
  a !== null &&
  a.overflowing === b.overflowing &&
  a.atStart === b.atStart &&
  a.atEnd === b.atEnd &&
  Math.abs(a.thumbSize - b.thumbSize) < 0.001 &&
  Math.abs(a.thumbOffset - b.thumbOffset) < 0.001

/** 上一组 / 下一组按钮：< md（触屏为主）44px 触控目标，≥ md 收为 36px */
const CONTROL_SIZE = 'md:size-9'

/** 每次按钮滚动可视宽度的比例（留一点上一组的边缘，方便看出连贯性；随后由 scroll-snap 对齐到项） */
const PAGE_RATIO = 0.85

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth')

/** node 所在的列表项（list 的直接子元素 <li>，卡片里嵌套的列表不算）；不在列表项内时为 null */
function itemOf(list: HTMLElement, node: EventTarget | null): HTMLElement | null {
  let current = node instanceof Element ? node : null
  while (current && current.parentElement !== list) current = current.parentElement
  return current instanceof HTMLElement ? current : null
}

/** 是否键盘聚焦（鼠标 / 触摸点击时不额外滚动）；不支持 :focus-visible 的环境按键盘聚焦处理 */
function isKeyboardFocus(element: Element): boolean {
  try {
    return element.matches(':focus-visible')
  } catch {
    return true
  }
}

/**
 * 列表项没有完整显示在吸附区域（列表减去 scroll-padding，即版心宽度）内时，把它滚到吸附起点。
 * 用于键盘聚焦：浏览器自身的“滚动到可见”只移动到元素刚好露出，随后的强制吸附（snap-mandatory）
 * 可能又吸回上一项，焦点停在可视区域外（窄屏下露出一小截的下一张卡片尤其明显）。
 */
function revealItem(list: HTMLElement, item: HTMLElement) {
  if (list.scrollWidth - list.clientWidth <= EPSILON) return
  const style = getComputedStyle(list)
  const listRect = list.getBoundingClientRect()
  const itemRect = item.getBoundingClientRect()
  const start = listRect.left + (Number.parseFloat(style.scrollPaddingLeft) || 0)
  const end = listRect.right - (Number.parseFloat(style.scrollPaddingRight) || 0)
  if (itemRect.left >= start - EPSILON && itemRect.right <= end + EPSILON) return
  list.scrollTo({ left: list.scrollLeft + itemRect.left - start, behavior: scrollBehavior() })
}

export type HorizontalScrollerControlsProps = {
  /** 滚动容器（<ul>）的 id */
  targetId: string
  /** 滚动容器的无障碍名称，用于按钮的 aria-label（“{label}：上一组”） */
  label: string
  controls: boolean
  progress: boolean
  className?: string
}

/**
 * 横滑容器的客户端部分：底部进度条（装饰性，aria-hidden）与上一组 / 下一组按钮。
 * - 按钮滚到头时禁用；内容没有超出可视区域时整行不渲染，并把列表移出 Tab 顺序（不能滚动就不需要聚焦）；
 * - 系统开启“减少动态效果”时按钮直接跳转，不平滑滚动；
 * - 键盘聚焦到没有完整显示的列表项时，把该项滚到吸附起点（见 revealItem），焦点不会停在可视区域外；
 * - 首次测量前（服务端渲染与水合期间）按钮禁用、进度条显示占位，避免布局跳动。
 */
export function HorizontalScrollerControls({
  targetId,
  label,
  controls,
  progress,
  className,
}: HorizontalScrollerControlsProps) {
  const [state, setState] = useState<ScrollerState | null>(null)

  useEffect(() => {
    const list = document.getElementById(targetId)
    if (!list) return
    const update = () => {
      const next = computeScrollerState(list)
      // 不能滚动时不需要键盘聚焦（如桌面端改为网格）；能滚动时可用方向键滚动
      if (next.overflowing) list.tabIndex = 0
      else list.removeAttribute('tabindex')
      setState((prev) => (sameState(prev, next) ? prev : next))
    }
    let frame = 0
    const onFocusIn = (event: FocusEvent) => {
      const item = itemOf(list, event.target)
      if (!item || !(event.target instanceof Element) || !isKeyboardFocus(event.target)) return
      // 等浏览器自身的聚焦滚动与吸附完成后再检查
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => revealItem(list, item))
    }
    update()
    list.addEventListener('scroll', update, { passive: true })
    list.addEventListener('focusin', onFocusIn)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    observer?.observe(list)
    if (!observer) window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      list.removeEventListener('scroll', update)
      list.removeEventListener('focusin', onFocusIn)
      observer?.disconnect()
      if (!observer) window.removeEventListener('resize', update)
    }
  }, [targetId])

  if (state && !state.overflowing) return null
  if (!controls && !progress) return null

  const scrollPage = (direction: -1 | 1) => {
    const list = document.getElementById(targetId)
    list?.scrollBy({
      left: direction * list.clientWidth * PAGE_RATIO,
      behavior: scrollBehavior(),
    })
  }

  const thumbSize = state?.thumbSize ?? 0.3
  const thumbOffset = state?.thumbOffset ?? 0

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {progress ? (
        <div aria-hidden className="relative h-0.5 min-w-0 flex-1 overflow-hidden bg-border">
          <div
            data-slot="scroller-progress"
            className="absolute inset-y-0 bg-foreground"
            style={{
              width: `${thumbSize * 100}%`,
              left: `${thumbOffset * (1 - thumbSize) * 100}%`,
            }}
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {controls ? (
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={CONTROL_SIZE}
            aria-controls={targetId}
            aria-label={formatMessage(t.previous, { label })}
            disabled={!state || state.atStart}
            onClick={() => scrollPage(-1)}
          >
            <ChevronLeftIcon aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={CONTROL_SIZE}
            aria-controls={targetId}
            aria-label={formatMessage(t.next, { label })}
            disabled={!state || state.atEnd}
            onClick={() => scrollPage(1)}
          >
            <ChevronRightIcon aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
