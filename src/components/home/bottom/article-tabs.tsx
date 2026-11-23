'use client'

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { ArticleCard } from '@/components/articles/article-card'
import { zh } from '@/i18n/zh'
import type { HomeArticle, HomeArticleCategory } from '@/lib/home/types'
import { cn } from '@/lib/utils'

import { articlesForTab, buildArticleTabs, nextTabIndex } from './article-tabs-model'

const t = zh.home.bottom.articles

export type ArticleTabsProps = {
  articles: HomeArticle[]
  /** 文章出现过的分类（后台顺序） */
  categories: HomeArticleCategory[]
}

/**
 * 最新资讯的分类 Tab（客户端组件，WAI-ARIA Tabs）：第一项“全部”，其后是文章出现过的分类；
 * 左 / 右方向键循环切换、Home / End 到首尾（自动激活，roving tabindex：只有当前 Tab 在 Tab 顺序里）。
 * 服务端渲染“全部”，所有文章链接都在首屏 HTML 里。出现的分类不足 2 个时不显示 Tab，只显示列表。
 */
export function ArticleTabs({ articles, categories }: ArticleTabsProps) {
  const id = useId()
  const tabs = useMemo(
    () => buildArticleTabs(categories, articles, t.allTab),
    [categories, articles],
  )
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  if (tabs.length === 0) return <ArticleList articles={articles} />

  const selected = tabs.find((tab) => tab.key === selectedKey) ?? tabs[0]
  const tabId = (key: string) => `${id}-tab-${key}`
  const panelId = (key: string) => `${id}-panel-${key}`

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(event.key, index, tabs.length)
    if (next === null) return
    event.preventDefault()
    setSelectedKey(tabs[next].key)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col">
      {/* 分类多时可横向滚动（overflow 会裁掉外扩的焦点描边，Tab 的描边画在内侧）；
          Tab 左右各有 0.5rem 内边距，列表左移同样距离，第一项文字与版心对齐；
          选中下划线压在下方列表的顶部细线上 */}
      <div
        role="tablist"
        aria-label={t.tabsLabel}
        className="-ml-2 flex scrollbar-none gap-2 overflow-x-auto md:gap-4"
      >
        {tabs.map((tab, index) => {
          const active = tab.key === selected.key
          return (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              role="tab"
              id={tabId(tab.key)}
              aria-selected={active}
              aria-controls={panelId(tab.key)}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelectedKey(tab.key)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'relative min-h-12 shrink-0 cursor-pointer rounded-xs px-2 text-base font-medium whitespace-nowrap transition-colors focus-visible:-outline-offset-2',
                'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-foreground after:transition-transform after:duration-200 motion-reduce:after:transition-none',
                active
                  ? 'text-foreground after:scale-x-100'
                  : 'text-muted-foreground after:scale-x-0 hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={panelId(tab.key)}
          aria-labelledby={tabId(tab.key)}
          hidden={tab.key !== selected.key}
        >
          {tab.key === selected.key ? (
            <ArticleList articles={articlesForTab(articles, tab)} />
          ) : null}
        </div>
      ))}
    </div>
  )
}

/**
 * 资讯列表：每行一个链接（ArticleCard 的 row 变体：缩略图、分类 · 日期、标题、≥ sm 摘要）；
 * ≥ lg 两列，行与行之间细线分隔。
 * 移动端也写明 grid-cols-1（minmax(0, 1fr)）：隐式列宽按内容撑开，标题 break-keep 后整段不可断的长词
 * 会把列撑得比版心宽（360px 宽时页面横向滚动）。
 */
function ArticleList({ articles }: { articles: HomeArticle[] }) {
  return (
    <ul role="list" className="grid grid-cols-1 border-t border-border lg:grid-cols-2 lg:gap-x-12">
      {articles.map((article) => (
        <li key={article.id} className="border-b border-border">
          <ArticleCard article={article} variant="row" />
        </li>
      ))}
    </ul>
  )
}
