'use client'

import { useEffect, useId, useState } from 'react'

import { cn } from '@/lib/utils'

type FloatingItemProps = {
  icon: React.ReactNode
  label: string
  href?: string
  onClick?: () => void
  /** 悬停或键盘聚焦时在左侧展开的详情（电话号码、二维码等） */
  detail?: React.ReactNode
}

/**
 * 桌面悬浮栏中的一项。带 detail 时，悬停或聚焦展开详情，满足 WCAG 1.4.13（悬停或聚焦显示的内容）：
 * - 可悬停：详情与按钮之间用透明内边距衔接，指针从按钮移到详情上不会消失；
 * - 可关闭：按 Esc 收起（指针、焦点都不用移动）；指针与焦点都离开后，下次进入重新显示；
 * - 持续显示：直到指针 / 焦点离开或按 Esc。
 */
export function FloatingItem({ icon, label, href, onClick, detail }: FloatingItemProps) {
  const detailId = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const hasDetail = Boolean(detail)
  const visible = hasDetail && (hovered || focused) && !dismissed

  // 详情显示期间监听整个文档的 Esc：仅悬停（焦点不在这里）时也能关闭
  useEffect(() => {
    if (!visible) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDismissed(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible])

  const className =
    'flex w-14 cursor-pointer flex-col items-center gap-1 border-b border-border px-0.5 py-3 text-xs text-foreground transition-colors hover:bg-accent [&_svg]:size-5'
  const content = (
    <>
      {icon}
      {label}
    </>
  )

  return (
    <div
      className="relative"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false)
        if (!focused) setDismissed(false)
      }}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        // 焦点仍在这一项内部（按钮 ↔ 详情）时不算离开
        const next = event.relatedTarget
        if (next instanceof Node && event.currentTarget.contains(next)) return
        setFocused(false)
        if (!hovered) setDismissed(false)
      }}
    >
      {href ? (
        <a href={href} className={className} aria-describedby={hasDetail ? detailId : undefined}>
          {content}
        </a>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className={className}
          aria-describedby={hasDetail ? detailId : undefined}
        >
          {content}
        </button>
      )}
      {hasDetail ? (
        <div
          id={detailId}
          role="tooltip"
          data-state={visible ? 'open' : 'closed'}
          className={cn(
            // pr-3：详情与按钮之间的透明“桥”，属于这一项的范围，指针经过时不会触发离开
            'absolute top-1/2 right-full -translate-y-1/2 pr-3 transition-opacity duration-150',
            visible ? 'visible opacity-100' : 'invisible opacity-0',
          )}
        >
          <div className="surface-light flex flex-col items-center gap-1 rounded-md border border-border bg-background px-4 py-3 whitespace-nowrap shadow-md">
            {detail}
          </div>
        </div>
      ) : null}
    </div>
  )
}
