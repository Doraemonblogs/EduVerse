'use client'

import { Loader2Icon } from 'lucide-react'
import Link from 'next/link'
import {
  startTransition,
  useActionState,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { flushSync } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { isStaticPreview } from '@/config/site'
import { zh } from '@/i18n/zh'
import type { LeadActionState } from '@/lib/lead/actions'
import { cn } from '@/lib/utils'
import {
  leadSubmissionSchema,
  SOURCE_FIELD_MAX,
  toFieldErrors,
  truncateText,
  type LeadFieldErrors,
} from '@/lib/validation/lead'

import { LeadSuccess } from './lead-success'
import { readLandingInfo } from './source-tracker'
import { submitLeadSafely } from './submit-lead-safely'
import type { LeadContextProps, LeadFormConfig, LeadSuccessInfo } from './types'

export type LeadFormVariant = 'dialog' | 'inline' | 'sidebar'

type LeadFormProps = LeadContextProps & {
  config: LeadFormConfig
  variant: LeadFormVariant
  /** 成功后点击“完成” */
  onDone?: () => void
  /**
   * 提交成功后调用一次（服务端已写入线索），如职业测试展开完整报告、教程解锁播放。
   * 表单本身照常切换为成功提示（LeadSuccess，焦点移到其标题）；调用方若随即卸载表单、显示自己的内容，
   * 需要自行把焦点移到新内容上。只在客户端组件中传入（函数不能从服务端组件传下来）。
   */
  onSuccess?: (info: LeadSuccessInfo) => void
  className?: string
}

type HmtWindow = Window & { _hmt?: unknown[][] }

const t = zh.lead
const FIELD_ORDER = ['name', 'phone', 'city', 'message', 'consent'] as const
const IDLE: LeadActionState = { status: 'idle' }

/** 前端自动采集的来源字段：非字符串（会话存储被改写等）按未填写处理，超长截断（与服务端规则一致） */
function collected(value: unknown, max: number): string {
  return typeof value === 'string' ? truncateText(value, max) : ''
}

const subscribeNothing = () => () => {}

/** 是否已在客户端接管：服务端渲染与水合阶段为 false；水合后、以及客户端直接挂载（弹窗）时为 true */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )
}

/**
 * 留资表单：弹窗 / 页内 / 侧栏三种形态共用。
 * 客户端先用同一份 zod 规则校验（即时反馈），服务端 Server Action 再校验一遍。
 *
 * 提交由 onSubmit 手动派发（startTransition 内调用 dispatch），而不是交给 <form action>：
 * React 19 的表单 Action 结束后会自动重置表单，服务端返回错误（提交过快、限频、写库失败）时
 * 访客填写的内容会被清空。Action 经 submitLeadSafely 包装，网络失败等异常也只会变成错误提示。
 *
 * 水合前提交按钮禁用（点击与回车隐式提交都不会发生）：服务端渲染的表单若在水合前提交，
 * React 的表单重放脚本会把它记下，水合后直接调用 action——绕过 onSubmit 的校验、来源字段与 fillMs，
 * 并在结束后重置表单。无 JS 时 Radix 复选框也无法勾选，这样的提交本就不可能成功。
 * 仍把 dispatch 设为 action：万一绕过按钮提交，浏览器也不会把姓名、手机号拼进地址栏做 GET 提交。
 */
