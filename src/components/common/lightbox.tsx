'use client'

import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react'
import Image from 'next/image'
import { Dialog as DialogPrimitive } from 'radix-ui'
import * as React from 'react'

import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import type { ImageSource } from '@/lib/media'
import { cn } from '@/lib/utils'

import { useHydrated } from './use-hydrated'

const t = zh.lightbox

/** 灯箱里的一张图：大图（hero 尺寸）、缩略图与说明文字 */
export type LightboxImage = {
  image: ImageSource
  /** 页面缩略图列表里的同一张图：大图加载完成前先拉伸显示它（浏览器已缓存） */
  thumb: ImageSource
  caption: string | null
}

type LightboxContextValue = {
  /** 打开第 index 张（从 0 开始）；opener 为触发的按钮，关闭后焦点还给它 */
  open: (index: number, opener: HTMLElement | null) => void
}

const LightboxContext = React.createContext<LightboxContextValue | null>(null)

/** 手指横向滑动超过这个距离（px）才切换图片 */
const SWIPE_THRESHOLD = 48

/** 序号在 0…total-1 之间循环：第一张往前是最后一张，最后一张往后是第一张 */
export function wrapIndex(index: number, total: number): number {
  return total > 0 ? ((index % total) + total) % total : 0
}

/** 图片的替代文字：媒体库填写的优先，未填写时用灯箱标题（作品名、校区名） */
function imageAlt(image: ImageSource, title: string): string {
  return image.alt.trim() || title
}

export type LightboxProps = {
  /** 图片序列（如作品：封面在前，见 workLightboxItems；校区：环境照片） */
  items: LightboxImage[]
  /** 对话框标题（作品名、校区名）；图片未填替代文字时用作 alt */
  title: string
  /**
   * 页面缩略图的 sizes：灯箱里先用缩略图（thumb）占位，必须与页面上缩略图的 sizes 相同，
   * 浏览器才会从 srcset 中选中同一个地址、直接命中缓存
   */
  thumbSizes: string
  /** 页面上的触发按钮（LightboxTrigger）及其周围内容，可以是服务端组件 */
  children: React.ReactNode
}

/**
 * 大图灯箱（客户端组件，基于 Radix Dialog；作品图集、校区环境照片共用）：
 * - 全屏深色，顶部标题、序号“2 / 5”与关闭按钮，底部图片说明；
 * - 左右切换按钮（读屏名称“上一张 / 下一张”）、键盘 ← / →、触屏左右滑动，首尾循环；Esc 关闭；
 * - 焦点锁定在灯箱内，关闭后焦点回到打开它的缩略图 / 主图按钮（页面上有多个触发按钮，
 *   Radix 只会归还给 <Dialog.Trigger>，这里自己记住打开它的按钮）；
 * - 序号变化通过 aria-live 播报；减少动态效果时淡入动画由全局样式关闭；
 * - 只有打开后才渲染大图（hero 尺寸），页面首屏不额外加载。
 * 页面里的主图、缩略图用 <LightboxTrigger index> 包裹即可打开对应的图片。
 */
