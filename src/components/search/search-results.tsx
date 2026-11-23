import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import type { SearchGroup, SearchResults as SearchResultsData } from '@/lib/search/types'
import { cn } from '@/lib/utils'

import { SearchHitItem } from './search-hit'

const t = zh.search

/** 分组区块的元素 id（页内跳转链接的目标） */
export const searchGroupId = (key: SearchGroup['key']) => `search-group-${key}`

/** 有结果的分组（顺序同 SEARCH_GROUP_KEYS） */
export function visibleGroups(results: SearchResultsData): SearchGroup[] {
  return results.groups.filter((group) => group.total > 0 && group.hits.length > 0)
}

type SearchResultsProps = {
  results: SearchResultsData
  terms: readonly string[]
  className?: string
}

/**
 * 搜索结果（服务端组件）：两个以上分组有结果时，先给出按类型跳转的链接（类型 + 数量）；
 * 每个分组一个区块：h2“类型 N 条”+ 结果列表（每组最多 10 条），匹配总数超过显示条数时提示换更具体的关键词。
 * 只渲染有结果的分组；没有任何结果时由页面显示无结果状态，不使用本组件。
 */
export function SearchResults({ results, terms, className }: SearchResultsProps) {
  const groups = visibleGroups(results)
  if (groups.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-10 md:gap-12', className)}>
      {groups.length > 1 ? (
        <nav aria-label={t.results.navLabel}>
          <ul role="list" className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <li key={group.key}>
                <a
                  href={`#${searchGroupId(group.key)}`}
                  className="relative inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-border bg-card px-3.5 text-sm font-medium text-card-foreground transition-colors hover:border-foreground md:min-h-9"
                >
                  {t.groups[group.key]}
                  <span aria-hidden className="numeric text-xs font-normal text-muted-foreground">
                    {group.total}
                  </span>
                  <span className="sr-only">
                    {formatMessage(t.results.groupCount, { count: group.total })}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {groups.map((group) => (
        <SearchResultGroup key={group.key} group={group} terms={terms} />
      ))}
    </div>
  )
}

function SearchResultGroup({ group, terms }: { group: SearchGroup; terms: readonly string[] }) {
  const id = searchGroupId(group.key)
  const headingId = `${id}-title`
  const more = group.total > group.hits.length

  return (
    <section id={id} aria-labelledby={headingId} className="flex flex-col">
      <h2
        id={headingId}
        className="flex items-baseline gap-3 border-b border-foreground pb-3 text-h3 text-foreground"
      >
        {t.groups[group.key]}
        <span className="numeric text-sm font-normal text-muted-foreground">
          {formatMessage(t.results.groupCount, { count: group.total })}
        </span>
      </h2>
      <ul role="list" className="divide-y divide-border">
        {group.hits.map((hit) => (
          <li key={hit.id}>
            <SearchHitItem hit={hit} group={group.key} terms={terms} />
          </li>
        ))}
      </ul>
      {more ? (
        <p className="border-t border-border pt-4 text-sm text-muted-foreground">
          {formatMessage(t.results.groupMore, { shown: group.hits.length })}
        </p>
      ) : null}
    </section>
  )
}
