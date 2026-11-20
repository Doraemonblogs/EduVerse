import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/utils'

describe('cn', () => {
  it('自定义字号令牌与颜色类可以共存', () => {
    expect(cn('text-h2', 'text-foreground')).toBe('text-h2 text-foreground')
    expect(cn('text-display', 'text-muted-foreground')).toBe('text-display text-muted-foreground')
  })

  it('自定义字号令牌之间按后者覆盖', () => {
    expect(cn('text-h2', 'text-h1')).toBe('text-h1')
    expect(cn('text-base', 'text-h3')).toBe('text-h3')
  })

  it('自定义间距令牌参与冲突合并', () => {
    expect(cn('py-section', 'py-4')).toBe('py-4')
    expect(cn('px-4', 'px-gutter')).toBe('px-gutter')
  })

  it('处理条件类名', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c')
  })
})

describe('cn 与 globals.css 令牌同步', () => {
  const css = readFileSync(path.resolve(__dirname, '../../src/styles/globals.css'), 'utf8')
  const textTokens = [...css.matchAll(/^\s*--text-([\w-]+?):/gm)]
    .map((m) => m[1]!)
    .filter((name) => !name.includes('--'))
  const spacingTokens = [...css.matchAll(/^\s*--spacing-([\w-]+?):/gm)].map((m) => m[1]!)

  it.each(textTokens)('字号令牌 text-%s 不会被颜色类吞掉', (name) => {
    expect(cn(`text-${name}`, 'text-foreground')).toContain(`text-${name}`)
  })

  it.each(spacingTokens)('间距令牌 %s 能参与 padding 冲突合并', (name) => {
    expect(cn(`p-${name}`, 'p-4')).toBe('p-4')
  })
})
