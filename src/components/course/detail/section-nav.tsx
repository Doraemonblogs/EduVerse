'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import type { CourseDetailNavItem } from './sections'

type CourseSectionNavProps = {
  items: CourseDetailNavItem[]
  /** <nav> 的无障碍名称 */
  label: string
  className?: string
}

/**
 * 当前区块的判定线：吸顶头部（64px）+ 本导航（48px）下方再留 48px。
 * 锚点跳转后区块顶端停在约 144px 处（html scroll-padding-top 80px + 区块 scroll-margin-top 64px），正好越过这条线。
 */
const ACTIVE_LINE = 160

/** 顶端已越过判定线的最后一个区块；都还没越过（首屏）时为 null */
function currentSection(order: readonly string[]): string | null {
  let current: string | null = null
  for (const id of order) {
    const top = document.getElementById(id)?.getBoundingClientRect().top
    if (top !== undefined && top <= ACTIVE_LINE) current = id
  }
  return current
}

/**
 * 课程详情页内导航：锚点链接到页面上有内容的区块（服务端已过滤）。
 * 桌面端在主栏顶部吸顶（紧贴头部下沿），移动端横向滚动、不吸顶。
 *
 * 链接本身无需 JS；水合后监听滚动（每帧最多计算一次）标出当前阅读的区块（aria-current + 下划线），
 * 属于渐进增强。
 */
export function CourseSectionNav({ items, label, className }: CourseSectionNavProps) {
  const [active, setActive] = useState<string | null>(null)
  const ids = items.map((item) => item.id).join(' ')

  useEffect(() => {
    const order = ids.split(' ')
    let frame = 0
    const update = () => {
      frame = 0
      setActive(currentSection(order))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [ids])

  return (
    <nav
      aria-label={label}
      className={cn('z-20 border-b border-border bg-background lg:sticky lg:top-16', className)}
    >
      <ul role="list" className="-mb-px flex overflow-x-auto">
        {items.map((item) => {
          const current = item.id === active
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={current ? 'true' : undefined}
                className={cn(
                  'flex h-12 items-center border-b-2 px-3 text-[15px] font-medium whitespace-nowrap transition-colors focus-visible:-outline-offset-2 md:px-4',
                  current
                    ? 'border-emphasis text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
