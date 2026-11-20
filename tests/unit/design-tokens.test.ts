import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/a11y/contrast'
import { CONTRAST_PAIRS, SURFACES, type Surface } from '@/styles/contrast-pairs'

const css = readFileSync(path.resolve(__dirname, '../../src/styles/globals.css'), 'utf8')

/** 取出某个选择器后的 { ... } 内容（支持嵌套花括号） */
function extractBlock(source: string, selector: RegExp): string {
  const match = selector.exec(source)
  if (!match) throw new Error(`找不到选择器：${selector}`)
  const start = source.indexOf('{', match.index)
  let depth = 0
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++
    if (source[i] === '}') depth--
    if (depth === 0) return source.slice(start + 1, i)
  }
  throw new Error(`花括号不匹配：${selector}`)
}

function parseDeclarations(block: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const m of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    result[m[1]!] = m[2]!.trim()
  }
  return result
}

const primitives = parseDeclarations(extractBlock(css, /@theme\s+static\s*\{/))
const semantic: Record<Surface, Record<string, string>> = (() => {
  const root = parseDeclarations(
    extractBlock(css, /:root,\s*\.surface-light,\s*\.surface-paper\s*\{/),
  )
  return {
    light: root,
    paper: { ...root, ...parseDeclarations(extractBlock(css, /\n\.surface-paper\s*\{/)) },
    dark: { ...root, ...parseDeclarations(extractBlock(css, /\n\.surface-dark\s*\{/)) },
  }
})()

function resolve(surface: Surface, name: string): string {
  const raw = semantic[surface][name]
  if (!raw) throw new Error(`语义令牌 --${name} 未定义（${surface}）`)
  const ref = /^var\(--([\w-]+)\)$/.exec(raw)
  const value = ref ? primitives[ref[1]!] : raw
  if (!value || !value.startsWith('#')) {
    throw new Error(`--${name}（${surface}）无法解析为十六进制颜色：${raw}`)
  }
  return value
}

describe('设计令牌', () => {
  it('品牌主色为电光橙 #FF5B14', () => {
    expect(primitives['color-brand-500']).toBe('#ff5b14')
  })

  it('正文字号 16px、行高 1.7', () => {
    expect(primitives['text-base']).toBe('1rem')
    expect(primitives['text-base--line-height']).toBe('1.7')
  })

  it('不使用 Google Fonts 等境外字体服务', () => {
    expect(css).not.toMatch(/fonts\.googleapis|fonts\.gstatic/)
  })

  for (const surface of SURFACES) {
    describe(`${surface} 区块对比度（WCAG AA）`, () => {
      for (const pair of CONTRAST_PAIRS) {
        it(`${pair.label}：--${pair.foreground} / --${pair.background} ≥ ${pair.min}`, () => {
          const ratio = contrastRatio(
            resolve(surface, pair.foreground),
            resolve(surface, pair.background),
          )
          expect(
            ratio,
            `${surface} · ${pair.label} 实际 ${ratio.toFixed(2)}`,
          ).toBeGreaterThanOrEqual(pair.min)
        })
      }
    })
  }
})
