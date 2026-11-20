import * as React from 'react'

import { cn } from '@/lib/utils'

const sizes = {
  site: 'container-site',
  wide: 'container-wide',
  prose: 'container-prose',
} as const

type ContainerProps = React.HTMLAttributes<HTMLElement> & {
  size?: keyof typeof sizes
  as?: 'div' | 'header' | 'footer' | 'nav' | 'article'
}

/** 版心：统一最大宽度与左右留白（390px 下 16px，1440px 下 40px） */
export function Container({ size = 'site', as: Tag = 'div', className, ...props }: ContainerProps) {
  return <Tag className={cn(sizes[size], className)} {...props} />
}
