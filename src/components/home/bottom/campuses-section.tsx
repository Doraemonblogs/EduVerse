import { CampusCard } from '@/components/campuses/campus-card'
import { Container } from '@/components/common/container'
import { HorizontalScroller } from '@/components/common/horizontal-scroller'
import { Section } from '@/components/common/section'
import { HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeSectionFrameProps } from '@/components/home/rhythm'
import { HomeMoreLinkMobile, HomeSectionHeader } from '@/components/home/section-header'
import type { CampusesSectionProps } from '@/components/home/types'
import { zh } from '@/i18n/zh'
import { CAMPUSES_PATH } from '@/lib/campuses/paths'
import { cn } from '@/lib/utils'

import { cardDesktopLayout, scrollerLayoutProps } from './layout'

/** 封面宽度：移动端每屏 1.15 张、sm 2.15 张，≥ lg 3 列（版心 1280px） */
const COVER_SIZES =
  '(min-width: 1360px) 410px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 85vw'

/**
 * 区块 9：校区分布（服务端组件）。校区卡片横滑（移动端露出下一张，下方进度条与上一组 / 下一组按钮；
 * ≥ lg 不超过 3 个校区时一行网格，更多时一行 3 张继续横滑，避免多行大卡片拉长首页）。
 * 卡片是与校区列表共用的 CampusCard（src/components/campuses/campus-card.tsx）：封面、校区名、地址、电话、
 * 开放时间、“查看校区 →”与“在地图中打开”（高德地图外链）。
 */
export function CampusesSection({
  section,
  tone = 'paper',
  className,
}: CampusesSectionProps & HomeSectionFrameProps) {
  const { heading, items } = section
  const layout = cardDesktopLayout(items.length, { maxColumns: 3, maxRows: 1 })
  const more = { href: CAMPUSES_PATH, label: zh.home.bottom.campuses.all }

  return (
    <Section tone={tone} aria-labelledby={HOME_SECTION_IDS.campuses} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', HOME_CONTAINER_CLASS)}>
        <HomeSectionHeader id={HOME_SECTION_IDS.campuses} heading={heading} more={more} />
        <HorizontalScroller
          label={heading.title}
          {...scrollerLayoutProps(layout)}
          controls
          itemClassName="flex"
        >
          {items.map((campus) => (
            <CampusCard key={campus.id} campus={campus} imageSizes={COVER_SIZES} />
          ))}
        </HorizontalScroller>
        <HomeMoreLinkMobile {...more} />
      </Container>
    </Section>
  )
}
