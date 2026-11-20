import { zh } from '@/i18n/zh'

/** 键盘用户的“跳到主要内容”链接，获得焦点时才显示 */
export function SkipLink({ targetId = 'main' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only rounded-sm bg-primary text-sm font-semibold text-primary-foreground shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2"
    >
      {zh.a11y.skipToContent}
    </a>
  )
}
