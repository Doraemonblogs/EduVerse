import Image from 'next/image'
import Link from 'next/link'
import { useId } from 'react'

import { Badge } from '@/components/ui/badge'
import { zh } from '@/i18n/zh'
import { cn } from '@/lib/utils'
import { workByline, workImageAlt } from '@/lib/works/format'
import { workPath } from '@/lib/works/paths'
import type { WorkCardData } from '@/lib/works/types'

/** 默认按瀑布流 2 / 3 / 4 列（版心 1280px）计算的封面宽度 */
export const WORK_CARD_SIZES =
  '(min-width: 1360px) 300px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, 50vw'

export type WorkCardProps = {
  work: WorkCardData
  /** 作品名的标题层级：放在 h2 区块下用 h3（默认），区块标题是 h3 时用 h4；页面没有区块标题时用 h2 */
  headingLevel?: 'h2' | 'h3' | 'h4'
  /** 封面图 sizes；默认按瀑布流 2 / 3 / 4 列计算，列数不同时传入 */
  imageSizes?: string
  /** 首屏图：立即加载并提高优先级（只给首屏可见的少数几张，其余懒加载） */
  priority?: boolean
  className?: string
}

/**
 * 作品卡片（服务端组件）：整张卡片是一个链接（→ /works/{id}），
 * 内容为封面（按原图宽高比，不裁切）、作品名、“化名 · 届别”、专业方向简称，精选作品在封面左上角加文字徽标。
 * 链接的无障碍名称只取作品名（aria-labelledby），署名 / 专业 / 精选作为描述（aria-describedby），
 * 避免读屏把封面替代文字与全部信息连读成一长串。键盘焦点描边落在整张卡片上。
 * 深色区块内自动切换配色。
 */
export function WorkCard({
  work,
  headingLevel: Heading = 'h3',
  imageSizes = WORK_CARD_SIZES,
  priority = false,
  className,
}: WorkCardProps) {
  const id = useId()
  const titleId = `${id}-title`
  const featuredId = `${id}-featured`
  const metaId = `${id}-meta`
  const byline = workByline(work)
  const hasMeta = Boolean(byline || work.discipline)
  const describedBy = [work.featured && featuredId, hasMeta && metaId].filter(Boolean).join(' ')

  return (
    <Link
      href={workPath(work.id)}
      prefetch={false}
      aria-labelledby={titleId}
      aria-describedby={describedBy || undefined}
      className={cn('group flex flex-col gap-3 rounded-sm', className)}
    >
      <div className="relative overflow-hidden rounded-sm bg-muted">
        {work.cover ? (
          <Image
            src={work.cover.src}
            alt={workImageAlt(work.cover, work.title)}
            width={work.cover.width}
            height={work.cover.height}
            sizes={imageSizes}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            className="h-auto w-full transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
          />
        ) : (
          <div className="aspect-[4/3]" />
        )}
        {work.featured ? (
          <Badge id={featuredId} variant="inverse" className="absolute top-2 left-2">
            {zh.works.featured}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <Heading
          id={titleId}
          className="text-sm leading-snug font-semibold text-foreground underline-offset-4 group-hover:underline md:text-base"
        >
          {work.title}
        </Heading>
        {hasMeta ? (
          <p
            id={metaId}
            className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground md:text-sm"
          >
            {byline ? <span>{byline}</span> : null}
            {/* 读屏连读时的停顿（视觉上靠间距分隔） */}
            {byline && work.discipline ? <span className="sr-only">，</span> : null}
            {work.discipline ? <span>{work.discipline.shortName}</span> : null}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
