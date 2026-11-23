import Image from 'next/image'

import { zh } from '@/i18n/zh'
import type { WorkThumb } from '@/lib/course/types'
import { cn } from '@/lib/utils'

/** 默认按 2 / 3 / 4 列网格（版心 1280px）计算的图片宽度 */
const DEFAULT_SIZES =
  '(min-width: 1360px) 300px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, 50vw'

export type WorkThumbGridProps = {
  works: WorkThumb[]
  /** 最多展示几件（默认全部） */
  limit?: number
  /** 封面图 sizes；网格列数改变时传入 */
  imageSizes?: string
  className?: string
}

/**
 * 学员作品缩略图网格（服务端组件）：封面 + 作品名 + 署名 · 届别。
 * M3 只展示、不加链接（作品详情 /works/[id] 在 M4 上线）。
 * 图片 alt 用媒体库填写的替代文字，未填写时用作品名。适合放在深色区块里衬托作品。空数组不渲染。
 */
export function WorkThumbGrid({
  works,
  limit,
  imageSizes = DEFAULT_SIZES,
  className,
}: WorkThumbGridProps) {
  const items = limit === undefined ? works : works.slice(0, limit)
  if (items.length === 0) return null
  return (
    <ul
      role="list"
      className={cn(
        'grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4',
        className,
      )}
    >
      {items.map((work) => {
        const byline = [work.authorName, work.cohortLabel]
          .filter(Boolean)
          .join(zh.course.work.authorSeparator)
        return (
          <li key={work.id}>
            <figure className="flex flex-col gap-3">
              <div className="aspect-[4/3] overflow-hidden rounded-sm bg-muted">
                {work.cover ? (
                  <Image
                    src={work.cover.src}
                    alt={work.cover.alt || work.title}
                    width={work.cover.width}
                    height={work.cover.height}
                    sizes={imageSizes}
                    className="size-full object-cover"
                  />
                ) : null}
              </div>
              <figcaption className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground md:text-base">
                  {work.title}
                </span>
                {byline ? <span className="text-sm text-muted-foreground">{byline}</span> : null}
              </figcaption>
            </figure>
          </li>
        )
      })}
    </ul>
  )
}
