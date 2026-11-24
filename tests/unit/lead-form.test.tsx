// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import { zh } from '@/i18n/zh'
import type { LeadActionState } from '@/lib/lead/actions'
import { leadSubmissionSchema } from '@/lib/validation/lead'

/**
 * 留资表单的客户端行为（jsdom）：Server Action 用 mock 代替，不连数据库。
 * 覆盖：Action 失败不崩溃、服务端报错不清空已填内容、焦点落在可见控件上、提交附带的防刷 / 来源字段。
 */
const submitLeadAction = vi.hoisted(() =>
  vi.fn<(previous: LeadActionState, formData: FormData) => Promise<LeadActionState>>(),
)

vi.mock('@/lib/lead/actions', () => ({ submitLeadAction }))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const { LeadForm } = await import('@/components/lead/lead-form')
const { LeadDialogProvider, useLeadDialog } = await import('@/components/lead/lead-dialog')

const t = zh.lead

const config: LeadFormConfig = {
  disciplines: [{ id: 1, name: '三维动画' }],
  cities: ['北京', '上海'],
  successTitle: '提交成功',
  successMessage: '课程顾问会尽快联系你',
  wechatId: null,
  wechatQr: null,
  hotline: '400-000-0000',
}

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  submitLeadAction.mockReset()
  // Radix 复选框用 ResizeObserver 测量隐藏的辅助 input，jsdom 没有实现
  vi.stubGlobal('ResizeObserver', NoopResizeObserver)
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderForm(props: Partial<React.ComponentProps<typeof LeadForm>> = {}) {
  render(<LeadForm config={config} variant="dialog" position="test_form" {...props} />)
}

function fillValidForm() {
  fireEvent.change(field(t.labels.name), { target: { value: '张同学' } })
  fireEvent.change(field(t.labels.phone), {
    target: { value: '138 0013 8000' },
  })
  fireEvent.change(field(t.labels.city), { target: { value: '北京' } })
  fireEvent.change(field(t.labels.message), { target: { value: '想了解周末班' } })
  fireEvent.click(screen.getByRole('checkbox'))
}

/** 必填字段的标签带有 * 标记，按包含文字匹配 */
function field<T extends HTMLElement = HTMLElement>(label: string): T {
  return screen.getByLabelText<T>(label, { exact: false })
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: t.submit }))
  })
}

/** 最近一次调用 Server Action 时提交的字段 */
function lastSubmitted(): Record<string, FormDataEntryValue> {
  const formData = submitLeadAction.mock.lastCall?.[1]
  if (!formData) throw new Error('Server Action 未被调用')
  return Object.fromEntries(formData.entries())
}

