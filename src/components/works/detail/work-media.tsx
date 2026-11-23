import { Maximize2Icon } from 'lucide-react'
import Image from 'next/image'

import { Lightbox, LightboxTrigger } from '@/components/common/lightbox'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { cn } from '@/lib/utils'
import { workImageAlt, workLightboxItems } from '@/lib/works/format'
import type { WorkDetail, WorkGalleryItem, WorkVideo } from '@/lib/works/types'
import { isAllowedVideoEmbedUrl } from '@/lib/works/video'

import { WorkVideoEmbed } from './work-video-embed'

const t = zh.works.detail

/**
 * 缩略图的显示宽度（与下方 ThumbList 的 w-20 md:w-28 lg:w-20 xl:w-28 一致：
 * 移动端 80px、平板 112px；桌面端主媒体栏在 lg 较窄，缩回 80px，xl 起 112px）。
 * 页面缩略图与灯箱占位图用同一个 sizes，浏览器从 srcset 中选中同一个地址，占位图直接命中缓存。
 */
export const WORK_THUMB_SIZES =
  '(min-width: 1280px) 112px, (min-width: 1024px) 80px, (min-width: 768px) 112px, 80px'

/**
 * 主媒体区宽度：桌面端为版心减去右侧信息栏（22–24rem）与栏间距，约 850px；移动端通栏。
 * 竖幅作品受最大高度限制会更窄，sizes 取上限即可。
 */
export const STAGE_SIZES = '(min-width: 1360px) 860px, (min-width: 1024px) 64vw, 100vw'

/**
 * 实际可播放的视频：外部播放器地址在渲染前再按白名单校验一次（数据层已校验过，这里纵深防御），
 * 不合法时当作没有视频（显示大图）。
 */
export function playableVideo(video: WorkVideo | null): WorkVideo | null {
  if (!video) return null
  if (video.kind === 'embed' && !isAllowedVideoEmbedUrl(video.embedUrl)) return null
  return video
}

type WorkMediaProps = {
  work: Pick<WorkDetail, 'title' | 'heroImage' | 'cover' | 'gallery' | 'video'>
  className?: string
}

/**
 * 作品详情的主媒体区（服务端组件，放在深色区块里）：
 * - 有视频时显示视频：外部播放器为“点击后加载”的封面 + 播放按钮（首屏不请求第三方），
 *   上传的视频文件用原生 <video controls preload="none">，封面作 poster；
 * - 没有视频时显示作品大图（按原图比例、限制最大高度，竖幅作品两侧留底色），是首屏唯一预加载的图片；
 * - 大图与下方的缩略图都能打开灯箱（通用 Lightbox），序列为封面 + 作品图集。
 *   没有视频且只有一张图时不显示缩略图。
 */
export function WorkMedia({ work, className }: WorkMediaProps) {
  const items = workLightboxItems(work)
  const video = playableVideo(work.video)
  const showThumbs = video ? items.length > 0 : items.length > 1

  return (
    <Lightbox items={items} title={work.title} thumbSizes={WORK_THUMB_SIZES}>
      <div className={cn('flex min-w-0 flex-col gap-3 md:gap-4', className)}>
        {video ? (
          <VideoStage video={video} work={work} />
        ) : (
          <ImageStage item={items[0]} title={work.title} count={items.length} />
        )}
        {showThumbs ? <ThumbList items={items} title={work.title} /> : null}
      </div>
    </Lightbox>
  )
}

function VideoStage({ video, work }: { video: WorkVideo; work: WorkMediaProps['work'] }) {
  if (video.kind === 'file') {
    return (
      <video
        controls
        preload="none"
        playsInline
        poster={video.poster?.src}
        aria-label={work.title}
        className="aspect-video w-full rounded-md bg-muted"
      >
        <source src={video.src} type={video.mimeType} />
        {t.videoUnsupported}
      </video>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <WorkVideoEmbed
        embedUrl={video.embedUrl}
        title={work.title}
        poster={work.heroImage ?? work.cover}
        posterSizes={STAGE_SIZES}
      />
      <p className="text-xs text-muted-foreground">{t.videoNotice}</p>
    </div>
  )
}

function ImageStage({
  item,
  title,
  count,
}: {
  item: WorkGalleryItem | undefined
  title: string
  count: number
}) {
  if (!item) return <div className="aspect-video rounded-md bg-muted" />
  const alt = workImageAlt(item.image, title)
  return (
    <LightboxTrigger
      index={0}
      label={formatMessage(t.openImage, { alt })}
      className="group relative block w-full overflow-hidden rounded-md bg-muted"
    >
      <Image
        src={item.image.src}
        alt={alt}
        width={item.image.width}
        height={item.image.height}
        sizes={STAGE_SIZES}
        preload
        className="mx-auto block h-auto max-h-[min(72vh,56rem)] w-auto max-w-full"
      />
      <span
        aria-hidden
        className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-xs bg-background/85 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors group-hover:bg-background"
      >
        <Maximize2Icon className="size-3.5" />
        {t.viewLarge}
        {count > 1 ? (
          <span className="numeric text-muted-foreground">
            {formatMessage(t.imageCount, { count })}
          </span>
        ) : null}
      </span>
    </LightboxTrigger>
  )
}

function ThumbList({ items, title }: { items: WorkGalleryItem[]; title: string }) {
  return (
    // 缩略图多时在列表内横向滚动（页面本身不横向滚动）；内边距给焦点描边留出位置
    <ul
      role="list"
      aria-label={t.galleryLabel}
      className="-m-1 flex gap-2 overflow-x-auto p-1 md:gap-3"
    >
      {items.map((item, index) => (
        <li key={`${index}-${item.image.src}`} className="shrink-0">
          <LightboxTrigger
            index={index}
            label={formatMessage(t.openThumb, {
              index: index + 1,
              name: item.caption ?? workImageAlt(item.image, title),
            })}
            className="block aspect-[4/3] w-20 overflow-hidden rounded-sm border border-border bg-muted transition-colors hover:border-foreground md:w-28 lg:w-20 xl:w-28"
          >
            <Image
              src={item.thumb.src}
              alt=""
              width={item.thumb.width}
              height={item.thumb.height}
              sizes={WORK_THUMB_SIZES}
              className="size-full object-cover"
            />
          </LightboxTrigger>
        </li>
      ))}
    </ul>
  )
}
