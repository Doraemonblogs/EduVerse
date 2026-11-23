'use client'

import type * as React from 'react'

import { HOME_LEAD_INTENTS, HOME_LEAD_POSITIONS } from '@/components/home/constants'
import { useLeadDialog } from '@/components/lead/lead-dialog'

type QuickEntryLeadButtonProps = {
  className?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  children: React.ReactNode
}

/**
 * “打开预约弹窗”的入口卡片（整张卡片是一个按钮）：position home_quick，意向统一为咨询。
 * 不用 LeadCTA：它带按钮的尺寸与配色，这里要与链接入口卡片保持同一版式。
 */
export function QuickEntryLeadButton({ children, ...props }: QuickEntryLeadButtonProps) {
  const { open } = useLeadDialog()
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() =>
        open({ position: HOME_LEAD_POSITIONS.quickEntries, intent: HOME_LEAD_INTENTS.quickEntries })
      }
      {...props}
    >
      {children}
    </button>
  )
}
