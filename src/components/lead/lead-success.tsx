'use client'

import { CheckIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { cn } from '@/lib/utils'

import type { LeadFormConfig } from './types'
import { WechatIdCopy } from './wechat-id-copy'

const t = zh.lead.success

/** 提交成功：明确反馈 + 引导添加课程顾问微信 */
export function LeadSuccess({
  config,
  onDone,
  className,
}: {
  config: LeadFormConfig
  onDone?: () => void
  className?: string
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // 成功后把焦点移到结果标题，读屏用户能立即听到结果
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className={cn('flex flex-col items-center gap-4 text-center', className)}>
      <span
        className="grid size-12 place-items-center rounded-full bg-success/10 text-success"
        aria-hidden
      >
        <CheckIcon className="size-6" strokeWidth={3} />
      </span>
      <h3 ref={headingRef} tabIndex={-1} className="text-h3 outline-none">
        {config.successTitle}
      </h3>
      {config.successMessage ? (
        <p className="text-muted-foreground">{config.successMessage}</p>
      ) : null}

      {config.wechatQr || config.wechatId ? (
        <div className="flex w-full flex-col items-center gap-3 rounded-md border border-border p-4">
          <p className="text-sm font-medium">{t.wechatHint}</p>
          {config.wechatQr ? (
            <Image
              src={config.wechatQr.src}
              alt={t.qrAlt}
              width={160}
              height={160}
              sizes="160px"
              className="size-40 rounded-sm"
            />
          ) : null}
          {config.wechatId ? <WechatIdCopy wechatId={config.wechatId} /> : null}
        </div>
      ) : null}

      {onDone ? (
        <Button type="button" variant="secondary" block onClick={onDone}>
          {t.again}
        </Button>
      ) : null}
    </div>
  )
}
