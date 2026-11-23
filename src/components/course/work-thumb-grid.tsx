import Image from 'next/image'
import Link from 'next/link'
import { useId } from 'react'

import type { WorkThumb } from '@/lib/course/types'
import { cn } from '@/lib/utils'
import { workByline, workImageAlt } from '@/lib/works/format'
import { workPath } from '@/lib/works/paths'

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
 * 学员作品缩略图网格（服务端组件）：封面（统一 4:3 裁切）+ 作品名 + 署名 · 届别，
 * 每一项整体是一个链接，进入作品详情 /works/{id}（键盘焦点描边落在整项上）；
 * 链接的无障碍名称只取作品名（aria-labelledby），署名作为描述。
 * 图片 alt 用媒体库填写的替代文字，未填写时用作品名。适合放在深色区块里衬托作品。空数组不渲染。
 * 需要按原图比例排布时用 src/components/works/work-masonry.tsx。
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
      {items.map((work) => (
        <li key={work.id}>
          <WorkThumbItem work={work} imageSizes={imageSizes} />
        </li>
      ))}
    </ul>
  )
}

function WorkThumbItem({ work, imageSizes }: { work: WorkThumb; imageSizes: string }) {
  const id = useId()
  const byline = workByline(work)
  return (
    <Link
      href={workPath(work.id)}
      prefetch={false}
      aria-labelledby={`${id}-title`}
      aria-describedby={byline ? `${id}-byline` : undefined}
      className="group block rounded-sm"
    >
      <figure className="flex flex-col gap-3">
        <div className="aspect-[4/3] overflow-hidden rounded-sm bg-muted">
          {work.cover ? (
            <Image
              src={work.cover.src}
              alt={workImageAlt(work.cover, work.title)}
              width={work.cover.width}
              height={work.cover.height}
              sizes={imageSizes}
              className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
            />
          ) : null}
        </div>
        <figcaption className="flex flex-col gap-0.5">
          <span
            id={`${id}-title`}
            className="text-sm font-semibold text-foreground underline-offset-4 group-hover:underline md:text-base"
          >
            {work.title}
          </span>
          {byline ? (
            <span id={`${id}-byline`} className="text-sm text-muted-foreground">
              {byline}
            </span>
          ) : null}
        </figcaption>
      </figure>
    </Link>
  )
}
