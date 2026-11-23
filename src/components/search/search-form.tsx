'use client'

import { Loader2Icon, SearchIcon } from 'lucide-react'
import Form from 'next/form'
import { type FormEvent, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { fieldClassName } from '@/components/ui/input'
import { zh } from '@/i18n/zh'
import { SEARCH_PARAM, SEARCH_QUERY_MAX } from '@/lib/search/query'
import { cn } from '@/lib/utils'

import { SEARCH_INPUT_ID, SEARCH_PATH } from './search-input'
import type { SearchFormMessage } from './search-page'

const t = zh.search.form

export type SearchFormProps = {
  /** 输入框的值（searchInputValue）：导航到新的关键词后同步到输入框 */
  value: string
  /**
   * 地址栏里的原始 q（searchNavigationKey，没有时为 null）。它变化说明完成了一次导航：
   * 结束“搜索中”状态，并把输入框同步为新的关键词（浏览器前进 / 后退、点击头部搜索按钮回到空搜索页）。
   */
  navigationKey: string | null
  /** 输入框下方的提示（空白关键词）或错误（超长）；没有时为 null */
  message: SearchFormMessage | null
  /**
   * 挂载时（以及之后每次导航到没有结果列表的状态时）把焦点放进输入框：
   * 空搜索页、提示与错误状态为 true；有关键词的结果页为 false（焦点留在原处，读屏从页面开头读结果）。
   */
  autoFocus: boolean
  className?: string
}

/**
 * 站内搜索框：`<form role="search">`，GET 提交到 /search?q=。
 * 用 next/form：action 自动补 basePath；水合前是原生表单提交，水合后客户端导航（页面只换搜索结果，输入框保留焦点）。
 * 关键词最多 50 个字（maxLength），超长 / 空白由页面在服务端校验后给出提示（aria-describedby 关联）。
 * 提交后到新结果渲染之前，按钮显示加载图标（navigationKey 变化即结束）。
 */
export function SearchForm({
  value,
  navigationKey,
  message,
  autoFocus,
  className,
}: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  /** 本表单最近一次提交的关键词：导航由本表单发起时，不用页面返回的值覆盖用户可能继续输入的内容 */
  const submittedRef = useRef<string | null>(null)
  const mountedRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [settledKey, setSettledKey] = useState(navigationKey)

  // 导航完成（地址栏的 q 变了）→ 结束“搜索中”状态（渲染期间根据 props 调整 state）
  if (settledKey !== navigationKey) {
    setSettledKey(navigationKey)
    setPending(false)
  }

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    if (mountedRef.current) {
      // 不是本表单发起的导航（前进 / 后退、头部搜索按钮、页面内链接）：输入框跟随地址栏
      const submittedHere = submittedRef.current !== null && submittedRef.current === navigationKey
      if (!submittedHere && input.value !== value) input.value = value
    } else {
      // 首次挂载不改输入框：保留水合前用户已经输入的内容
      mountedRef.current = true
    }
    submittedRef.current = null
    if (autoFocus && document.activeElement !== input) {
      input.focus()
      input.select()
    }
  }, [navigationKey, value, autoFocus])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const submitted = new FormData(event.currentTarget).get(SEARCH_PARAM)
    const next = typeof submitted === 'string' ? submitted : ''
    submittedRef.current = next
    // 关键词与当前地址相同：页面内容不会变化，不进入“搜索中”状态
    if (next !== navigationKey) setPending(true)
  }

  const messageId = `${SEARCH_INPUT_ID}-message`
  const invalid = message?.kind === 'error'

  return (
    <Form
      action={SEARCH_PATH}
      prefetch={false}
      role="search"
      onSubmit={onSubmit}
      className={cn('flex flex-col gap-2 has-[>p:empty]:gap-0', className)}
    >
      {/* 标签只给读屏与语音输入用：页面标题与占位文字已经说明了输入框的用途 */}
      <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
        {t.label}
      </label>
      <div className="flex gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            id={SEARCH_INPUT_ID}
            type="search"
            name={SEARCH_PARAM}
            defaultValue={value}
            maxLength={SEARCH_QUERY_MAX}
            placeholder={t.placeholder}
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            aria-describedby={message ? messageId : undefined}
            className={cn(fieldClassName, 'h-13 pr-3 pl-12 text-base md:text-lg')}
          />
        </div>
        <Button type="submit" variant="secondary" size="lg" className="px-5 sm:px-8">
          {/* 搜索中：加载图标原位替换文字（按钮宽度不变），读屏名称变为“正在搜索…” */}
          <span className="relative inline-flex items-center justify-center">
            <span aria-hidden={pending || undefined} className={cn(pending && 'invisible')}>
              {t.submit}
            </span>
            {pending ? (
              <>
                <Loader2Icon aria-hidden className="absolute animate-spin" />
                <span className="sr-only">{t.pending}</span>
              </>
            ) : null}
          </span>
        </Button>
      </div>
      {/* 提示 / 错误：容器始终渲染（为空时不占高度），客户端导航后出现的内容会被读屏播报 */}
      <p
        id={messageId}
        aria-live="polite"
        className={cn('text-sm', invalid ? 'text-destructive' : 'text-muted-foreground')}
      >
        {message?.text}
      </p>
    </Form>
  )
}
