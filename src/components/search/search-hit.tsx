import {
  BookOpenIcon,
  GraduationCapIcon,
  ImageIcon,
  type LucideIcon,
  NewspaperIcon,
  UserRoundIcon,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useId } from 'react'

import type { SearchGroupKey, SearchHit } from '@/lib/search/types'
import { cn } from '@/lib/utils'

import { HighlightText } from './highlight-text'

/** 缩略图宽度：移动端 80px，≥ sm 128px（讲师头像为正方形 64 / 96px） */
const THUMB_SIZES = '(min-width: 640px) 128px, 80px'
const AVATAR_SIZES = '(min-width: 640px) 96px, 64px'

/** 没有封面时缩略图位置的图标（按分组） */
const PLACEHOLDER_ICONS: Record<SearchGroupKey, LucideIcon> = {
  courses: BookOpenIcon,
  disciplines: GraduationCapIcon,
  articles: NewspaperIcon,
  teachers: UserRoundIcon,
  works: ImageIcon,
}

type SearchHitItemProps = {
  hit: SearchHit
  group: SearchGroupKey
  terms: readonly string[]
}

/**
 * 一条搜索结果（放在 `<ul role="list">` 的 `<li>` 里）：整行是一个链接（next/link，不预取），
 * 读屏名称是标题（aria-labelledby），补充信息与摘要作为说明（aria-describedby）。
 * 左侧缩略图是装饰（alt 为空，标题已说明内容）；标题与摘要高亮匹配的检索词。
 */
export function SearchHitItem({ hit, group, terms }: SearchHitItemProps) {
  const id = useId()
  const titleId = `${id}-title`
  const metaId = `${id}-meta`
  const excerptId = `${id}-excerpt`
  const describedBy = [hit.meta ? metaId : null, hit.excerpt ? excerptId : null]
    .filter(Boolean)
    .join(' ')
  const avatar = group === 'teachers'
  const Placeholder = PLACEHOLDER_ICONS[group]

  return (
    <Link
      href={hit.href}
      prefetch={false}
      aria-labelledby={titleId}
      aria-describedby={describedBy || undefined}
      className="group flex items-start gap-4 rounded-sm py-5 sm:gap-5"
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted text-muted-foreground',
          avatar ? 'aspect-square w-16 sm:w-24' : 'aspect-[4/3] w-20 sm:w-32',
        )}
      >
        {hit.image ? (
          <Image
            src={hit.image.src}
            alt=""
            width={hit.image.width}
            height={hit.image.height}
            sizes={avatar ? AVATAR_SIZES : THUMB_SIZES}
            loading="lazy"
            className={cn(
              'size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.03]',
              avatar && 'object-top',
            )}
          />
        ) : (
          <Placeholder aria-hidden className="size-6" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3
          id={titleId}
          className="line-clamp-2 text-base leading-snug font-semibold text-foreground underline-offset-4 wrap-break-word group-hover:underline md:text-lg"
        >
          <HighlightText text={hit.title} terms={terms} />
        </h3>
        {hit.meta ? (
          <p id={metaId} className="text-xs text-muted-foreground">
            {hit.meta}
          </p>
        ) : null}
        {hit.excerpt ? (
          <p
            id={excerptId}
            className="mt-0.5 line-clamp-2 text-sm wrap-break-word text-muted-foreground"
          >
            <HighlightText text={hit.excerpt} terms={terms} />
          </p>
        ) : null}
      </div>
    </Link>
  )
}
