'use client'

import { PlayIcon } from 'lucide-react'
import Image from 'next/image'
import * as React from 'react'

import { useHydrated } from '@/components/common/use-hydrated'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import type { ImageSource } from '@/lib/media'
import { cn } from '@/lib/utils'
import { isAllowedVideoEmbedUrl } from '@/lib/works/video'

const t = zh.video

export type VideoFacadeProps = {
  /**
   * 外部播放器地址。数据层应已按白名单校验；插入 iframe 前这里再校验一次（isAllowedVideoEmbedUrl），
   * 不在白名单（或为 null）时显示“视频暂不可用”，永远不插入 iframe。
   */
  embedUrl: string | null
  /** 视频名称：播放按钮与 iframe 的读屏名称（“播放视频：{title}”“{title}（视频播放器）”） */
  title: string
  /** 播放前显示的封面；为 null 时只有底色与播放按钮 */
  poster: ImageSource | null
  /** 封面图 sizes（按播放器实际显示宽度） */
  posterSizes: string
  /** 封面是否是首屏大图（作品详情：true，预加载）；弹窗等非首屏位置用默认 false（懒加载） */
  posterPreload?: boolean
  /** 点击播放后回调（如记录统计）；iframe 插入后焦点会移到播放器上 */
  onPlay?: () => void
  className?: string
}

/**
 * 外部播放器的“点击后加载”外观（客户端组件，作品详情与免费教程弹窗共用）：
 * 首屏只显示封面与播放按钮，不请求任何第三方地址；点击后才插入播放器 iframe，并把焦点移到播放器上
 * （按钮随之卸载，焦点不会掉回页面顶部）。
 * 地址不在白名单内时永远不插入 iframe，显示“视频暂不可用”；水合前播放按钮不可用。
 * 圆角裁切放在按钮 / iframe 自身而不是外层容器上：按钮与容器一样大，
 * 外层 overflow-hidden 会把画在按钮外侧的焦点描边整圈裁掉（键盘用户看不到焦点）。
 */
export function VideoFacade({
  embedUrl,
  title,
  poster,
  posterSizes,
  posterPreload = false,
  onPlay,
  className,
}: VideoFacadeProps) {
  const [playing, setPlaying] = React.useState(false)
  const frameRef = React.useRef<HTMLIFrameElement>(null)
  const allowed = isAllowedVideoEmbedUrl(embedUrl)
  const hydrated = useHydrated()

  React.useEffect(() => {
    if (playing) frameRef.current?.focus()
  }, [playing])

  if (!allowed) {
    return (
      <div className={cn('relative aspect-video overflow-hidden rounded-md bg-muted', className)}>
        {poster ? (
          <Image
            src={poster.src}
            alt=""
            fill
            sizes={posterSizes}
            className="object-cover opacity-40"
          />
        ) : null}
        <p className="absolute inset-0 grid place-items-center p-4 text-center text-sm font-medium text-muted-foreground">
          {t.unavailable}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('relative aspect-video rounded-md bg-muted', className)}>
      {playing ? (
        <iframe
          ref={frameRef}
          src={embedUrl}
          title={formatMessage(t.frameTitle, { title })}
          allow="fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          className="absolute inset-0 size-full rounded-md border-0"
        />
      ) : (
        <button
          type="button"
          aria-label={formatMessage(t.play, { title })}
          disabled={!hydrated}
          onClick={() => {
            setPlaying(true)
            onPlay?.()
          }}
          className="group absolute inset-0 block size-full cursor-pointer overflow-hidden rounded-md disabled:cursor-default"
        >
          {poster ? (
            <Image
              src={poster.src}
              alt=""
              fill
              sizes={posterSizes}
              preload={posterPreload}
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
