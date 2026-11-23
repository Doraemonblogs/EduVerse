import { ArrowRightIcon, ArrowUpRightIcon, ClockIcon, MapPinIcon, PhoneIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type * as React from 'react'

import { Container } from '@/components/common/container'
import { HorizontalScroller } from '@/components/common/horizontal-scroller'
import { Section } from '@/components/common/section'
import { HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeSectionFrameProps } from '@/components/home/rhythm'
import { HomeSectionHeader } from '@/components/home/section-header'
import type { CampusesSectionProps } from '@/components/home/types'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { campusPath } from '@/lib/campuses/paths'
import { formatMessage } from '@/lib/course/format'
import type { HomeCampus } from '@/lib/home/types'
import { cn } from '@/lib/utils'

import { cardDesktopLayout, scrollerLayoutProps } from './layout'

const t = zh.home.bottom.campuses

/** 封面宽度：移动端每屏 1.15 张、sm 2.15 张，≥ lg 3 列（版心 1280px） */
const COVER_SIZES =
  '(min-width: 1360px) 410px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 85vw'

/**
 * 区块 9：校区分布（服务端组件）。校区卡片横滑（移动端露出下一张，下方进度条与上一组 / 下一组按钮；
 * ≥ lg 不超过 3 个校区时一行网格，更多时一行 3 张继续横滑，避免多行大卡片拉长首页）。
 * 卡片：封面、校区名、地址、电话（tel: 链接）、开放时间；“查看校区 →”进入 /campuses/{slug}（M6），
 * 有坐标时“在地图中打开”外链到高德地图标注页（新窗口，rel="noopener noreferrer"；页面不加载地图脚本）。
 */
export function CampusesSection({
  section,
  tone = 'paper',
  className,
}: CampusesSectionProps & HomeSectionFrameProps) {
  const { heading, items } = section
  const layout = cardDesktopLayout(items.length, { maxColumns: 3, maxRows: 1 })

  return (
    <Section tone={tone} aria-labelledby={HOME_SECTION_IDS.campuses} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', HOME_CONTAINER_CLASS)}>
        <HomeSectionHeader id={HOME_SECTION_IDS.campuses} heading={heading} />
        <HorizontalScroller
          label={heading.title}
          {...scrollerLayoutProps(layout)}
          controls
          itemClassName="flex"
        >
          {items.map((campus) => (
            <CampusCard key={campus.id} campus={campus} />
          ))}
        </HorizontalScroller>
      </Container>
    </Section>
  )
}

function CampusCard({ campus }: { campus: HomeCampus }) {
  return (
    <article className="flex w-full flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground">
      <div className="aspect-[16/9] overflow-hidden bg-muted">
        {campus.cover ? (
          <Image
            src={campus.cover.src}
            alt={campus.cover.alt || campus.name}
            width={campus.cover.width}
            height={campus.cover.height}
            sizes={COVER_SIZES}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
        <h3 className="text-h4 text-foreground">{campus.name}</h3>
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
              aria-label={formatMessage(t.openMapLabel, { name: campus.name })}
              className="inline-flex min-h-11 items-center gap-1 rounded-xs text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t.openMap}
              <ArrowUpRightIcon aria-hidden className="size-4" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function CampusFact({
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
