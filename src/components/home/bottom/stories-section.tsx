import { InfoIcon } from 'lucide-react'

import { StoryCard } from '@/components/careers/story-card'
import { Container } from '@/components/common/container'
import { HorizontalScroller } from '@/components/common/horizontal-scroller'
import { Section } from '@/components/common/section'
import { HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeSectionFrameProps } from '@/components/home/rhythm'
import { HomeSectionHeader } from '@/components/home/section-header'
import type { StoriesSectionProps } from '@/components/home/types'
import { zh } from '@/i18n/zh'
import { cn } from '@/lib/utils'

import { cardDesktopLayout, scrollerLayoutProps } from './layout'

const t = zh.home.bottom.stories

/**
 * 区块 6：学员故事（服务端组件）。横滑卡片（移动端露出下一张，下方进度条与上一组 / 下一组按钮；
 * 不超过 4 个故事时桌面端改为一行网格，更多时继续横滑）。一行 4 张从 xl 开始：1024–1279px 的版心排 4 列时
 * 卡片约 210px，引言与“岗位 · 公司”逐字折行，这一段继续横滑（每屏 3 张）。卡片是与就业服务页共用的 StoryCard
 * （src/components/careers/story-card.tsx）：化名、现任岗位 · 公司（纯文字，不链接合作企业）、引言、学习前背景、所学课程。
 * 不展示任何薪资；没有故事详情页，卡片本身不是链接；区块末尾注明“学员姓名为化名”。
 */
export function StoriesSection({
  section,
  tone = 'light',
  className,
}: StoriesSectionProps & HomeSectionFrameProps) {
  const { heading, items } = section
  const layout = cardDesktopLayout(items.length, { maxColumns: 4, maxRows: 1, lgMaxColumns: 3 })

  return (
    <Section tone={tone} aria-labelledby={HOME_SECTION_IDS.stories} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', HOME_CONTAINER_CLASS)}>
        <HomeSectionHeader id={HOME_SECTION_IDS.stories} heading={heading} />
        <div className="flex flex-col gap-5">
          <HorizontalScroller
            label={heading.title}
            {...scrollerLayoutProps(layout)}
            controls
            itemClassName="flex"
          >
            {items.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </HorizontalScroller>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t.pseudonymNote}
          </p>
        </div>
      </Container>
    </Section>
  )
}
