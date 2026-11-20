import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * 让 tailwind-merge 认识 globals.css 中自定义的设计令牌，
 * 否则 `text-h2`（字号）会被误判为颜色并与 `text-foreground` 冲突而被丢弃。
 * 新增 @theme 中的字号 / 间距令牌时，需同步在这里登记（有单元测试兜底）。
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'h1', 'h2', 'h3', 'h4'],
      spacing: ['gutter', 'section', 'section-sm'],
    },
  },
})

/** 合并 className：clsx 处理条件，tailwind-merge 去除冲突的 Tailwind 类。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
