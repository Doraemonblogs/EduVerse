import * as React from 'react'

import { cn } from '@/lib/utils'

/** 表单控件的共享样式：字号固定 16px，避免 iOS Safari 聚焦时自动放大页面 */
export const fieldClassName = cn(
  'w-full min-w-0 rounded-sm border border-input bg-field text-base text-foreground',
  'placeholder:text-subtle-foreground',
  'transition-colors duration-150',
  'focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring',
  'aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldClassName, 'h-11 px-3.5', className)}
      {...props}
    />
  )
}

export { Input }
