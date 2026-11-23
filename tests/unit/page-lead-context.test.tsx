// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'

/**
 * 页面级留资上下文：课程 / 专业页声明 courseId、disciplineId，全站弹窗打开时作为默认值合并进来；
 * 显式传入的值优先；离开页面（卸载）后清除。
 */
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const { LeadDialogProvider, useLeadDialog } = await import('@/components/lead/lead-dialog')
const { PageLeadContext, getPageLeadContext, mergePageLeadContext, usePageLeadContext } =
  await import('@/components/lead/page-lead-context')

const config: LeadFormConfig = {
  disciplines: [
    { id: 7, name: '三维动画' },
    { id: 8, name: '游戏美术' },
  ],
  cities: [],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

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

describe('mergePageLeadContext', () => {
  it('没有页面上下文时原样返回', () => {
    const props = { position: 'header_cta', intent: 'trial' as const }
    expect(mergePageLeadContext(props, null)).toEqual(props)
  })

  it('页面上下文作为默认值补上 courseId / disciplineId，position 与 intent 不变', () => {
    expect(
      mergePageLeadContext(
        { position: 'mobile_action_bar', intent: 'consult' },
        { courseId: 3, disciplineId: 7 },
      ),
    ).toEqual({ position: 'mobile_action_bar', intent: 'consult', courseId: 3, disciplineId: 7 })
  })

  it('显式给出的值优先（逐个字段合并）', () => {
    expect(
      mergePageLeadContext(
        { position: 'course_card', courseId: 9 },
        { courseId: 3, disciplineId: 7 },
      ),
    ).toEqual({ position: 'course_card', courseId: 9, disciplineId: 7 })
    expect(
      mergePageLeadContext(
        { position: 'course_card', courseId: 9, disciplineId: 8 },
        { courseId: 3, disciplineId: 7 },
      ),
    ).toEqual({ position: 'course_card', courseId: 9, disciplineId: 8 })
  })

  it('页面只声明了专业方向时不会凭空加上 courseId', () => {
    expect(mergePageLeadContext({ position: 'header_cta' }, { disciplineId: 7 })).toEqual({
      position: 'header_cta',
      disciplineId: 7,
    })
  })
})

function Probe() {
  const context = usePageLeadContext()
  return <output data-testid="probe">{JSON.stringify(context)}</output>
}

describe('PageLeadContext', () => {
  it('挂载时写入、卸载时清除，并通知订阅者', () => {
    const { rerender } = render(
      <>
        <Probe />
        <PageLeadContext courseId={3} disciplineId={7} />
      </>,
    )
    expect(getPageLeadContext()).toEqual({ courseId: 3, disciplineId: 7 })
    expect(screen.getByTestId('probe').textContent).toBe('{"courseId":3,"disciplineId":7}')

    rerender(<Probe />)
    expect(getPageLeadContext()).toBeNull()
    expect(screen.getByTestId('probe').textContent).toBe('null')
  })

  it('同时挂载两个时以后挂载的为准，卸载后恢复前一个（客户端导航的挂载顺序不固定）', () => {
    const { rerender } = render(
      <>
        <PageLeadContext key="a" disciplineId={7} />
        <PageLeadContext key="b" courseId={4} disciplineId={8} />
      </>,
    )
    expect(getPageLeadContext()).toEqual({ courseId: 4, disciplineId: 8 })
    rerender(<PageLeadContext key="a" disciplineId={7} />)
    expect(getPageLeadContext()).toEqual({ courseId: undefined, disciplineId: 7 })
    rerender(<></>)
    expect(getPageLeadContext()).toBeNull()
  })

  it('属性变化时更新', () => {
    const { rerender } = render(<PageLeadContext courseId={3} disciplineId={7} />)
    rerender(<PageLeadContext courseId={5} disciplineId={7} />)
    expect(getPageLeadContext()).toEqual({ courseId: 5, disciplineId: 7 })
  })
})

function Opener({ courseId }: { courseId?: number }) {
  const { open } = useLeadDialog()
  return (
    <button type="button" onClick={() => open({ position: 'mobile_action_bar', courseId })}>
      打开弹窗
    </button>
  )
}

async function openDialog() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '打开弹窗' }))
  })
  return screen.getByRole('dialog')
}

describe('LeadDialogProvider 合并页面上下文', () => {
  it('课程页上打开全站弹窗：表单带上课程（隐藏字段）并预选专业方向', async () => {
    render(
      <LeadDialogProvider config={config}>
        <Opener />
        <PageLeadContext courseId={3} disciplineId={8} />
      </LeadDialogProvider>,
    )
    const dialog = await openDialog()
    const form = dialog.querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="course"]')?.value).toBe('3')
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'mobile_action_bar',
    )
    expect(form.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe('8')
  })

  it('离开课程页后打开：不再带课程', async () => {
    const { rerender } = render(
      <LeadDialogProvider config={config}>
        <Opener />
        <PageLeadContext courseId={3} disciplineId={8} />
      </LeadDialogProvider>,
    )
    rerender(
      <LeadDialogProvider config={config}>
        <Opener />
      </LeadDialogProvider>,
    )
    const dialog = await openDialog()
    expect(dialog.querySelector('input[name="course"]')).toBeNull()
    expect(dialog.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe('')
  })

  it('按钮显式传入的课程优先于页面上下文', async () => {
    render(
      <LeadDialogProvider config={config}>
        <Opener courseId={11} />
        <PageLeadContext courseId={3} disciplineId={8} />
      </LeadDialogProvider>,
    )
    const dialog = await openDialog()
    expect(dialog.querySelector<HTMLInputElement>('input[name="course"]')?.value).toBe('11')
  })
})
