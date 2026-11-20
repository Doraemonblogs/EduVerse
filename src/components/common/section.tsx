import * as React from 'react'

import { cn } from '@/lib/utils'

const tones = {
  light: 'surface-light',
  paper: 'surface-paper',
  dark: 'surface-dark',
} as const

const spacings = {
  default: 'py-section',
  sm: 'py-section-sm',
  none: '',
} as const

export type SectionTone = keyof typeof tones

type SectionProps = React.HTMLAttributes<HTMLElement> & {
  /** 区块色调：浅色 / 米色 / 深色。深色区块内的组件会自动切换到深色语义令牌 */
  tone?: SectionTone
  spacing?: keyof typeof spacings
  as?: 'section' | 'div' | 'aside'
}

/** 页面区块：负责背景色调与上下留白，内容宽度交给 <Container> */
export function Section({
  tone = 'light',
  spacing = 'default',
  as: Tag = 'section',
  className,
  ...props
}: SectionProps) {
  return <Tag className={cn(tones[tone], spacings[spacing], className)} {...props} />
}
