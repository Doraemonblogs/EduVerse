import { ArrowRightIcon, EyeIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useId } from 'react'

import { zh } from '@/i18n/zh'
import { articleViewsLabel, normalizeViews } from '@/lib/articles/format'
import { articlePath } from '@/lib/articles/paths'
import type { ArticleCardData } from '@/lib/articles/types'
import { formatCohortDate, toBeijingIsoDate } from '@/lib/course/format'
import { cn } from '@/lib/utils'

const t = zh.articles

/**
 * 头条封面的显示宽度（交给 next/image 的 sizes，浏览器据此按像素密度挑选合适的宽度）：
 * - ≥ 1360px：版心 1280px 的三列网格占两列 + 一个列间距 ≈ 846px；
 * - lg（1024–1359px）：同样占两列；版心为视口减左侧留白与右侧给悬浮栏让出的 5rem（lg:avoid-floating-actions），
 *   约 64.5vw − 58px，取略大一点的 61vw；
 * - sm–lg：两列网格里通栏 ≈ 视口减两侧留白（95vw 略大于实际，宁大勿小）；
 * - 移动端：通栏，视口减两侧各 16px 留白。
 */
const HEADLINE_SIZES =
  '(min-width: 1360px) 846px, (min-width: 1024px) 61vw, (min-width: 640px) 95vw, calc(100vw - 32px)'

type ArticleHeadlineProps = {
  article: ArticleCardData
  className?: string
}

/**
 * 资讯列表第 1 页的头条大卡（服务端组件）：与 ArticleCard 同样是整张卡片一个链接、标题为读屏名称，
 * 分类 · 日期与作者 · 阅读量作为说明。≥ lg 在三列网格里占 2 × 2 格，与右侧两张卡片等高。
 * 深色卡片（surface-dark）在白底网格里形成焦点：封面 16:9（≥ lg 16:10，object-cover 居中裁去上下少许），
 * 等高多出的高度留在文字区（标题与摘要在封面与底部信息之间垂直居中），底部是作者、阅读量与“阅读全文”提示。
 * 封面是列表页首屏最大的图（≥ lg 约 850px 宽）：用 hero 尺寸的大图（headlineCover，800px 的 card 尺寸会被放大发虚），
 * next/image 按 sizes 为各视口生成合适的宽度；立即加载并提高优先级。
 */
export function ArticleHeadline({ article, className }: ArticleHeadlineProps) {
  const id = useId()
  const titleId = `${id}-title`
  const metaId = `${id}-meta`
  const statsId = `${id}-stats`
  const date = formatCohortDate(article.publishedAt)
  const cover = article.headlineCover ?? article.cover
  // 阅读量为 0（新文章）时不显示；没有作者也没有阅读量时不输出空的统计行与对应的 aria-describedby
  const views = normalizeViews(article.views)
  const hasStats = views > 0 || Boolean(article.authorName)

  return (
    <Link
      href={articlePath(article.slug)}
      prefetch={false}
      aria-labelledby={titleId}
      aria-describedby={hasStats ? `${metaId} ${statsId}` : metaId}
      className={cn(
        'group surface-dark flex h-full flex-col overflow-hidden rounded-md border border-border bg-background text-foreground transition-colors hover:border-foreground',
        className,
      )}
    >
      <div className="aspect-[16/9] overflow-hidden bg-muted lg:aspect-[16/10]">
        {cover ? (
          <Image
            src={cover.src}
            alt={cover.alt || article.title}
            width={cover.width}
            height={cover.height}
            sizes={HEADLINE_SIZES}
            loading="eager"
            fetchPriority="high"
            className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-6 p-5 md:p-8 lg:px-10">
        <div className="flex flex-col gap-3 md:gap-4 lg:my-auto">
          <p
            id={metaId}
            className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground md:text-sm"
          >
            <span className="font-semibold text-emphasis">{t.list.headline}</span>
            {article.category ? (
              <>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span className="font-medium text-foreground">{article.category.name}</span>
              </>
            ) : null}
            {date ? (
              <>
                <span aria-hidden className="h-3 w-px bg-border" />
                <time dateTime={toBeijingIsoDate(article.publishedAt)} className="numeric">
                  <span className="sr-only">{t.card.publishedAt}</span>
                  {date}
                </time>
              </>
            ) : null}
          </p>
          <h2
            id={titleId}
            className="line-clamp-3 text-h3 break-keep underline-offset-4 wrap-break-word group-hover:underline md:text-h2"
          >
            {article.title}
          </h2>
          <p className="line-clamp-3 text-sm text-muted-foreground md:text-base lg:line-clamp-4 lg:text-lg">
            {article.excerpt}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {hasStats ? (
            <p
              id={statsId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:text-sm"
            >
              {article.authorName ? (
                <span>
                  <span className="sr-only">{t.card.author}：</span>
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
          ) : (
            <span />
          )}
          <span
            aria-hidden
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emphasis"
          >
            {t.list.readMore}
            <ArrowRightIcon className="size-4 transition-transform duration-150 ease-standard group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
