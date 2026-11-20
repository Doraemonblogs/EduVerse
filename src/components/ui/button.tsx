import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * 按钮
 * - primary：品牌橙 CTA（预约试听、提交等转化动作），每屏建议只出现 1–2 个
 * - secondary：石墨实心，次级动作
 * - outline / ghost：低强调
 * - link：行内文字链接
 * 默认尺寸 md 高 44px，满足移动端触控目标尺寸。
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm font-semibold whitespace-nowrap select-none',
    'transition-colors duration-150 ease-standard',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.125em]",
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        outline:
          'border border-input bg-transparent text-foreground hover:border-foreground hover:bg-accent hover:text-accent-foreground',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-emphasis underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3.5 text-sm',
        md: 'h-11 px-5 text-base',
        lg: 'h-13 px-7 text-lg',
        icon: 'size-11',
        'icon-sm': 'size-9',
      },
      block: {
        true: 'w-full',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** 以子元素（如 next/link 的 <Link>）渲染，保留按钮样式 */
    asChild?: boolean
  }

function Button({ className, variant, size, block, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? 'primary'}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants, type ButtonProps }
