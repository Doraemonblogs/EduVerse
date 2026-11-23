// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { HeroCarouselFrame } from '@/components/home/top/hero-carousel-frame'

/**
 * 首页主视觉轮播控件的触控尺寸（R6）：< md 暂停 / 播放、上一张 / 下一张、圆点都是 44px 触控目标，≥ md 收为 36px；
 * < sm 不显示装饰性页码，圆点超过 4 个时隐藏上一张 / 下一张，360px 宽一行放得下。
 * jsdom 没有布局，这里只校验断点类名；实际尺寸与“一行放得下”由首页 e2e 在 360 / 390px 下测量。
 * 自动轮播、键盘等行为见 home-top-carousel.test.tsx。
 */

afterEach(cleanup)

function renderFrame(count: number) {
  const titles = Array.from({ length: count }, (_, index) => `第 ${index + 1} 张标题`)
  render(
    <HeroCarouselFrame titles={titles} autoplay intervalMs={6000} focusableTrack={false}>
      {titles.map((title) => (
        <div key={title}>{title}</div>
      ))}
    </HeroCarouselFrame>,
  )
  return titles
}

const classesOf = (element: Element) => element.className.split(/\s+/)

describe('HeroCarouselFrame（控件尺寸）', () => {
  it('暂停 / 上一张 / 下一张：< md 为 44px，≥ md 收为 36px', () => {
    renderFrame(3)
    for (const name of ['暂停自动轮播', '上一张', '下一张']) {
      const classes = classesOf(screen.getByRole('button', { name }))
      expect(classes, name).toContain('size-11')
      expect(classes, name).toContain('md:size-9')
      expect(classes, name).not.toContain('size-9')
    }
  })

  it('圆点：< md 至少 44px 宽高，≥ md 恢复 36px 高的紧凑圆点', () => {
    const titles = renderFrame(3)
    const dots = within(screen.getByRole('group', { name: '选择轮播图' })).getAllByRole('button')
    expect(dots).toHaveLength(titles.length)
    for (const dot of dots) {
      expect(classesOf(dot)).toEqual(
        expect.arrayContaining(['h-11', 'min-w-11', 'justify-center', 'md:h-9', 'md:min-w-0']),
      )
    }
  })

  it('< sm 不显示装饰性页码，上一张 / 下一张推到行尾', () => {
    renderFrame(4)
    const counter = document.querySelector('p[aria-hidden]')!
    expect(counter.textContent).toBe('01 / 04')
    expect(classesOf(counter)).toEqual(expect.arrayContaining(['hidden', 'sm:block']))
    const arrows = screen.getByRole('button', { name: '下一张' }).parentElement!
    expect(classesOf(arrows)).toEqual(expect.arrayContaining(['ml-auto', 'sm:ml-0']))
    expect(classesOf(arrows)).not.toContain('max-sm:hidden')
  })

  it('圆点超过 4 个时 < sm 隐藏上一张 / 下一张（圆点与滑动仍可切换），≥ sm 照常显示', () => {
    renderFrame(5)
    const arrows = screen.getByRole('button', { name: '下一张' }).parentElement!
    expect(classesOf(arrows)).toContain('max-sm:hidden')
    expect(
      within(screen.getByRole('group', { name: '选择轮播图' })).getAllByRole('button'),
    ).toHaveLength(5)
  })
})
