import { EyeIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useId } from 'react'

import { zh } from '@/i18n/zh'
import { articleViewsLabel, normalizeViews } from '@/lib/articles/format'
import { articlePath } from '@/lib/articles/paths'
import type { ArticleCardData } from '@/lib/articles/types'
import { formatCohortDate, toBeijingIsoDate } from '@/lib/course/format'
import { cn } from '@/lib/utils'

const t = zh.articles.card

/** 列表行缩略图宽度：移动端 96px，≥ sm 160px */
const ROW_THUMB_SIZES = '(min-width: 640px) 160px, 96px'

/** 卡片封面默认宽度：移动端通栏，sm 2 列，≥ lg 3 列（版心 1280px） */
const CARD_IMAGE_SIZES =
  '(min-width: 1360px) 410px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw'

/**
 * 卡片需要的文章字段：首页资讯（HomeArticle）只有前 6 项，资讯列表（ArticleCardData）全部都有；
 * views / authorName 缺省时卡片不显示阅读量与作者；阅读量为 0（新文章、还没有人读过）时也不显示，
 * 不出现“0 次阅读”。
 */
export type ArticleCardItem = Pick<
  ArticleCardData,
  'slug' | 'title' | 'excerpt' | 'cover' | 'publishedAt'
> & {
  category: Pick<NonNullable<ArticleCardData['category']>, 'name'> | null
  views?: number
  authorName?: string | null
}

export type ArticleCardProps = {
  article: ArticleCardItem
  /**
   * row：图文列表行（左侧缩略图、右侧分类 · 日期 / 标题 / ≥ sm 摘要；首页“最新资讯”与相关文章列表用）；
   * card：大图卡片（16:10 封面在上，分类 · 日期、标题、摘要、阅读量；资讯列表网格用）
   */
  variant?: 'row' | 'card'
  /** 标题层级：区块标题是 h2 时用 h3（默认）；直接放在页面 h1 下时用 h2 */
  headingLevel?: 'h2' | 'h3'
  /** card 变体封面的 sizes（默认按 1 / 2 / 3 列网格）；row 变体固定 96 / 160px */
  imageSizes?: string
  /** 首屏的卡片：封面预加载（只给第一屏的一两张）；默认懒加载 */
  preload?: boolean
  className?: string
}

/**
 * 资讯卡片（服务端 / 客户端组件都能用，不读取数据）：整张卡片是一个链接（/articles/{slug}），
 * 读屏名称是标题（aria-labelledby），分类 · 日期（及阅读量）作为说明（aria-describedby）。
 * 日期按北京时间显示，`<time dateTime>` 为 ISO 日期。悬停时标题加下划线、封面轻微放大（减少动态效果时不放大）。
 * 放进 `<ul role="list">` 的 `<li>` 里使用。
 */
export function ArticleCard({
  article,
  variant = 'card',
  headingLevel: Heading = 'h3',
  imageSizes = CARD_IMAGE_SIZES,
  preload = false,
  className,
}: ArticleCardProps) {
  const id = useId()
  const titleId = `${id}-title`
  const metaId = `${id}-meta`
  const statsId = `${id}-stats`
  const date = formatCohortDate(article.publishedAt)
  // 阅读量：缺省（首页资讯）或为 0 时不显示
  const views = normalizeViews(article.views)
  const hasStats = views > 0 || Boolean(article.authorName)
  const isRow = variant === 'row'

  const image = article.cover ? (
    <Image
      src={article.cover.src}
      alt={article.cover.alt || article.title}
      width={article.cover.width}
      height={article.cover.height}
      sizes={isRow ? ROW_THUMB_SIZES : imageSizes}
      {...(preload ? { preload: true } : { loading: 'lazy' as const })}
      className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
    />
  ) : null

  const meta = (
    <p id={metaId} className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
      {article.category ? (
        <>
          <span className="font-medium text-foreground">{article.category.name}</span>
          <span aria-hidden className="h-3 w-px bg-border" />
        </>
      ) : null}
      {date ? (
        <time dateTime={toBeijingIsoDate(article.publishedAt)} className="numeric">
          <span className="sr-only">{t.publishedAt}</span>
          {date}
        </time>
      ) : null}
    </p>
  )

  if (isRow) {
    return (
      <Link
        href={articlePath(article.slug)}
        prefetch={false}
        aria-labelledby={titleId}
        aria-describedby={metaId}
        className={cn('group flex gap-4 rounded-sm py-5 sm:gap-5', className)}
      >
        <div className="aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-sm bg-muted sm:aspect-[16/10] sm:w-40">
          {image}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {meta}
          <Heading
            id={titleId}
            className="line-clamp-2 text-base leading-snug font-semibold break-keep text-foreground underline-offset-4 wrap-break-word group-hover:underline md:text-lg"
          >
            {article.title}
          </Heading>
          <p className="line-clamp-2 text-sm text-muted-foreground max-sm:hidden">
            {article.excerpt}
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={articlePath(article.slug)}
      prefetch={false}
      aria-labelledby={titleId}
      aria-describedby={hasStats ? `${metaId} ${statsId}` : metaId}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground transition-colors hover:border-foreground',
        className,
      )}
    >
      <div className="aspect-[16/10] overflow-hidden bg-muted">{image}</div>
      <div className="flex flex-1 flex-col gap-2.5 p-5 md:p-6">
        {meta}
        <Heading
          id={titleId}
          className="line-clamp-2 text-lg leading-snug font-semibold break-keep text-foreground underline-offset-4 wrap-break-word group-hover:underline"
        >
          {article.title}
        </Heading>
        <p className="line-clamp-3 text-sm text-muted-foreground">{article.excerpt}</p>
        {hasStats ? (
          <p
            id={statsId}
            className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground"
          >
            {article.authorName ? (
              <span>
                <span className="sr-only">{t.author}：</span>
                {article.authorName}
              </span>
            ) : null}
            {views > 0 ? (
              <span className="inline-flex items-center gap-1">
                <EyeIcon aria-hidden className="size-3.5" />
                <span className="numeric">{articleViewsLabel(views)}</span>
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