describe('留资表单', () => {
  it('Server Action 请求失败（reject）时显示通用错误提示，不抛到错误边界，已填写内容保留', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    submitLeadAction.mockRejectedValue(new TypeError('Failed to fetch'))
    renderForm()
    fillValidForm()
    await submit()

    expect(await screen.findByText(t.errors.generic)).toBeTruthy()
    expect(field<HTMLInputElement>(t.labels.name).value).toBe('张同学')
    expect(screen.getByRole('button', { name: t.submit })).toBeTruthy()
  })

  it('服务端返回错误时，已填写的姓名、手机号、城市、留言与同意勾选都保留', async () => {
    submitLeadAction.mockResolvedValue({ status: 'error', message: t.errors.tooFast })
    renderForm()
    fillValidForm()
    await submit()

    expect(await screen.findByText(t.errors.tooFast)).toBeTruthy()
    expect(field<HTMLInputElement>(t.labels.name).value).toBe('张同学')
    expect(field<HTMLInputElement>(t.labels.phone).value).toBe('138 0013 8000')
    expect(field<HTMLSelectElement>(t.labels.city).value).toBe('北京')
    expect(field<HTMLTextAreaElement>(t.labels.message).value).toBe('想了解周末班')
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true')
  })

  it('服务端返回字段错误时，焦点移到对应字段', async () => {
    submitLeadAction.mockResolvedValue({
      status: 'error',
      message: t.errors.formInvalid,
      fieldErrors: { phone: t.errors.phoneInvalid },
    })
    renderForm()
    fillValidForm()
    await submit()

    expect(await screen.findByText(t.errors.phoneInvalid)).toBeTruthy()
    expect(document.activeElement).toBe(field(t.labels.phone))
  })

  it('只有未勾选同意时，焦点移到可见的同意复选框（而不是隐藏的辅助 input），且不提交', async () => {
    renderForm()
    fireEvent.change(field(t.labels.name), { target: { value: '张同学' } })
    fireEvent.change(field(t.labels.phone), { target: { value: '13800138000' } })
    await submit()

    expect(screen.getByText(t.errors.consentRequired)).toBeTruthy()
    const checkbox = screen.getByRole('checkbox')
    expect(document.activeElement).toBe(checkbox)
    expect(checkbox.getAttribute('aria-describedby')).toBeTruthy()
    expect(submitLeadAction).not.toHaveBeenCalled()
  })

  it('同样的错误再次提交时，焦点重新回到第一个错误字段', async () => {
    renderForm()
    await submit()
    const name = field(t.labels.name)
    expect(document.activeElement).toBe(name)

    field(t.labels.phone).focus()
    await submit()
    expect(document.activeElement).toBe(name)
  })

  it('提交时附带以毫秒计的填写用时 fillMs，不再提交 startedAt', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: Date.now() })
    let now = 1_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    renderForm()
    fillValidForm()
    now = 4_321.4
    await submit()

    const fields = lastSubmitted()
    expect(fields.fillMs).toBe('3321')
    expect(fields).not.toHaveProperty('startedAt')
    expect(fields.position).toBe('test_form')
    expect(fields.consent).toBe('on')
    expect(await screen.findByRole('heading', { name: config.successTitle })).toBeTruthy()
  })

  it('页面地址与落地页地址在客户端截断到 500 个字符', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: Date.now() })
    window.history.replaceState(null, '', `/courses?q=${'a'.repeat(800)}`)
    renderForm()
    fillValidForm()
    await submit()

    const fields = lastSubmitted()
    expect(String(fields.pageUrl)).toHaveLength(500)
    expect(String(fields.landingUrl)).toHaveLength(500)
    expect(String(fields.pageUrl).startsWith('http://localhost')).toBe(true)
    window.history.replaceState(null, '', '/')
  })

  it('会话里记录的来源信息被改写成非字符串时按未填写处理（落地页退回当前页），超长的来源与 UTM 截断', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: Date.now() })
    window.sessionStorage.setItem(
      'eduverse:landing',
      JSON.stringify({
        landingUrl: 12345,
        referrer: `https://ref.example/${'r'.repeat(800)}`,
        utmSource: 's'.repeat(300),
        utmMedium: { nested: true },
      }),
    )
    renderForm()
    fillValidForm()
    await submit()

    const fields = lastSubmitted()
    expect(fields.landingUrl).toBe(fields.pageUrl)
    expect(String(fields.referrer)).toHaveLength(500)
    expect(fields.utmSource).toBe('s'.repeat(100))
    expect(fields.utmMedium).toBe('')
  })

  it('手机号输入框允许粘贴带空格、连字符、+86 的号码（不被 11 位上限截断）', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: Date.now() })
    renderForm()
    const phone = field<HTMLInputElement>(t.labels.phone)
    expect(phone.maxLength).toBe(20)
    expect(phone.type).toBe('tel')
    expect(phone.inputMode).toBe('tel')
    expect(phone.autocomplete).toBe('tel')

    fillValidForm()
    fireEvent.change(phone, { target: { value: '+86 138-0013-8000' } })
    await submit()
    expect(submitLeadAction).toHaveBeenCalledTimes(1)
    expect(lastSubmitted().phone).toBe('+86 138-0013-8000')
  })

  it('客户端校验失败但没有可标出的字段时，显示通用错误提示而不是毫无反应', async () => {
    const original = leadSubmissionSchema.safeParse.bind(leadSubmissionSchema)
    // 模拟隐藏字段异常：网站蜜罐字段不是字符串，校验失败但不对应任何可见控件
    vi.spyOn(leadSubmissionSchema, 'safeParse').mockImplementation((input) =>
      original({ ...(input as Record<string, unknown>), website: 0 }),
    )
    renderForm()
    fillValidForm()
    await submit()

    const status = screen.getByRole('status')
    expect(within(status).getByText(t.errors.generic)).toBeTruthy()
    expect(submitLeadAction).not.toHaveBeenCalled()
  })

  it('服务端渲染（水合前）的提交按钮不可用，水合后可用：未水合时的提交不会被 React 排队、绕过校验直接调用 Action', async () => {
    // 页内表单（行动号召区块）由服务端渲染。水合前提交会被 React 的表单重放脚本记下，
    // 水合后直接调用 action（不经过 onSubmit 的校验、来源字段与 fillMs，并在结束后重置表单），
    // 因此水合前按钮必须禁用：点击与回车隐式提交都不会发生
    const element = <LeadForm config={config} variant="inline" position="test_form" />
    const container = document.createElement('div')
    container.innerHTML = renderToString(element)
    document.body.appendChild(container)
    let root: ReturnType<typeof hydrateRoot> | undefined
    try {
      const button = () =>
        within(container).getByRole<HTMLButtonElement>('button', { name: t.submit })
      expect(button().disabled).toBe(true)

      const consoleError = vi.spyOn(console, 'error')
      root = await act(async () => hydrateRoot(container, element))
      expect(button().disabled).toBe(false)
      // 服务端与客户端首帧一致，没有水合不匹配告警
      expect(consoleError).not.toHaveBeenCalled()
    } finally {
      const mounted = root
      if (mounted) act(() => mounted.unmount())
      container.remove()
    }
  })

  it('客户端挂载的表单（弹窗里）提交按钮一开始就可用', () => {
    renderForm()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: t.submit }).disabled).toBe(false)
  })

  it('侧栏形态点击“留言”展开后，焦点移到留言输入框', async () => {
    renderForm({ variant: 'sidebar' })
    expect(screen.queryByLabelText(t.labels.message, { exact: false })).toBeNull()
    const reveal = screen.getByRole('button', { name: `+ ${t.labels.message}` })
    reveal.focus()
    await act(async () => {
      fireEvent.click(reveal)
    })
    expect(document.activeElement).toBe(field(t.labels.message))
  })
})

