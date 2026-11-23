import { ArrowRightIcon, ArrowUpRightIcon, ClockIcon, MapPinIcon, PhoneIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { campusPath } from '@/lib/campuses/paths'
import type { CampusCardData } from '@/lib/campuses/types'
import { formatMessage } from '@/lib/course/format'
import { cn } from '@/lib/utils'

const t = zh.campuses.card
const tMap = zh.campuses.map

export type CampusCardProps = {
  campus: CampusCardData
  /** 封面的 sizes（按卡片在页面上的实际宽度给出） */
  imageSizes: string
  /** 卡片标题的层级：区块标题是 h2 时用 h3（默认）；直接放在页面 h1 下时用 h2 */
  headingLevel?: 'h2' | 'h3'
  /** 首屏的卡片：封面预加载（只给第一屏的一两张）；默认懒加载 */
  preload?: boolean
  /** 在封面左上角显示城市标签（校区列表用；首页不显示） */
  showCity?: boolean
  /**
   * 地图链接的可见文字写明地图名“在高德地图中打开”（校区列表用）；
   * 默认是较短的“在地图中打开”（首页横滑卡片，读屏名称里说明是高德地图）
   */
  namedMapLink?: boolean
  className?: string
}

/**
 * 校区卡片（服务端组件；首页“校区分布”与校区列表 /campuses 共用）：
 * 封面（16:9）、校区名、地址、电话（tel: 链接）、开放时间；“查看校区 →”进入 /campuses/{slug}，
 * 有坐标时“在地图中打开”外链到高德地图标注页（新窗口，rel="noopener noreferrer"；页面不加载地图脚本）。
 * 卡片铺满父元素宽度（w-full），高度随内容；放进网格 / 横滑时由父元素决定宽度。
 */
export function CampusCard({
  campus,
  imageSizes,
  headingLevel: Heading = 'h3',
  preload = false,
  showCity = false,
  namedMapLink = false,
  className,
}: CampusCardProps) {
  return (
    <article
      className={cn(
        'flex w-full flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground',
        className,
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {campus.cover ? (
          <Image
            src={campus.cover.src}
            alt={campus.cover.alt || campus.name}
            width={campus.cover.width}
            height={campus.cover.height}
            sizes={imageSizes}
            {...(preload ? { preload: true } : { loading: 'lazy' as const })}
            className="size-full object-cover"
          />
        ) : null}
        {showCity && campus.city ? (
          <Badge variant="inverse" className="absolute top-3 left-3">
            <MapPinIcon aria-hidden />
            {campus.city}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
        <Heading className="text-h4 text-foreground">{campus.name}</Heading>
        <dl className="flex flex-col gap-2.5 text-sm">
          <CampusFact icon={MapPinIcon} label={t.address}>
            {campus.address}
          </CampusFact>
          {campus.phone ? (
            <CampusFact icon={PhoneIcon} label={t.phone}>
              {campus.phoneHref ? (
                <a
                  href={campus.phoneHref}
                  className="numeric text-foreground underline decoration-muted-foreground underline-offset-4 hover:decoration-current"
                >
                  {campus.phone}
                </a>
              ) : (
                <span className="numeric">{campus.phone}</span>
              )}
            </CampusFact>
          ) : null}
          {campus.openingHours ? (
            <CampusFact icon={ClockIcon} label={t.openingHours}>
              {campus.openingHours}
            </CampusFact>
          ) : null}
        </dl>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 border-t border-border pt-2">
          <Button asChild variant="link" className="min-h-11 text-sm">
            <Link
              href={campusPath(campus.slug)}
              prefetch={false}
              aria-label={formatMessage(t.detailLabel, { name: campus.name })}
            >
              {t.detail}
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
          {campus.mapUrl ? (
            <a
              href={campus.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                namedMapLink
                  ? formatMessage(tMap.linkLabel, { label: tMap.amap, name: campus.name })
                  : formatMessage(t.openMapLabel, { name: campus.name })
              }
              className="inline-flex min-h-11 items-center gap-1 rounded-xs text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {namedMapLink ? tMap.amap : t.openMap}
              <ArrowUpRightIcon aria-hidden className="size-4" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}

/** 卡片里的一项联系方式：图标 + 读屏标签（dt），取值（dd） */
export function CampusFact({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-2.5">
      <dt className="shrink-0 pt-0.5 text-muted-foreground">
        <Icon aria-hidden className="size-4" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  )
}
