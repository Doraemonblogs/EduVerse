'use client'

import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import * as React from 'react'

import { zh } from '@/i18n/zh'
import { cn } from '@/lib/utils'

/**
 * 对话框：桌面端居中弹窗，移动端（< 640px）为底部弹出面板，便于单手填写。
 * 基于 Radix Dialog：焦点锁定、Esc 关闭、读屏标题与描述。
 */
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-ink-950/60 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in',
        className,
      )}
      {...props}
    />
  )
}

/** 尝试聚焦：元素已卸载、被隐藏（display: none）或不可聚焦时返回 false */
function focusIfPossible(element: HTMLElement | null | undefined): boolean {
  if (!element?.isConnected) return false
  element.focus({ preventScroll: true })
  return document.activeElement === element
}

function DialogContent({
  className,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  returnFocusFallbackRef,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /**
   * 打开前的焦点元素在关闭时已被卸载 / 隐藏时，改为聚焦这里的元素。
   * 例如从移动端菜单抽屉里打开留资弹窗：抽屉随之关闭，传入菜单按钮作为退路。
   */
  returnFocusFallbackRef?: React.RefObject<HTMLElement | null>
}) {
  // Radix 只会把焦点还给 <DialogTrigger>；全站留资弹窗、微信弹窗由任意按钮通过状态打开，
  // 没有 Trigger，关闭后焦点会落到 body。这里记住打开前的焦点元素，关闭时归还。
  const returnFocusRef = React.useRef<HTMLElement | null>(null)

  const handleOpenAutoFocus = (event: Event) => {
    const active = document.activeElement
    returnFocusRef.current =
      active instanceof HTMLElement && active !== document.body ? active : null
    onOpenAutoFocus?.(event)
  }

  const handleCloseAutoFocus = (event: Event) => {
    onCloseAutoFocus?.(event)
    if (event.defaultPrevented) return
    const opener = returnFocusRef.current
    returnFocusRef.current = null
    // 依次尝试：打开前的焦点元素 → 调用方提供的退路；都不行时交给 Radix 默认处理（聚焦 Trigger）
    if (focusIfPossible(opener) || focusIfPossible(returnFocusFallbackRef?.current)) {
      event.preventDefault()
    }
  }

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'surface-light fixed z-50 flex max-h-[92dvh] w-full flex-col overflow-y-auto bg-background shadow-lg outline-none',
          // 移动端：底部面板（viewport-fit=cover 下避开底部横条与横屏时的刘海 / 圆角）
          'inset-x-0 bottom-0 rounded-t-lg pr-[env(safe-area-inset-right,0px)] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pl-[env(safe-area-inset-left,0px)] data-[state=open]:animate-sheet-up',
          // 桌面端：居中弹窗
          'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:px-0 sm:pb-6 sm:data-[state=open]:animate-pop-in',
          className,
        )}
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute top-3 right-[calc(0.75rem+env(safe-area-inset-right,0px))] grid size-10 cursor-pointer place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:right-3"
          aria-label={zh.lead.close}
        >
          <XIcon className="size-5" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 px-6 pt-6 pr-14', className)} {...props} />
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-h3 text-foreground', className)} {...props} />
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
