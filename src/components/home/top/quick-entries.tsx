import { ArrowRight, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'

import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { SectionHeading } from '@/components/common/section-heading'
import { HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeSectionFrameProps } from '@/components/home/rhythm'
import type { QuickEntriesProps } from '@/components/home/types'
import type { HomeQuickEntry } from '@/lib/home/types'
import { cn } from '@/lib/utils'

import { HomeLinkAnchor } from './home-link'
import { QuickEntryLeadButton } from './quick-entry-lead'

/** 入口卡片：链接与“打开预约弹窗”的按钮共用同一版式（整张卡片可点，键盘焦点描边落在整张卡片上） */
const TILE_CLASS = cn(
  'group flex h-full w-full flex-col gap-4 rounded-md border border-border bg-card p-3.5 text-start text-card-foreground sm:gap-6 sm:p-5 lg:gap-8',
  'cursor-pointer transition-colors duration-150 ease-standard hover:border-foreground',
)

function QuickEntryContent({ entry, index }: { entry: HomeQuickEntry; index: number }) {
  const external = entry.action.kind === 'link' && entry.action.link.external
  const Icon = external ? ArrowUpRight : ArrowRight
  return (
    <>
      <span className="flex items-start justify-between gap-3">
        {entry.image ? (
          <Image
            src={entry.image.src}
            alt=""
            width={entry.image.width}
            height={entry.image.height}
            sizes="40px"
            className="size-10 rounded-sm bg-muted object-cover"
          />
        ) : (
          <span aria-hidden className="numeric text-sm text-muted-foreground">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
        <Icon
          aria-hidden
          className={cn(
            'size-5 shrink-0 text-muted-foreground transition-[color,translate] duration-150 ease-standard',
            'group-hover:text-foreground',
            external ? 'group-hover:-translate-y-0.5' : 'group-hover:translate-x-0.5',
          )}
        />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base leading-snug font-semibold text-foreground md:text-lg">
          {entry.title}
        </span>
        {entry.description ? (
          <span className="text-sm text-pretty text-muted-foreground">{entry.description}</span>
        ) : null}
      </span>
    </>
  )
}

/**
 * 区块 2：快速了解（服务端组件）。移动端 2×2、≥ md 一行 4 列；桌面端（≥ lg）区块标题居左成一列，
 * 与入口卡片同一行，紧跟主视觉，不额外拉长首屏。
 * 卡片为线框样式：序号（或运营上传的小配图）+ 箭头 + 标题 + 一句说明，不使用彩色插画图标。
 * link → 链接（外链新窗口）；lead → 打开留资弹窗（position home_quick，intent consult）。
 */
export function QuickEntries({
  section,
  tone = 'light',
  className,
}: QuickEntriesProps & HomeSectionFrameProps) {
  const { heading, items } = section
  return (
    <Section
      tone={tone}
      spacing="sm"
      aria-labelledby={HOME_SECTION_IDS.quickEntries}
      className={className}
    >
      <Container
        className={cn(
          'grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:items-center lg:gap-12',
          HOME_CONTAINER_CLASS,
        )}
      >
        <SectionHeading
          id={HOME_SECTION_IDS.quickEntries}
          eyebrow={heading.eyebrow ?? undefined}
          title={heading.title}
          description={heading.description ?? undefined}
        />
        <ul role="list" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {items.map((entry, index) => (
            <li key={entry.id} className="flex">
              {entry.action.kind === 'link' ? (
                <HomeLinkAnchor link={entry.action.link} className={TILE_CLASS}>
                  <QuickEntryContent entry={entry} index={index} />
                </HomeLinkAnchor>
              ) : (
                <QuickEntryLeadButton className={TILE_CLASS}>
                  <QuickEntryContent entry={entry} index={index} />
                </QuickEntryLeadButton>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