describe('留资表单：提交成功回调 onSuccess', () => {
  it('提交成功后调用一次（带写入时间），表单照常切换为成功提示；之后父组件重渲染、换了新的回调也不会再调用', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: 1_700_000_000_000 })
    const onSuccess = vi.fn()
    const { rerender } = render(
      <LeadForm config={config} variant="inline" position="quiz_result" onSuccess={onSuccess} />,
    )
    fillValidForm()
    await submit()

    expect(await screen.findByRole('heading', { name: config.successTitle })).toBeTruthy()
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith({ submittedAt: 1_700_000_000_000 })

    const next = vi.fn()
    rerender(<LeadForm config={config} variant="inline" position="quiz_result" onSuccess={next} />)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(next).not.toHaveBeenCalled()
  })

  it('服务端返回错误或请求失败时不调用', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onSuccess = vi.fn()
    submitLeadAction.mockResolvedValueOnce({ status: 'error', message: t.errors.rateLimited })
    submitLeadAction.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderForm({ onSuccess })
    fillValidForm()
    await submit()
    expect(await screen.findByText(t.errors.rateLimited)).toBeTruthy()
    await submit()
    expect(await screen.findByText(t.errors.generic)).toBeTruthy()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('不传 onSuccess 时行为不变（成功提示 +“完成”按钮）', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: 1 })
    const onDone = vi.fn()
    renderForm({ onDone })
    fillValidForm()
    await submit()
    fireEvent.click(await screen.findByRole('button', { name: t.success.again }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('职业测试与教程的上下文（意向、位置、专业、教程、测试结果）随表单提交', async () => {
    submitLeadAction.mockResolvedValue({ status: 'error', message: t.errors.tooFast })
    const quizResult = JSON.stringify({ version: 1, recommended: { id: 1 } })
    renderForm({
      intent: 'quiz',
      position: 'quiz_result',
      disciplineId: 1,
      tutorialId: 7,
      quizResult,
    })
    fillValidForm()
    await submit()
    const data = lastSubmitted()
    expect(data.intent).toBe('quiz')
    expect(data.position).toBe('quiz_result')
    expect(data.discipline).toBe('1')
    expect(data.tutorial).toBe('7')
    expect(data.quizResult).toBe(quizResult)
  })
})

