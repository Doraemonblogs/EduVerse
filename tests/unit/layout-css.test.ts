import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 全站框架相关的全局样式：
 * - 页面开启 viewport-fit=cover 后，版心左右留白不小于刘海屏安全区；
 * - 弹窗入场动画只描述相对位移，不重复居中用的 -50%（否则会从左上方飞入）。
 */
const css = readFileSync(path.resolve(__dirname, '../../src/styles/globals.css'), 'utf8')
const layout = readFileSync(path.resolve(__dirname, '../../src/app/(frontend)/layout.tsx'), 'utf8')

/** 取出某个选择器后的 { ... } 内容（支持嵌套花括号） */
function block(selector: RegExp): string {
  const match = selector.exec(css)
  if (!match) throw new Error(`找不到：${selector}`)
  const start = css.indexOf('{', match.index)
  let depth = 0
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}') depth--
    if (depth === 0) return css.slice(start + 1, i)
  }
  throw new Error(`花括号不匹配：${selector}`)
}

describe('刘海屏安全区', () => {
  it('根布局开启了 viewport-fit=cover（因此左右安全区需要自行避让）', () => {
    expect(layout).toMatch(/viewportFit:\s*'cover'/)
  })

  it.each(['container-site', 'container-wide', 'container-prose'])(
    '%s 左右留白取常规留白与安全区中的较大值',
    (name) => {
      const body = block(new RegExp(`@utility\\s+${name}\\s*\\{`))
      expect(body).toMatch(
        /padding-left:\s*max\(var\(--spacing-gutter\),\s*env\(safe-area-inset-left[^)]*\)\)/,
      )
      expect(body).toMatch(
        /padding-right:\s*max\(var\(--spacing-gutter\),\s*env\(safe-area-inset-right[^)]*\)\)/,
      )
      // 不能再用只写常规留白的 padding-inline 覆盖掉安全区
      expect(body).not.toMatch(/padding-inline\s*:/)
    },
  )
})

describe('弹窗入场动画', () => {
  it('pop-in 只做 12px 上浮与轻微缩放，不包含居中用的 -50% 位移', () => {
    const keyframes = block(/@keyframes\s+pop-in\s*\{/)
    expect(keyframes).not.toContain('-50%')
    expect(keyframes).toMatch(/transform:\s*translateY\(12px\)\s*scale\(0\.98\)/)
  })
})
