import { ArticleCard } from '@/components/articles/article-card'
import type { ArticleCardData } from '@/lib/articles/types'
import { cn } from '@/lib/utils'

import { ArticleHeadline } from './article-headline'

type ArticleGridProps = {
  articles: ArticleCardData[]
  /** 第一篇做头条大卡（hasArticleHeadline：第 1 页且至少 3 篇） */
  headline: boolean
  className?: string
}

/**
 * 资讯列表网格（服务端组件）：移动端 1 列、sm 2 列、≥ lg 3 列的大图卡片；
 * 页面没有区块标题，文章标题用 h2（直接接在 h1 之下）。
 * 头条版式：第一篇在 sm 起占两列、≥ lg 占 2 × 2 格，第二、三篇自动排在它右侧一列。
 * 没有头条时（第 2 页起）第一张卡片的封面预加载，其余懒加载。
 * 移动端也写明 grid-cols-1（minmax(0, 1fr)）：标题 break-keep 后整段不可断的长词不会把列撑宽。
 */
export function ArticleGrid({ articles, headline, className }: ArticleGridProps) {
  return (
    <ul
      role="list"
      className={cn(
        'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-8',
        className,
      )}
    >
      {articles.map((article, index) =>
        headline && index === 0 ? (
          <li key={article.id} className="sm:col-span-2 lg:row-span-2">
            <ArticleHeadline article={article} />
          </li>
        ) : (
          <li key={article.id}>
            <ArticleCard article={article} headingLevel="h2" preload={!headline && index === 0} />
          </li>
        ),
      )}
    </ul>
  )
}
