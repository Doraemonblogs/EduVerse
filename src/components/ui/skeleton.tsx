import * as React from 'react'

import { cn } from '@/lib/utils'

/** 加载占位。对读屏隐藏，由外层容器提供 aria-busy / 加载提示。 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn('animate-pulse rounded-sm bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }
