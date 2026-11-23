import { LeadCTA } from '@/components/lead/lead-cta'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { cn } from '@/lib/utils'

const t = zh.search.empty

/** 无结果状态留资的位置标识（M7 规格 §3） */
export const SEARCH_EMPTY_POSITION = 'search_empty'

/**
 * 无结果状态（服务端组件）：说明没有找到 + 换关键词的建议 + 在线咨询（留资弹窗，intent consult，position search_empty）。
 * 热门专业 / 热门课程由页面紧接着渲染（SearchSuggestions）。
 */
export function SearchNoResults({ query, className }: { query: string; className?: string }) {
  return (
    <section
      aria-labelledby="search-no-results-title"
      className={cn(
        'flex flex-col items-start gap-4 rounded-md bg-muted px-5 py-8 md:px-10 md:py-12',
        className,
      )}
    >
      {/* 关键词可能是一长串没有空格的字母，允许在任意位置换行，避免撑宽页面 */}
      <h2 id="search-no-results-title" className="text-h3 text-foreground wrap-anywhere">
        {formatMessage(t.title, { query })}
      </h2>
      <p className="max-w-2xl text-base text-muted-foreground">{t.description}</p>
      <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <LeadCTA position={SEARCH_EMPTY_POSITION} intent="consult">
          {t.consult}
        </LeadCTA>
        <p className="text-sm text-muted-foreground">{t.consultHint}</p>
      </div>
    </section>
  )
}
