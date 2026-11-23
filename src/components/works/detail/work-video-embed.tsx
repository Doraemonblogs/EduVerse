'use client'

import { PlayIcon } from 'lucide-react'
import Image from 'next/image'
import * as React from 'react'

import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import type { ImageSource } from '@/lib/media'
import { cn } from '@/lib/utils'
import { isAllowedVideoEmbedUrl } from '@/lib/works/video'

import { useHydrated } from './use-hydrated'

const t = zh.works.detail

type WorkVideoEmbedProps = {
  /** 外部播放器地址（数据层已校验白名单；插入 iframe 前这里再校验一次） */
  embedUrl: string
  /** 作品名：播放按钮与 iframe 的读屏名称 */
  title: string
  /** 播放前显示的封面（hero 尺寸）；首屏大图，预加载 */
  poster: ImageSource | null
  /** 封面图 sizes（按主媒体区宽度） */
  posterSizes: string
  className?: string
}

/**
 * 外部播放器的“点击后加载”外观（客户端组件）：
 * 首屏只显示作品封面与播放按钮，不请求任何第三方地址；点击后才插入播放器 iframe，并把焦点移到播放器上
 * （按钮随之卸载，焦点不会掉回页面顶部）。
 * 地址不在白名单内（isAllowedVideoEmbedUrl）时永远不插入 iframe，按钮不可用；水合前按钮也不可用。
 * 圆角裁切放在按钮 / iframe 自身而不是外层容器上：按钮与容器一样大，
 * 外层 overflow-hidden 会把画在按钮外侧的焦点描边整圈裁掉（键盘用户看不到焦点）。
 */
export function WorkVideoEmbed({
  embedUrl,
  title,
  poster,
  posterSizes,
  className,
}: WorkVideoEmbedProps) {
  const [playing, setPlaying] = React.useState(false)
  const frameRef = React.useRef<HTMLIFrameElement>(null)
  const allowed = isAllowedVideoEmbedUrl(embedUrl)
  const hydrated = useHydrated()

  React.useEffect(() => {
    if (playing) frameRef.current?.focus()
  }, [playing])

  return (
    <div className={cn('relative aspect-video rounded-md bg-muted', className)}>
      {playing && allowed ? (
        <iframe
          ref={frameRef}
          src={embedUrl}
          title={formatMessage(t.videoFrameTitle, { title })}
          allow="fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          className="absolute inset-0 size-full rounded-md border-0"
        />
      ) : (
        <button
          type="button"
          aria-label={formatMessage(t.playVideo, { title })}
          disabled={!allowed || !hydrated}
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 block size-full cursor-pointer overflow-hidden rounded-md disabled:cursor-default"
        >
          {poster ? (
            <Image
              src={poster.src}
              alt=""
              fill
              sizes={posterSizes}
              preload
              className="object-cover"
            />
          ) : null}
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center bg-background/25 transition-colors group-hover:bg-background/10 group-focus-visible:bg-background/10"
          >
            <span className="grid size-16 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-lg transition-transform duration-200 ease-standard group-hover:scale-105 group-focus-visible:scale-105 md:size-20">
              <PlayIcon className="size-7 translate-x-0.5 fill-current md:size-8" />
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
