import { PlayIcon } from 'lucide-react'
import Image from 'next/image'
import { useId } from 'react'

import type { TutorialCardData } from '@/lib/tutorials/types'
import { cn } from '@/lib/utils'

import { TutorialGateBadge, TutorialPlayButton } from './tutorial-card-controls'
import { TutorialMeta } from './tutorial-meta'

/** 默认按教程网格（移动端 2 列、≥ md 3 列、≥ xl 4 列，版心 1280px）计算的封面宽度 */
export const TUTORIAL_CARD_SIZES =
  '(min-width: 1360px) 300px, (min-width: 1280px) 23vw, (min-width: 768px) 31vw, 46vw'

export type TutorialCardProps = {
  tutorial: TutorialCardData
  /** 标题层级：直接放在页面 h1 下用 h2（默认），区块标题是 h2 时用 h3 */
  headingLevel?: 'h2' | 'h3'
  /** 首屏的卡片：封面立即加载并提高优先级（只给第一张）；默认懒加载 */
  priority?: boolean
  imageSizes?: string
  className?: string
}

/**
 * 免费教程卡片（服务端组件）：16:9 封面（左上角“留资解锁”徽标、右下角播放图标 + 时长）、标题（两行）、
 * ≥ sm 两行简介、信息行（专业 · 难度 · 平台“哔哩哔哩”）。
 * 整张卡片由一个透明按钮覆盖（TutorialPlayButton，读屏名称“观看教程：{标题}”，徽标与信息行作为描述），
 * 点击打开播放弹窗；焦点描边落在整张卡片上，所以卡片本身不裁切（圆角裁切只在封面上）。
 * 放在 <TutorialPlayer> 内、`<ul role="list">` 的 `<li>` 里使用。深色区块内自动切换配色。
 */
export function TutorialCard({
  tutorial,
  headingLevel: Heading = 'h2',
  priority = false,
  imageSizes = TUTORIAL_CARD_SIZES,
  className,
}: TutorialCardProps) {
  const id = useId()
  const gatedId = `${id}-gated`
  const metaId = `${id}-meta`
  const describedBy = [tutorial.gated && gatedId, metaId].filter(Boolean).join(' ')

  return (
    <article className={cn('group relative flex h-full flex-col gap-3', className)}>
      <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
        {tutorial.cover ? (
          <Image
            src={tutorial.cover.src}
            alt={tutorial.cover.alt || tutorial.title}
            width={tutorial.cover.width}
            height={tutorial.cover.height}
            sizes={imageSizes}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
          />
        ) : null}
        {/* 悬停 / 聚焦时的大播放图标（纯装饰） */}
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 ease-standard group-hover:opacity-100 group-has-focus-visible:opacity-100"
        >
          <span className="grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-lg">
            <PlayIcon className="size-5 translate-x-px fill-current" />
          </span>
        </span>
        {tutorial.gated ? (
          <TutorialGateBadge
            tutorialId={tutorial.id}
            id={gatedId}
            className="absolute top-2 left-2"
          />
        ) : null}
        {/* 时长：可见文字对读屏隐藏，读屏从信息行读到“时长 18:40” */}
        <span
          aria-hidden
          className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-xs bg-secondary px-1.5 py-0.5 text-xs leading-5 font-medium text-secondary-foreground"
        >
          <PlayIcon className="size-3 fill-current" />
          {tutorial.duration ? <span className="numeric">{tutorial.duration}</span> : null}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <Heading className="line-clamp-2 text-sm leading-snug font-semibold text-foreground underline-offset-4 group-hover:underline md:text-base">
          {tutorial.title}
        </Heading>
        {tutorial.description ? (
          <p className="hidden text-sm text-muted-foreground sm:line-clamp-2">
            {tutorial.description}
          </p>
        ) : null}
        <TutorialMeta tutorial={tutorial} id={metaId} duration="sr-only" className="mt-auto pt-1" />
      </div>

      <TutorialPlayButton
        tutorialId={tutorial.id}
        title={tutorial.title}
        describedBy={describedBy}
        className="absolute inset-0 rounded-md"
      />
    </article>
  )
}