describe('全站留资弹窗：open() 的 onSuccess 选项', () => {
  function Opener({ onSuccess }: { onSuccess?: () => void }) {
    const { open } = useLeadDialog()
    return (
      <>
        <button type="button" onClick={() => open({ position: 'test_a' }, { onSuccess })}>
          带回调打开
        </button>
        <button type="button" onClick={() => open({ position: 'test_b' })}>
          不带回调打开
        </button>
      </>
    )
  }

  it('本次打开的表单提交成功后调用；下一次不带回调打开时不再调用', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: 2 })
    const onSuccess = vi.fn()
    render(
      <LeadDialogProvider config={config}>
        <Opener onSuccess={onSuccess} />
      </LeadDialogProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '带回调打开' }))
    fillValidForm()
    await submit()
    expect(await screen.findByRole('heading', { name: config.successTitle })).toBeTruthy()
    expect(onSuccess).toHaveBeenCalledWith({ submittedAt: 2 })
    expect(lastSubmitted().position).toBe('test_a')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t.success.again }))
    })
    fireEvent.click(screen.getByRole('button', { name: '不带回调打开' }))
    fillValidForm()
    await submit()
    expect(await screen.findByRole('heading', { name: config.successTitle })).toBeTruthy()
    expect(lastSubmitted().position).toBe('test_b')
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})

