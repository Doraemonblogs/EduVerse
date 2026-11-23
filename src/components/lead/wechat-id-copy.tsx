'use client'

import { CheckIcon, CopyIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { cn } from '@/lib/utils'

const t = zh.lead.success

/** “已复制”保持的时长，之后按钮恢复为“复制”，可以再次复制 */
export const COPIED_RESET_MS = 2000

type CopyResult = 'idle' | 'copied' | 'failed'

/**
 * 微信号 + 复制按钮（留资成功页、微信弹窗共用）。
 * - 复制成功：按钮短暂显示“已复制”，并通过 role="status" 播报结果（按钮文字变化读屏不一定会读）；
 * - 复制失败（非安全来源、内嵌浏览器没有剪贴板 API、权限被拒绝）：自动选中微信号并提示手动复制；
 * - 微信号文本 select-all：长按或单击即可整段选中。
 * 结果状态放在组件内部：所在弹窗关闭（内容卸载）后自然复位，不会下次打开就显示“已复制”。
 */
export function WechatIdCopy({ wechatId, className }: { wechatId: string; className?: string }) {
  const idRef = useRef<HTMLSpanElement>(null)
  const [result, setResult] = useState<CopyResult>('idle')

  useEffect(() => {
    if (result !== 'copied') return
    const timer = window.setTimeout(() => setResult('idle'), COPIED_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [result])

  const selectWechatId = () => {
    const node = idRef.current
    const selection = window.getSelection()
    if (!node || !selection) return
    const range = document.createRange()
    range.selectNodeContents(node)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const copy = async () => {
    try {
      // 剪贴板 API 不存在时这里同样会抛出，统一走失败分支
      await navigator.clipboard.writeText(wechatId)
      setResult('copied')
    } catch {
      selectWechatId()
      setResult('failed')
    }
  }

  const copied = result === 'copied'

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        {t.wechatId}：
        <span ref={idRef} className="font-mono text-foreground select-all">
          {wechatId}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {copied ? t.copied : t.copy}
        </Button>
      </p>
      <p
        role="status"
        className={cn('text-xs', result === 'failed' ? 'text-destructive' : 'sr-only')}
      >
        {copied ? t.copySucceeded : result === 'failed' ? t.copyFailed : ''}
      </p>
    </div>
  )
}
