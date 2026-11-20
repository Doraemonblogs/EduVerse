import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * 标签：用于班型、授课方式、软件、文章分类等元信息。
 * 小圆角矩形（2px），刻意避免胶囊形“模板感”。
 */
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-xs px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap [&>svg]:size-3 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-foreground',
        outline: 'border border-border text-muted-foreground',
        emphasis: 'border border-current text-emphasis',
        inverse: 'bg-secondary text-secondary-foreground',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? 'neutral'}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
