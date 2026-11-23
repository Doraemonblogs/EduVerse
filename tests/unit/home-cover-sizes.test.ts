import { describe, expect, it } from 'vitest'

import { coverScale, coverSizes, type CoverFrame } from '@/lib/home/cover-sizes'

/**
 * object-cover 铺满固定宽高比框的图片：按图片宽高比放大 sizes，
 * 保证浏览器挑到的 srcset 候选不小于实际绘制宽度（首页主视觉 LCP 图不被拉伸）。
 */

const BANNER = { width: 1920, height: 800 } // 12:5 横幅
const PORTRAIT = { width: 750, height: 1000 } // 3:4 竖图

/** 与首页主视觉一致的框（src/components/home/top/hero-carousel.tsx） */
const DESKTOP: CoverFrame[] = [
  { minWidth: 1360, ratio: 12 / 5, width: { px: 1280 } },
  { minWidth: 1280, ratio: 12 / 5, width: { vw: 92 } },
  { minWidth: 1024, ratio: 2, width: { vw: 92 } },
  { minWidth: 768, ratio: 16 / 10, width: { vw: 95 } },
  { minWidth: 640, ratio: 3 / 2, width: { vw: 95 } },
]
const MOBILE: CoverFrame[] = [{ minWidth: 0, ratio: 4 / 5, width: { vw: 95 } }]

describe('coverScale', () => {
  it('图片比框扁时，绘制宽度 = 框宽 × 图片宽高比 ÷ 框宽高比', () => {
    expect(coverScale(BANNER, 4 / 5)).toBeCloseTo(3)
    expect(coverScale(BANNER, 3 / 2)).toBeCloseTo(1.6)
    expect(coverScale(BANNER, 2)).toBeCloseTo(1.2)
  })

  it('图片不比框扁时按框宽绘制（倍数为 1）', () => {
    expect(coverScale(BANNER, 12 / 5)).toBe(1)
    expect(coverScale(PORTRAIT, 4 / 5)).toBe(1)
    expect(coverScale({ width: 1920, height: 1080 }, 12 / 5)).toBe(1)
  })

  it('尺寸或宽高比不是正数时按 1 处理', () => {
    expect(coverScale({ width: 0, height: 800 }, 2)).toBe(1)
    expect(coverScale({ width: 1920, height: 0 }, 2)).toBe(1)
    expect(coverScale(BANNER, 0)).toBe(1)
  })
})

describe('coverSizes', () => {
  it('12:5 横幅：640–1279px 的框比图高，sizes 按裁切放大；≥ 1280px 与框同比例，不放大', () => {
    expect(coverSizes(BANNER, DESKTOP)).toBe(
      '(min-width: 1360px) 1280px, (min-width: 1280px) 92vw, (min-width: 1024px) 111vw, (min-width: 768px) 143vw, 152vw',
    )
  })

  it('移动端竖框：竖图按框宽；没有竖图、回退到横幅时放大到约 3 倍框宽', () => {
    expect(coverSizes(PORTRAIT, MOBILE)).toBe('95vw')
    expect(coverSizes(BANNER, MOBILE)).toBe('285vw')
  })

  it('浮点误差不进位（95 × 1.6 = 152，而不是 153）', () => {
    expect(coverSizes(BANNER, [{ minWidth: 0, ratio: 3 / 2, width: { vw: 95 } }])).toBe('152vw')
  })

  it('断点顺序无关；相邻断点长度相同时只保留较小的断点', () => {
    const wide = { width: 1920, height: 1080 } // 16:9：≥ 1024px 的框都不比它高
    expect(coverSizes(wide, [...DESKTOP].reverse())).toBe(
      '(min-width: 1360px) 1280px, (min-width: 1024px) 92vw, (min-width: 768px) 106vw, 113vw',
    )
  })

  it('固定像素宽度同样按裁切放大', () => {
    expect(coverSizes(BANNER, [{ minWidth: 0, ratio: 2, width: { px: 1000 } }])).toBe('1200px')
  })
})