export function Lightbox({ items, title, thumbSizes, children }: LightboxProps) {
  const [index, setIndex] = React.useState<number | null>(null)
  const openerRef = React.useRef<HTMLElement | null>(null)
  const swipeRef = React.useRef<{ x: number; y: number } | null>(null)
  const total = items.length

  const open = React.useCallback(
    (next: number, opener: HTMLElement | null) => {
      if (total === 0) return
      openerRef.current = opener
      setIndex(wrapIndex(next, total))
    },
    [total],
  )
  const context = React.useMemo(() => ({ open }), [open])

  const step = (delta: number) =>
    setIndex((current) => (current === null ? current : wrapIndex(current + delta, total)))

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (total < 2 || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      step(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      step(1)
    }
  }

  const handlePointerDown = (event: React.PointerEvent) => {
    swipeRef.current = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY }
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    const start = swipeRef.current
    swipeRef.current = null
    if (!start || total < 2) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1)
  }

  const handleCloseAutoFocus = (event: Event) => {
    const opener = openerRef.current
    openerRef.current = null
    if (!opener?.isConnected) return
    event.preventDefault()
    opener.focus({ preventScroll: true })
  }

  const current = index === null ? null : items[index]
  const position = index === null ? null : { index: index + 1, total }

  return (
    <LightboxContext.Provider value={context}>
      {children}
      <DialogPrimitive.Root
        open={Boolean(current)}
        onOpenChange={(next) => {
          if (!next) setIndex(null)
        }}
      >
        <DialogPrimitive.Portal>
          {/* 遮罩负责锁定页面滚动；灯箱本身铺满视口 */}
          <DialogPrimitive.Overlay className="surface-dark fixed inset-0 z-50 bg-background" />
          <DialogPrimitive.Content
            data-slot="lightbox"
            className="surface-dark fixed inset-0 z-50 flex flex-col bg-background text-foreground outline-none data-[state=open]:animate-fade-in"
            onKeyDown={handleKeyDown}
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            <div className="flex items-center gap-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] md:gap-6 md:pr-4 md:pl-6">
              <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground md:text-base">
                {title}
              </DialogPrimitive.Title>
              {position ? (
                <p aria-live="polite" aria-atomic="true" className="shrink-0 text-sm">
                  <span aria-hidden className="numeric text-muted-foreground">
                    {formatMessage(t.counter, position)}
                  </span>
                  <span className="sr-only">{formatMessage(t.counterLabel, position)}</span>
                </p>
              ) : null}
              <DialogPrimitive.Close
                aria-label={t.close}
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-foreground transition-colors hover:bg-accent"
              >
                <XIcon aria-hidden className="size-6" />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">{t.hint}</DialogPrimitive.Description>

            {current ? (
              <figure className="flex min-h-0 flex-1 flex-col">
                <div className="relative min-h-0 flex-1">
                  <div
                    className="absolute inset-0 touch-pan-y touch-pinch-zoom md:inset-x-20 md:inset-y-2"
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={() => {
                      swipeRef.current = null
                    }}
                  >
                    {/* 占位：缩略图拉伸铺在下面，大图加载完成后盖住它 */}
                    <Image
                      key={`thumb-${current.thumb.src}`}
                      src={current.thumb.src}
                      alt=""
                      aria-hidden
                      fill
                      sizes={thumbSizes}
                      loading="eager"
                      className="object-contain"
                    />
                    <Image
                      key={current.image.src}
                      src={current.image.src}
                      alt={imageAlt(current.image, title)}
                      fill
                      sizes="(min-width: 768px) calc(100vw - 10rem), 100vw"
                      loading="eager"
                      className="object-contain"
                    />
                  </div>
                  {total > 1 ? (
                    <>
                      <LightboxNavButton
                        label={t.previous}
                        onClick={() => step(-1)}
                        className="left-[max(0.5rem,env(safe-area-inset-left,0px))] md:left-4"
                      >
                        <ChevronLeftIcon aria-hidden className="size-6" />
                      </LightboxNavButton>
                      <LightboxNavButton
                        label={t.next}
                        onClick={() => step(1)}
                        className="right-[max(0.5rem,env(safe-area-inset-right,0px))] md:right-4"
                      >
                        <ChevronRightIcon aria-hidden className="size-6" />
                      </LightboxNavButton>
                    </>
                  ) : null}
                </div>
                {/* 说明文字区域固定最小高度，切换有无说明的图片时大图不跳动 */}
                <figcaption className="flex min-h-14 items-center justify-center px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] text-center text-sm text-muted-foreground md:text-base">
                  {current.caption}
                </figcaption>
              </figure>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </LightboxContext.Provider>
  )
}

function LightboxNavButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-sm border border-border bg-background/80 text-foreground transition-colors hover:bg-accent md:size-12',
        className,
      )}
    >
      {children}
    </button>
  )
}

type LightboxTriggerProps = {
  /** 打开第几张（从 0 开始，对应 Lightbox 的 items） */
  index: number
  /** 读屏名称，如“查看大图：{替代文字}” */
  label: string
  className?: string
  children: React.ReactNode
}

/**
 * 打开灯箱的按钮（必须放在 <Lightbox> 里）。children 一般是服务端渲染的图片；
 * 按钮有读屏名称，里面的图片作为按钮内容不再单独朗读。水合前点击没有反应，先不可用。
 */
export function LightboxTrigger({ index, label, className, children }: LightboxTriggerProps) {
  const context = React.useContext(LightboxContext)
  const hydrated = useHydrated()
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      disabled={!hydrated}
      className={cn('cursor-zoom-in disabled:cursor-default', className)}
      onClick={(event) => context?.open(index, event.currentTarget)}
    >
      {children}
    </button>
  )
}
