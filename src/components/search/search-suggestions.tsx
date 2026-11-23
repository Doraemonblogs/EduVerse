import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

import { zh } from '@/i18n/zh'
import { COURSES_PATH, coursePath, majorPath } from '@/lib/course/paths'
import type { SearchSuggestions as SearchSuggestionsData } from '@/lib/search/types'
import { cn } from '@/lib/utils'

const t = zh.search.empty

type SearchSuggestionsProps = {
  suggestions: SearchSuggestionsData
  /**
   * panel：空搜索 / 无结果时的主体内容（热门专业一行、热门课程网格）；
   * aside：有结果时的桌面端侧栏（上下排列、紧凑）
   */
  variant?: 'panel' | 'aside'
  className?: string
}

/** 是否有可显示的热门入口 */
export function hasSuggestions(suggestions: SearchSuggestionsData): boolean {
  return suggestions.disciplines.length > 0 || suggestions.courses.length > 0
}

/**
 * 热门入口（服务端组件）：热门专业（专业方向页链接）+ 热门课程（课程详情链接）+ 查看全部课程。
 * 空搜索、关键词不合法、无结果时作为页面主体；有结果时在桌面端侧栏显示。没有任何入口时不渲染。
 */
export function SearchSuggestions({
  suggestions,
  variant = 'panel',
  className,
}: SearchSuggestionsProps) {
  if (!hasSuggestions(suggestions)) return null
  const aside = variant === 'aside'

  return (
    <div className={cn('flex flex-col', aside ? 'gap-8' : 'gap-10 md:gap-12', className)}>
      {suggestions.disciplines.length > 0 ? (
        <section
          aria-labelledby={`search-hot-disciplines-${variant}`}
          className="flex flex-col gap-4"
        >
          <h2
            id={`search-hot-disciplines-${variant}`}
            className={aside ? 'text-h4 text-foreground' : 'text-h3 text-foreground'}
          >
            {t.hotDisciplines}
          </h2>
          <ul role="list" className="flex flex-wrap gap-2">
            {suggestions.disciplines.map((discipline) => (
              <li key={discipline.id}>
                <Link
                  href={majorPath(discipline.slug)}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center rounded-sm border border-border bg-card px-4 text-sm font-medium text-card-foreground transition-colors hover:border-foreground md:min-h-10"
                >
                  {discipline.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {suggestions.courses.length > 0 ? (
        <section aria-labelledby={`search-hot-courses-${variant}`} className="flex flex-col gap-4">
          <h2
            id={`search-hot-courses-${variant}`}
            className={aside ? 'text-h4 text-foreground' : 'text-h3 text-foreground'}
          >
            {t.hotCourses}
          </h2>
          <ul
            role="list"
            className={cn(
              'grid',
              aside
                ? 'divide-y divide-border border-y border-border'
                : 'gap-3 sm:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {suggestions.courses.map((course) => (
              <li key={course.id}>
                <Link
                  href={coursePath(course.slug)}
                  prefetch={false}
                  className={cn(
                    'group flex h-full flex-col justify-center gap-1',
                    aside
                      ? 'py-3'
                      : 'rounded-md border border-border bg-card px-5 py-4 text-card-foreground transition-colors hover:border-foreground',
                  )}
                >
                  <span className="text-xs text-muted-foreground">{course.disciplineName}</span>
                  <span className="leading-snug font-semibold text-foreground underline-offset-4 group-hover:underline">
                    {course.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={COURSES_PATH}
            prefetch={false}
            className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-emphasis underline-offset-4 hover:underline"
          >
            {t.allCourses}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
        </section>
      ) : null}
    </div>
  )
}
