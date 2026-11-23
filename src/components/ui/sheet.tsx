'use client'

import { XIcon } from 'lucide-react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * 侧边抽屉（移动端导航菜单），从右侧滑入，占满高度。
 * 页面开启了 viewport-fit=cover：横屏时右侧（铺满宽度时两侧）留出刘海 / 圆角安全区。
 */
const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetTitle = SheetPrimitive.Title
const SheetDescription = SheetPrimitive.Description

function SheetContent({
  className,
  children,
  closeLabel,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { closeLabel: string }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-950/60 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <SheetPrimitive.Content
        className={cn(
          'surface-light fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)] shadow-lg outline-none sm:pl-0',
          'data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className="absolute top-2 right-[calc(0.5rem+env(safe-area-inset-right,0px))] grid size-11 cursor-pointer place-items-center rounded-sm text-foreground transition-colors hover:bg-accent"
          aria-label={closeLabel}
        >
          <XIcon className="size-6" aria-hidden />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger }
