'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { zh } from '@/i18n/zh'

import { LeadForm } from './lead-form'
import type { LeadContextProps, LeadFormConfig } from './types'

export type LeadDialogOpenOptions = {
  /**
   * 关闭后焦点的退路：打开弹窗的按钮在关闭时已被卸载（如移动端菜单抽屉里的按钮，抽屉随之关闭），
   * 就聚焦这个元素（如菜单按钮），避免焦点掉到 <body>。
   */
  returnFocus?: HTMLElement | null
}

type LeadDialogContextValue = {
  config: LeadFormConfig
  open: (props: LeadContextProps, options?: LeadDialogOpenOptions) => void
}

const LeadDialogContext = createContext<LeadDialogContextValue | null>(null)

function withoutKey({ key: _key, ...rest }: LeadContextProps & { key: number }): LeadContextProps {
  return rest
}

export function useLeadDialog(): LeadDialogContextValue {
  const value = useContext(LeadDialogContext)
  if (!value) throw new Error('useLeadDialog 必须在 <LeadDialogProvider> 内使用')
  return value
}

/**
 * 全站唯一的留资弹窗：任意 CTA 调用 open({ position, intent, ... }) 即可打开。
 * 每次打开都会重新挂载表单，确保来源位置、填写计时等是本次的。
 */
export function LeadDialogProvider({
  config,
  children,
}: {
  config: LeadFormConfig
  children: React.ReactNode
}) {
  const [current, setCurrent] = useState<(LeadContextProps & { key: number }) | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const open = useCallback((props: LeadContextProps, options?: LeadDialogOpenOptions) => {
    returnFocusRef.current = options?.returnFocus ?? null
    setCurrent({ ...props, key: Date.now() })
    setIsOpen(true)
  }, [])

  const value = useMemo(() => ({ config, open }), [config, open])

  return (
    <LeadDialogContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {current ? (
          <DialogContent returnFocusFallbackRef={returnFocusRef}>
            <DialogHeader>
              <DialogTitle>{current.title ?? zh.lead.dialogTitle}</DialogTitle>
              <DialogDescription>
                {current.description ?? zh.lead.dialogDescription}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pt-5">
              <LeadForm
                key={current.key}
                config={config}
                variant="dialog"
                {...withoutKey(current)}
                onDone={() => setIsOpen(false)}
              />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </LeadDialogContext.Provider>
  )
}
