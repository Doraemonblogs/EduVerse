import { ChevronDownIcon } from 'lucide-react'

import type { FaqItem } from '@/lib/course/types'
import { cn } from '@/lib/utils'

export type FaqListProps = {
  faqs: FaqItem[]
  className?: string
}

/**
 * 常见问题（服务端组件，无需 JS）：原生 <details>/<summary>，可用键盘（Tab 聚焦、Enter / 空格展开收起）。
 * 回答是纯文本，保留换行。空数组不渲染。结构化数据用 faqPageJsonLd(faqs) 另行输出。
 */
export function FaqList({ faqs, className }: FaqListProps) {
  if (faqs.length === 0) return null
  return (
    <div className={cn('divide-y divide-border border-y border-border', className)}>
      {faqs.map((faq) => (
        <details key={faq.id} className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold text-foreground md:text-lg [&::-webkit-details-marker]:hidden">
            <span>{faq.question}</span>
            <ChevronDownIcon
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
            />
          </summary>
          <p className="pb-6 whitespace-pre-line text-muted-foreground">{faq.answer}</p>
        </details>
      ))}
    </div>
  )
}
