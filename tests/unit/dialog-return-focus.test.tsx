// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

/**
 * 弹窗关闭后的焦点归还：没有 <DialogTrigger> 的弹窗（全站留资弹窗、微信弹窗）由任意按钮通过状态打开，
 * 打开前的焦点元素被卸载时（如移动端菜单抽屉里的按钮），退回到调用方提供的元素。
 */
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const { LeadDialogProvider, useLeadDialog } = await import('@/components/lead/lead-dialog')

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Harness({ showOpener, withFallback }: { showOpener: boolean; withFallback: boolean }) {
  const [open, setOpen] = useState(false)
  const fallbackRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={fallbackRef} type="button">
        菜单
      </button>
      {showOpener ? (
        <button type="button" onClick={() => setOpen(true)}>
          打开
        </button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent returnFocusFallbackRef={withFallback ? fallbackRef : undefined}>
          <DialogTitle>标题</DialogTitle>
          <DialogDescription>说明</DialogDescription>
          <input aria-label="输入框" />
        </DialogContent>
      </Dialog>
    </>
  )
}

async function openFrom(name: string) {
  const opener = screen.getByRole('button', { name })
  opener.focus()
  await act(async () => {
    fireEvent.click(opener)
  })
  expect(screen.getByRole('dialog')).toBeTruthy()
}

async function pressEscape() {
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
  })
  expect(screen.queryByRole('dialog')).toBeNull()
}

/** Radix 在焦点区域卸载后的下一个宏任务里归还焦点，需要等待 */
async function expectFocused(element: HTMLElement) {
  await waitFor(() => expect(document.activeElement).toBe(element))
}

describe('弹窗关闭后的焦点归还', () => {
  it('打开弹窗的按钮仍在页面上时，焦点回到该按钮', async () => {
    render(<Harness showOpener withFallback />)
    await openFrom('打开')
    await pressEscape()
    await expectFocused(screen.getByRole('button', { name: '打开' }))
  })

  it('打开弹窗的按钮已被卸载时，焦点退回到调用方提供的元素', async () => {
    const { rerender } = render(<Harness showOpener withFallback />)
    await openFrom('打开')
    rerender(<Harness showOpener={false} withFallback />)
    await pressEscape()
    await expectFocused(screen.getByRole('button', { name: '菜单' }))
  })

  it('全站留资弹窗：从会被卸载的按钮打开并传入退路时，关闭后焦点回到退路元素', async () => {
    const config: LeadFormConfig = {
      disciplines: [],
      cities: [],
      successTitle: '提交成功',
      successMessage: '',
      wechatId: null,
      wechatQr: null,
      hotline: null,
    }

    function MenuLike() {
      const { open } = useLeadDialog()
      const triggerRef = useRef<HTMLButtonElement>(null)
      const [menuOpen, setMenuOpen] = useState(true)
      return (
        <>
          <button ref={triggerRef} type="button">
            打开菜单
          </button>
          {menuOpen ? (
            <button
              type="button"
              onClick={() => {
                open({ position: 'mobile_menu' }, { returnFocus: triggerRef.current })
              }}
            >
              菜单里的预约按钮
            </button>
          ) : null}
          <button type="button" onClick={() => setMenuOpen(false)}>
            收起菜单
          </button>
        </>
      )
    }

    render(
      <LeadDialogProvider config={config}>
        <MenuLike />
      </LeadDialogProvider>,
    )
    await openFrom('菜单里的预约按钮')
    // 模拟抽屉关闭动画结束后，菜单里的按钮被卸载（弹窗外的元素在打开期间对读屏隐藏，直接触发点击）
    await act(async () => {
      fireEvent.click(screen.getByText('收起菜单'))
    })
    expect(screen.queryByText('菜单里的预约按钮')).toBeNull()
    await pressEscape()
    await expectFocused(screen.getByText('打开菜单'))
  })
})
