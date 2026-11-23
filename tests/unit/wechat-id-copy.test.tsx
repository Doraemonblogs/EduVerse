// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { COPIED_RESET_MS, WechatIdCopy } from '@/components/lead/wechat-id-copy'
import { zh } from '@/i18n/zh'

/** 复制微信号：成功 / 失败都有反馈（读屏可感知），“已复制”不会一直停留 */
const t = zh.lead.success

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.getSelection()?.removeAllRanges()
})

function stubClipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal('navigator', { ...window.navigator, clipboard: { writeText } })
}

async function clickCopy() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: t.copy }))
  })
}

describe('复制微信号', () => {
  it('复制成功：按钮显示“已复制”，状态区播报结果，2 秒后恢复为“复制”', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn(async () => {})
    stubClipboard(writeText)
    render(<WechatIdCopy wechatId="eduverse_cs" />)

    await clickCopy()
    expect(writeText).toHaveBeenCalledWith('eduverse_cs')
    expect(screen.getByRole('button', { name: t.copied })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe(t.copySucceeded)

    act(() => {
      vi.advanceTimersByTime(COPIED_RESET_MS)
    })
    expect(screen.getByRole('button', { name: t.copy })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('剪贴板写入被拒绝时：提示手动复制，并自动选中微信号', async () => {
    stubClipboard(async () => {
      throw new DOMException('denied', 'NotAllowedError')
    })
    render(<WechatIdCopy wechatId="eduverse_cs" />)

    await clickCopy()
    expect(screen.getByRole('status').textContent).toBe(t.copyFailed)
    expect(window.getSelection()?.toString()).toBe('eduverse_cs')
    expect(screen.getByRole('button', { name: t.copy })).toBeTruthy()
  })

  it('浏览器没有剪贴板 API（非安全来源 / 内嵌浏览器）时同样给出失败提示', async () => {
    vi.stubGlobal('navigator', { ...window.navigator, clipboard: undefined })
    render(<WechatIdCopy wechatId="eduverse_cs" />)

    await clickCopy()
    expect(screen.getByRole('status').textContent).toBe(t.copyFailed)
  })

  it('重新挂载（弹窗关闭后再打开）时不会沿用上次的“已复制”', async () => {
    stubClipboard(async () => {})
    const { unmount } = render(<WechatIdCopy wechatId="eduverse_cs" />)
    await clickCopy()
    expect(screen.getByRole('button', { name: t.copied })).toBeTruthy()

    unmount()
    render(<WechatIdCopy wechatId="eduverse_cs" />)
    expect(screen.getByRole('button', { name: t.copy })).toBeTruthy()
  })
})
