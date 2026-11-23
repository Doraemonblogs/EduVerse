// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FloatingItem } from '@/components/layout/floating-item'

/**
 * 桌面悬浮栏的悬停 / 聚焦详情（WCAG 1.4.13）：可移入、可用 Esc 关闭、离开后再次进入重新显示。
 */
afterEach(cleanup)

function renderItem() {
  render(
    <>
      <FloatingItem
        icon={<span aria-hidden>☎</span>}
        label="电话"
        href="tel:4000000000"
        detail={<span>400-000-0000</span>}
      />
      <button type="button">页面其它按钮</button>
    </>,
  )
  const trigger = screen.getByRole('link', { name: '电话' })
  const tooltip = screen.getByRole('tooltip', { hidden: true })
  const item = trigger.parentElement
  if (!item) throw new Error('找不到悬浮项容器')
  return { trigger, tooltip, item }
}

const isOpen = (tooltip: HTMLElement) => tooltip.getAttribute('data-state') === 'open'

async function pressEscape() {
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
  })
}

describe('悬浮栏详情浮层', () => {
  it('详情通过 aria-describedby 关联到按钮，默认收起', () => {
    const { trigger, tooltip } = renderItem()
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id)
    expect(isOpen(tooltip)).toBe(false)
  })

  it('悬停显示；指针从按钮移到详情上时保持显示，离开整项后收起', () => {
    const { trigger, tooltip, item } = renderItem()
    fireEvent.pointerOver(trigger)
    expect(isOpen(tooltip)).toBe(true)

    // 指针移到详情上（仍在这一项内部）：不触发离开
    fireEvent.pointerOut(trigger, { relatedTarget: tooltip })
    fireEvent.pointerOver(tooltip, { relatedTarget: trigger })
    expect(isOpen(tooltip)).toBe(true)
    // 详情本身可以接收指针（不是 pointer-events: none），否则移上去就会消失
    expect(tooltip.className).not.toMatch(/pointer-events-none/)

    fireEvent.pointerOut(item, { relatedTarget: document.body })
    expect(isOpen(tooltip)).toBe(false)
  })

  it('仅悬停（焦点不在这里）时按 Esc 可关闭；移出后再次悬停重新显示', async () => {
    const { trigger, tooltip, item } = renderItem()
    fireEvent.pointerOver(trigger)
    expect(isOpen(tooltip)).toBe(true)

    await pressEscape()
    expect(isOpen(tooltip)).toBe(false)

    fireEvent.pointerOut(item, { relatedTarget: document.body })
    fireEvent.pointerOver(trigger, { relatedTarget: document.body })
    expect(isOpen(tooltip)).toBe(true)
  })

  it('键盘聚焦显示，按 Esc 收起且焦点留在按钮上；焦点离开后再次聚焦重新显示', async () => {
    const { trigger, tooltip } = renderItem()
    act(() => trigger.focus())
    expect(isOpen(tooltip)).toBe(true)

    await pressEscape()
    expect(isOpen(tooltip)).toBe(false)
    expect(document.activeElement).toBe(trigger)

    act(() => screen.getByRole('button', { name: '页面其它按钮' }).focus())
    act(() => trigger.focus())
    expect(isOpen(tooltip)).toBe(true)
  })
})
