import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { zh } from '@/i18n/zh'
import type { ParsedSearchQuery } from '@/lib/search/query'
import type {
  SearchResults as SearchResultsData,
  SearchSuggestions as SearchSuggestionsData,
} from '@/lib/search/types'
import { cn } from '@/lib/utils'

import { TemplateText } from './highlight-text'
import { SearchForm } from './search-form'
import { SearchNoResults } from './search-no-results'
import { SEARCH_PATH, searchFormMessage, searchInputValue } from './search-page'
import { SearchResults } from './search-results'
import { hasSuggestions, SearchSuggestions } from './search-suggestions'

const t = zh.search

export type SearchViewProps = {
  parsed: ParsedSearchQuery
  /** 地址栏里的原始 q（searchNavigationKey），没有时为 null */
  navigationKey: string | null
  /** 关键词合法时的搜索结果；空 / 超长时为 null（不查库） */
  results: SearchResultsData | null
  suggestions: SearchSuggestionsData
  /** 静态预览站：搜索需要服务器，在搜索框下方说明 */
  preview: boolean
}

/**
 * 站内搜索页的版式（服务端组件，数据由页面传入）：
 * - 米色标题区：面包屑、h1、搜索框（提示 / 错误）、结果汇总（role="status"，始终渲染，客户端导航后播报）、预览站说明；
 * - 白色内容区：
 *   - 有结果：按类型分组的结果（桌面端右侧为热门专业 / 课程）；
 *   - 无结果：说明 + 在线咨询（search_empty）+ 热门入口；
 *   - 空搜索 / 空白 / 超长：热门入口（不查库）。
 */
export function SearchView({
  parsed,
  navigationKey,
  results,
  suggestions,
  preview,
}: SearchViewProps) {
  const query = parsed.status === 'ok' ? parsed.query : null
  const terms = parsed.status === 'ok' ? parsed.terms : []
  const total = results?.total ?? 0
  const hasResults = query !== null && total > 0

  return (
    <>
      <Section tone="paper" spacing="sm">
        <Container className="flex flex-col gap-5 md:gap-6">
          <Breadcrumbs items={[{ label: t.page.titleEmpty, href: SEARCH_PATH }]} />
          <h1 className="text-h1 text-foreground">{t.page.titleEmpty}</h1>
          <div className="flex max-w-3xl flex-col gap-3">
            <SearchForm
              value={searchInputValue(parsed)}
              navigationKey={navigationKey}
              message={searchFormMessage(parsed, navigationKey)}
              autoFocus={query === null}
            />
            {/* 结果汇总：无结果时只给读屏（页面上有无结果标题），没有关键词时为空 */}
            <p
              role="status"
              className={cn('text-base text-muted-foreground', !hasResults && 'sr-only')}
            >
              {query !== null ? (
                <TemplateText
                  template={t.results.summary}
                  values={{
                    query: <span className="text-foreground wrap-anywhere">{query}</span>,
                    count: <span className="numeric font-semibold text-foreground">{total}</span>,
                  }}
                />
              ) : null}
            </p>
            {preview ? (
              <p role="note" className="text-sm text-muted-foreground">
                {t.page.previewNotice}
              </p>
            ) : null}
          </div>
        </Container>
      </Section>

      <SearchBody query={query} terms={terms} results={results} suggestions={suggestions} />
    </>
  )
}

/** 内容区：白色区块，上边距较小（紧接标题区），版心给桌面端悬浮操作栏让位 */
function BodySection({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Section tone="light" className="pt-8 md:pt-12">
      <Container className={cn('lg:avoid-floating-actions', className)}>{children}</Container>
    </Section>
  )
}

function SearchBody({
  query,
  terms,
  results,
  suggestions,
}: {
  query: string | null
  terms: readonly string[]
  results: SearchResultsData | null
  suggestions: SearchSuggestionsData
}) {
  // 空搜索 / 空白 / 超长：只有热门入口；没有任何入口时不渲染内容区
  if (query === null || !results) {
    if (!hasSuggestions(suggestions)) return null
    return (
      <BodySection>
        <SearchSuggestions suggestions={suggestions} />
      </BodySection>
    )
  }

  if (results.total === 0) {
    return (
      <BodySection className="flex flex-col gap-12 md:gap-16">
        <SearchNoResults query={query} />
        <SearchSuggestions suggestions={suggestions} />
      </BodySection>
    )
  }

  // 有结果：桌面端右侧为热门入口（吸顶），移动端只显示结果
  const aside = hasSuggestions(suggestions)
  return (
    <BodySection
      className={cn(
        aside &&
          'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-20',
      )}
    >
      <SearchResults results={results} terms={terms} className="min-w-0" />
      {aside ? (
        <aside aria-label={t.results.asideLabel} className="hidden lg:block">
          <SearchSuggestions suggestions={suggestions} variant="aside" className="sticky top-24" />
        </aside>
      ) : null}
    </BodySection>
  )
}
