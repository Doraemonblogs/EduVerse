import { describe, expect, it } from 'vitest'

import { contrastRatio, normalizeHex, relativeLuminance } from '@/lib/a11y/contrast'

describe('contrast', () => {
  it('黑白对比度为 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('相同颜色对比度为 1', () => {
    expect(contrastRatio('#ff5b14', '#ff5b14')).toBeCloseTo(1, 5)
  })

  it('与参数顺序无关', () => {
    expect(contrastRatio('#111317', '#f4f2ee')).toBeCloseTo(contrastRatio('#f4f2ee', '#111317'), 10)
  })

  it('支持 3 位简写', () => {
    expect(normalizeHex('#FFF')).toBe('#ffffff')
    expect(relativeLuminance('#fff')).toBeCloseTo(1, 5)
  })

  it('拒绝非法颜色值', () => {
    expect(() => normalizeHex('red')).toThrow()
    expect(() => normalizeHex('#12345')).toThrow()
  })

  it('白字在品牌橙上不达标（设计决策依据）', () => {
    expect(contrastRatio('#ffffff', '#ff5b14')).toBeLessThan(4.5)
  })
})