describe('留资表单：zod 校验规则按需加载', () => {
  type LoadControl = {
    loads: number
    fail: boolean
    release: () => void
    /** 等这次表单实例的加载结束（成功或失败都算），用于清理 */
    settle: () => Promise<void>
  }
  let current: LoadControl | null = null

  /**
   * 用全新的模块实例渲染表单（校验规则尚未加载），并拦截 @/lib/validation/lead 的加载：
   * gate 未放行前加载一直挂起；fail 为 true 时加载失败。
   */
  async function freshForm(): Promise<LoadControl> {
    vi.resetModules()
    const control: LoadControl = {
      loads: 0,
      fail: false,
      release: () => {},
      settle: async () => {},
    }
    const gate = new Promise<void>((resolve) => {
      control.release = resolve
    })
    vi.doMock('@/lib/validation/lead', async (importOriginal) => {
      control.loads += 1
      await gate
      if (control.fail) throw new TypeError('Failed to fetch dynamically imported module')
      return importOriginal()
    })
    const { LeadForm: FreshLeadForm } = await import('@/components/lead/lead-form')
    // 与表单共用同一个模块实例（同一次 resetModules 之后导入）
    const { loadLeadValidation } = await import('@/components/lead/lead-validation')
    control.settle = () =>
      loadLeadValidation().then(
        () => {},
        () => {},
      )
    current = control
    render(<FreshLeadForm config={config} variant="dialog" position="test_form" />)
    return control
  }

  afterEach(async () => {
    // 先放行并等本次加载结束，再撤销模拟：否则挂起的加载会在下一个用例 resetModules 之后才完成，
    // 把真实模块留在模块缓存里，下一个用例的模拟就不生效了
    if (current) {
      current.fail = false
      current.release()
      await act(async () => {
        await current?.settle()
      })
      current = null
    }
    vi.doUnmock('@/lib/validation/lead')
    vi.resetModules()
  })

  it('渲染表单时不加载校验规则；聚焦任一控件时开始加载（只加载一次）', async () => {
    const control = await freshForm()
    expect(control.loads).toBe(0)

    act(() => field(t.labels.name).focus())
    act(() => field(t.labels.phone).focus())
    await waitFor(() => expect(control.loads).toBe(1))
    control.release()
  })

  it('按下表单内的控件（不聚焦，如 Safari 点按钮）也开始加载', async () => {
    const control = await freshForm()
    fireEvent.pointerDown(screen.getByRole('button', { name: t.submit }))
    await waitFor(() => expect(control.loads).toBe(1))
    control.release()
  })

  it('校验规则未加载完时提交：按钮显示提交中，加载完成后照常校验并提交；等待期间重复提交被忽略', async () => {
    submitLeadAction.mockResolvedValue({ status: 'error', message: t.errors.tooFast })
    const control = await freshForm()
    fillValidForm()
    await submit()
    // 等待校验规则期间：按钮显示加载中并标记 aria-disabled，表单 aria-busy
    const busyButton = screen.getByRole('button', { name: t.submitting })
    expect(busyButton.getAttribute('aria-disabled')).toBe('true')
    const form = busyButton.closest('form')
    expect(form?.getAttribute('aria-busy')).toBe('true')
    // 再次提交（如在输入框里按回车）被忽略
    await act(async () => {
      fireEvent.submit(form as HTMLFormElement)
    })
    expect(submitLeadAction).not.toHaveBeenCalled()

    // 放行后在 act 内等加载完成：表单的校验、状态更新与 effect（聚焦错误字段）都在 act 内处理完
    await act(async () => {
      control.release()
      await control.settle()
    })
    expect(await screen.findByText(t.errors.tooFast)).toBeTruthy()
    expect(submitLeadAction).toHaveBeenCalledTimes(1)
    expect(lastSubmitted().phone).toBe('138 0013 8000')
  })

  it('校验规则未加载完时提交空表单：加载完成后标出错误并把焦点移到第一个错误字段', async () => {
    const control = await freshForm()
    await submit()
    // 放行后在 act 内等加载完成：表单的校验、状态更新与 effect（聚焦错误字段）都在 act 内处理完
    await act(async () => {
      control.release()
      await control.settle()
    })

    expect(await screen.findByText(t.errors.nameRequired)).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(field(t.labels.name)))
    expect(submitLeadAction).not.toHaveBeenCalled()
  })

  it('校验规则加载失败（断网等）时显示通用错误提示，下次提交重新加载', async () => {
    submitLeadAction.mockResolvedValue({ status: 'error', message: t.errors.tooFast })
    const control = await freshForm()
    control.fail = true
    fillValidForm()
    await submit()
    // 放行后在 act 内等加载完成：表单的校验、状态更新与 effect（聚焦错误字段）都在 act 内处理完
    await act(async () => {
      control.release()
      await control.settle()
    })
    const status = screen.getByRole('status')
    expect(await within(status).findByText(t.errors.generic)).toBeTruthy()
    expect(submitLeadAction).not.toHaveBeenCalled()

    control.fail = false
    await submit()
    expect(await screen.findByText(t.errors.tooFast)).toBeTruthy()
    expect(control.loads).toBe(2)
    expect(submitLeadAction).toHaveBeenCalledTimes(1)
  })
})