export function LeadForm({
  config,
  variant,
  position,
  intent = 'trial',
  disciplineId,
  courseId,
  tutorialId,
  quizResult,
  submitLabel,
  onDone,
  onSuccess,
  className,
}: LeadFormProps) {
  const id = useId()
  const hydrated = useHydrated()
  const [state, dispatch, pending] = useActionState<LeadActionState, FormData>(
    submitLeadSafely,
    IDLE,
  )
  const [clientErrors, setClientErrors] = useState<LeadFieldErrors>({})
  const [clientMessage, setClientMessage] = useState<string | null>(null)
  const [clientAttempt, setClientAttempt] = useState(0)
  const [previewBlocked, setPreviewBlocked] = useState(false)
  const [showMessage, setShowMessage] = useState(variant !== 'sidebar')
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const mountedAt = useRef(0)

  // 表单挂载（弹窗打开 / 页面渲染）的时刻。用单调时钟计算填写用时，与访客设备时钟是否准确无关
  useEffect(() => {
    mountedAt.current = performance.now()
  }, [])

  const serverErrors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}
  const errors: LeadFieldErrors = { ...serverErrors, ...clientErrors }
  const hasClientErrors = Object.keys(clientErrors).length > 0
  const formError = previewBlocked
    ? t.previewNotice
    : (clientMessage ?? (state.status === 'error' && !hasClientErrors ? state.message : null))

  // 出错后把焦点移到第一个有问题的字段：每次客户端校验失败、每次服务端返回都执行（错误相同也重新聚焦）。
  // 按 id 查找而不是 name：Radix 复选框的 name 在隐藏的辅助 input 上，id 才在可见的 role=checkbox 按钮上。
  const firstError = FIELD_ORDER.find((key) => errors[key])
  useEffect(() => {
    if (firstError) document.getElementById(`${id}-${firstError}`)?.focus()
  }, [id, firstError, state, clientAttempt])

  // 提交成功：记录百度统计转化事件（未配置统计时 _hmt 不存在，跳过）
  useEffect(() => {
    if (state.status === 'success') {
      ;(window as HmtWindow)._hmt?.push(['_trackEvent', 'lead', 'submit', position])
    }
  }, [state, position])

  // 提交成功：通知调用方（每次成功只调用一次；onSuccess 换了新函数不会重复调用）
  const notifySuccess = useEffectEvent((info: LeadSuccessInfo) => onSuccess?.(info))
  useEffect(() => {
    if (state.status === 'success') notifySuccess({ submittedAt: state.submittedAt })
  }, [state])

  if (state.status === 'success') {
    return <LeadSuccess config={config} onDone={onDone} className={className} />
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    if (isStaticPreview) {
      setPreviewBlocked(true)
      return
    }
    const form = event.currentTarget
    // 补齐来源信息（会话首次触达 + 当前页面）
    const landing = readLandingInfo()
    const set = (name: string, value: string) => {
      const input = form.elements.namedItem(name)
      if (input instanceof HTMLInputElement) input.value = value
    }
    const here = collected(window.location.href, SOURCE_FIELD_MAX.pageUrl)
    set('pageUrl', here)
    set('landingUrl', collected(landing?.landingUrl, SOURCE_FIELD_MAX.landingUrl) || here)
    set('referrer', collected(landing?.referrer, SOURCE_FIELD_MAX.referrer))
    set('utmSource', collected(landing?.utmSource, SOURCE_FIELD_MAX.utm))
    set('utmMedium', collected(landing?.utmMedium, SOURCE_FIELD_MAX.utm))
    set('utmCampaign', collected(landing?.utmCampaign, SOURCE_FIELD_MAX.utm))
    set('utmTerm', collected(landing?.utmTerm, SOURCE_FIELD_MAX.utm))
    set('utmContent', collected(landing?.utmContent, SOURCE_FIELD_MAX.utm))
    set('fillMs', String(Math.max(0, Math.round(performance.now() - mountedAt.current))))

    const formData = new FormData(form)
    const parsed = leadSubmissionSchema.safeParse(Object.fromEntries(formData.entries()))
    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error)
      setClientErrors(fieldErrors)
      // 没有能标在可见控件上的错误（如隐藏字段异常）时给通用提示，而不是毫无反应
      setClientMessage(Object.keys(fieldErrors).length > 0 ? null : t.errors.generic)
      setClientAttempt((n) => n + 1)
      return
    }
    setClientErrors({})
    setClientMessage(null)
    startTransition(() => dispatch(formData))
  }

  // 侧栏形态：展开留言框后把焦点移进去（被点击的按钮随之卸载，否则焦点会掉到 <body>）
  const revealMessage = () => {
    flushSync(() => setShowMessage(true))
    messageRef.current?.focus()
  }

  const fieldId = (name: string) => `${id}-${name}`
  const errorId = (name: keyof LeadFieldErrors) =>
    errors[name] ? `${id}-${name}-error` : undefined
  const wide = variant === 'inline'

  return (
    <form
      action={dispatch}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={pending}
      className={cn('grid gap-4', wide && 'md:grid-cols-2 md:gap-x-5', className)}
    >
      <Field
        id={fieldId('name')}
        label={t.labels.name}
        required
        error={errors.name}
        errorId={errorId('name')}
      >
        <Input
          id={fieldId('name')}
          name="name"
          autoComplete="name"
          maxLength={30}
          placeholder={t.placeholders.name}
          aria-required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errorId('name')}
        />
      </Field>

      <Field
        id={fieldId('phone')}
        label={t.labels.phone}
        required
        error={errors.phone}
        errorId={errorId('phone')}
      >
        <Input
          id={fieldId('phone')}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          // 允许粘贴 / 自动填充带空格、连字符、+86 的号码，由校验规则统一规范化
          maxLength={20}
          placeholder={t.placeholders.phone}
          aria-required
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errorId('phone')}
        />
      </Field>

      <Field id={fieldId('discipline')} label={t.labels.discipline}>
        <Select id={fieldId('discipline')} name="discipline" defaultValue={disciplineId ?? ''}>
          <option value="">{t.labels.disciplinePlaceholder}</option>
          {config.disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id={fieldId('city')}
        label={t.labels.city}
        error={errors.city}
        errorId={errorId('city')}
      >
        <Select
          id={fieldId('city')}
          name="city"
          defaultValue=""
          aria-invalid={Boolean(errors.city)}
          aria-describedby={errorId('city')}
        >
          <option value="">{t.labels.cityPlaceholder}</option>
          {config.cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </Select>
      </Field>

      {showMessage ? (
        <Field
          id={fieldId('message')}
          label={t.labels.message}
          error={errors.message}
          errorId={errorId('message')}
          className={cn(wide && 'md:col-span-2')}
        >
          <Textarea
            ref={messageRef}
            id={fieldId('message')}
            name="message"
            rows={variant === 'inline' ? 3 : 2}
            maxLength={500}
            placeholder={t.labels.messagePlaceholder}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errorId('message')}
          />
        </Field>
      ) : (
        <button
          type="button"
          onClick={revealMessage}
          className="cursor-pointer justify-self-start text-sm text-emphasis underline-offset-4 hover:underline"
        >
          + {t.labels.message}
        </button>
      )}

      <div className={cn('grid gap-1.5', wide && 'md:col-span-2')}>
        <div className="flex items-start gap-3">
          <Checkbox
            id={fieldId('consent')}
            name="consent"
            className="mt-0.5"
            aria-required
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errorId('consent')}
          />
          <Label
            htmlFor={fieldId('consent')}
            className="block text-sm leading-relaxed font-normal text-muted-foreground"
          >
            {t.consentPrefix}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener"
              className="text-emphasis underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {t.privacyPolicy}
            </Link>
            {t.consentSuffix}
          </Label>
        </div>
        {errors.consent ? (
          <p id={errorId('consent')} className="pl-8 text-sm text-destructive">
            {errors.consent}
          </p>
        ) : null}
      </div>

      {/* 防刷：蜜罐字段（对真人隐藏），以及来源信息 */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={fieldId('website')}>Website</label>
        <input
          id={fieldId('website')}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="position" value={position} />
      {courseId ? <input type="hidden" name="course" value={courseId} /> : null}
      {tutorialId ? <input type="hidden" name="tutorial" value={tutorialId} /> : null}
      {quizResult ? <input type="hidden" name="quizResult" value={quizResult} /> : null}
      {[
        'pageUrl',
        'landingUrl',
        'referrer',
        'utmSource',
        'utmMedium',
        'utmCampaign',
        'utmTerm',
        'utmContent',
        'fillMs',
      ].map((name) => (
        <input key={name} type="hidden" name={name} defaultValue="" />
      ))}

      <div className={cn('grid gap-2', wide && 'md:col-span-2')}>
        <Button
          type="submit"
          size={variant === 'sidebar' ? 'md' : 'lg'}
          block
          disabled={!hydrated}
          aria-disabled={pending}
          onClick={(e) => pending && e.preventDefault()}
        >
          {pending ? (
            <>
              <Loader2Icon className="animate-spin" aria-hidden />
              {t.submitting}
            </>
          ) : (
            (submitLabel ?? t.submit)
          )}
        </Button>
        <p role="status" aria-live="polite" className="min-h-5 text-sm text-destructive">
          {formError}
        </p>
      </div>
    </form>
  )
}

function Field({
  id,
  label,
  required,
  error,
  errorId,
  className,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  errorId?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
