import { zh } from '@/i18n/zh'

/** 键盘用户的“跳到主要内容”链接，获得焦点时才显示 */
export function SkipLink({ targetId = 'main' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only rounded-sm bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
    >
      {zh.a11y.skipToContent}
    </a>
  )
}
