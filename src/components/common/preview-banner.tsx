import { isStaticPreview } from '@/config/site'
import { zh } from '@/i18n/zh'

/** 静态预览站（GitHub Pages）顶部提示条；正式站不渲染 */
export function PreviewBanner() {
  if (!isStaticPreview) return null

  return (
    <div
      role="note"
      className="surface-paper border-b border-border px-gutter py-2 text-center text-sm text-muted-foreground"
    >
      {zh.preview.notice}
    </div>
  )
}
