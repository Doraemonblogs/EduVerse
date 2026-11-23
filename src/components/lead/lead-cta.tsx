'use client'

import { Button, type ButtonProps } from '@/components/ui/button'

import { useLeadDialog } from './lead-dialog'
import type { LeadContextProps } from './types'

type LeadCTAProps = LeadContextProps &
  Pick<ButtonProps, 'variant' | 'size' | 'block' | 'className'> & {
    children: React.ReactNode
    'aria-label'?: string
  }

/** 打开留资弹窗的按钮。服务端组件可直接使用（props 均可序列化） */
export function LeadCTA({
  children,
  variant,
  size,
  block,
  className,
  'aria-label': ariaLabel,
  ...context
}: LeadCTAProps) {
  const { open } = useLeadDialog()
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      block={block}
      className={className}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      onClick={() => open(context)}
    >
      {children}
    </Button>
  )
}
