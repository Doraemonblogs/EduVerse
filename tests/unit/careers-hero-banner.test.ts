import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { CAREERS_HERO_SCRIM_CLASS } from '@/components/careers/careers-layout'
import { contrastRatio, WCAG_AA } from '@/lib/a11y/contrast'
import {
  liveCareersHeroBanner,
  toCareersHeroBanner,
  type CareersHeroBannerSource,
} from '@/lib/careers/mappers'
import { CAREERS_PATH } from '@/lib/careers/paths'
import type { Media } from '@/payload-types'

/**
 * 就业服务页首屏背景图（后台「轮播图」投放位置 = 就业服务页顶部）：
 * 轮播图 → 视图模型、渲染时按投放时间窗挑选，以及石墨遮罩在任何背景图上都保证首屏文字的对比度。
 * 组件输出见 tests/unit/careers-page.test.tsx，真实页面见 tests/e2e/careers.e2e.spec.ts。
 */

function media(name: string, width: number, height: number): Media {
  return {
    id: width,
    alt: `${name}的替代文字`,
    url: `/api/media/file/${name}.jpg`,
    width,
    height,
    sizes: { hero: { url: `/api/media/file/${name}-${width}x${height}.webp`, width, height } },
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdAt: '2026-11-01T00:00:00.000Z',
  }
}

function source(overrides: Partial<CareersHeroBannerSource> = {}): CareersHeroBannerSource {
  return {
    id: 4,
    image: media('careers', 1920, 800),
    mobileImage: media('careers-mobile', 750, 1000),
    startAt: null,
    endAt: null,
    ...overrides,
  }
}

describe('首屏背景图的视图模型', () => {
  it('桌面图与移动端图都取 hero 尺寸；投放时间窗原样保留', () => {
    expect(
      toCareersHeroBanner(
        source({ startAt: '2026-11-01T00:00:00.000Z', endAt: '2026-12-01T00:00:00.000Z' }),
      ),
    ).toEqual({
      id: 4,
      image: {
        src: '/api/media/file/careers-1920x800.webp',
        alt: 'careers的替代文字',
        width: 1920,
        height: 800,
      },
      mobileImage: {
        src: '/api/media/file/careers-mobile-750x1000.webp',
        alt: 'careers-mobile的替代文字',
        width: 750,
        height: 1000,
      },
      startAt: '2026-11-01T00:00:00.000Z',
      endAt: '2026-12-01T00:00:00.000Z',
    })
  })

  it('没有移动端图时用桌面图；桌面图未填充时不展示', () => {
    const banner = toCareersHeroBanner(source({ mobileImage: null }))
    expect(banner?.mobileImage).toEqual(banner?.image)
    expect(toCareersHeroBanner(source({ image: 12 }))).toBeNull()
  })
})

describe('渲染时挑选投放中的背景图', () => {
  const now = new Date('2026-11-23T04:00:00.000Z')
  const banner = (id: number, startAt: string | null, endAt: string | null) => ({
    id,
    startAt,
    endAt,
  })

  it('按后台排序取第一张在时间窗内的（已结束 / 未开始的跳过）', () => {
    const ended = banner(1, null, '2026-11-23T03:59:59.000Z')
    const upcoming = banner(2, '2026-11-24T00:00:00.000Z', null)
    const live = banner(3, '2026-11-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z')
    const alsoLive = banner(4, null, null)
    expect(liveCareersHeroBanner([ended, upcoming, live, alsoLive], now)).toBe(live)
  })

  it('开始时间那一刻起展示，结束时间那一刻起不再展示；都不在时间窗内时为 null（纯深色首屏）', () => {
    expect(liveCareersHeroBanner([banner(1, now.toISOString(), null)], now)?.id).toBe(1)
    expect(liveCareersHeroBanner([banner(1, null, now.toISOString())], now)).toBeNull()
    expect(liveCareersHeroBanner([], now)).toBeNull()
  })
})

describe('首屏石墨遮罩的对比度', () => {
  const css = readFileSync(path.resolve(__dirname, '../../src/styles/globals.css'), 'utf8')

  /** 选择器后 { … } 里的 --name: value 声明 */
  function declarations(selector: RegExp): Record<string, string> {
    const match = selector.exec(css)
    if (!match) throw new Error(`找不到选择器：${selector}`)
    const block = css.slice(match.index, css.indexOf('}', match.index))
    return Object.fromEntries(
      [...block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]),
    )
  }

  const primitives = declarations(/@theme\s+static\s*\{/)
  const dark = declarations(/\n\.surface-dark\s*\{/)
  const hex = (name: string) => {
    const ref = /^var\(--([\w-]+)\)$/.exec(dark[name] ?? '')
    const value = ref ? primitives[ref[1]!] : dark[name]
    if (!value?.startsWith('#')) throw new Error(`深色区块的 --${name} 无法解析：${dark[name]}`)
    return value
  }

  /** 深色区块底色以 opacity% 压在纯白图片上（最坏情况）得到的颜色 */
  function scrimOverWhite(opacity: number): string {
    const base = hex('background')
    const channels = [1, 3, 5].map((i) => {
      const value = Number.parseInt(base.slice(i, i + 2), 16)
      return Math.round((value * opacity) / 100 + 255 * (1 - opacity / 100))
    })
    return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`
  }

  /** 文字所在区域的遮罩不透明度（右侧露出图片的 to-* 色标不压文字，不计入） */
  const textOpacities = (classes: string) =>
    [...classes.matchAll(/(?:^|\s)(?:lg:)?(?:bg|from|via)-background\/(\d+)/g)].map((m) =>
      Number(m[1]),
    )

  it.each(Object.entries(CAREERS_HERO_SCRIM_CLASS))(
    '%s：文字下方的遮罩压在纯白图片上，次要文字与正文仍达到 WCAG AA',
    (_, classes) => {
      const opacities = textOpacities(classes)
      expect(opacities.length).toBeGreaterThan(0)
      for (const opacity of opacities) {
        const background = scrimOverWhite(opacity)
        expect(contrastRatio(hex('muted-foreground'), background)).toBeGreaterThanOrEqual(
          WCAG_AA.text,
        )
        expect(contrastRatio(hex('foreground'), background)).toBeGreaterThanOrEqual(WCAG_AA.text)
      }
    },
  )

  it('两栏遮罩在 55% 处之前保持文字区域的不透明度（文字栏不超过首屏宽度的 55%，e2e 实测）', () => {
    expect(CAREERS_HERO_SCRIM_CLASS.split).toMatch(/(?:^|\s)lg:via-55%(?:\s|$)/)
  })

  it('页面路径', () => {
    expect(CAREERS_PATH).toBe('/careers')
  })
})
