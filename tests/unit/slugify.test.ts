import { describe, expect, it } from 'vitest'

import { SLUG_PATTERN, toSlug, validateSlug } from '@/lib/slugify'

describe('toSlug', () => {
  it('中文转无声调拼音，用连字符连接', () => {
    expect(toSlug('三维动画')).toBe('san-wei-dong-hua')
  })

  it('保留字母数字并转小写，混排时正确分隔', () => {
    expect(toSlug('UE5 实时美术提升班')).toBe('ue5-shi-shi-mei-shu-ti-sheng-ban')
    expect(toSlug('3D 动画')).toBe('3d-dong-hua')
  })

  it('去掉标点与多余连字符', () => {
    expect(toSlug('  作品集，怎么做？——入门篇!! ')).toBe('zuo-pin-ji-zen-me-zuo-ru-men-pian')
  })

  it('全角字符先规范化', () => {
    expect(toSlug('ＵＩ设计')).toBe('ui-she-ji')
  })

  it('结果总是满足 slug 规则且不超过 80 个字符', () => {
    const long = toSlug('数字艺术'.repeat(40))
    expect(long.length).toBeLessThanOrEqual(80)
    expect(long).toMatch(SLUG_PATTERN)
  })
})

describe('validateSlug', () => {
  it('合法 slug 通过，空值交给 required 处理', () => {
    expect(validateSlug('3d-animation')).toBe(true)
    expect(validateSlug('')).toBe(true)
    expect(validateSlug(undefined)).toBe(true)
  })

  it('非法格式返回中文提示', () => {
    expect(validateSlug('3D-Animation')).toMatch(/小写/)
    expect(validateSlug('a--b')).toMatch(/小写/)
    expect(validateSlug('-a')).toMatch(/小写/)
    expect(validateSlug('中文')).toMatch(/小写/)
    expect(validateSlug('a'.repeat(81))).toMatch(/80/)
  })
})
