import Link from 'next/link'
import type * as React from 'react'

import { campusPath } from '@/lib/campuses/paths'
import { cn } from '@/lib/utils'

type CampusLinkProps = {
  /** 已发布的校区（数据层保证：课程的开设校区、开班校区、讲师所在校区都只含已发布的） */
  campus: { slug: string }
  children: React.ReactNode
  className?: string
}

/**
 * 行内的校区链接（服务端组件）：链接到 /campuses/{slug}，带下划线（不只靠颜色区分），
 * 课程详情首屏 / 侧栏 / 开班计划、讲师详情的“所在校区”、就业服务页的举办校区共用。
 */
export function CampusLink({ campus, children, className }: CampusLinkProps) {
  return (
    <Link
      href={campusPath(campus.slug)}
      prefetch={false}
      className={cn(
        'rounded-xs underline decoration-muted-foreground underline-offset-4 transition-colors hover:decoration-foreground',
        className,
      )}
    >
      {children}
    </Link>
  )
}
