import { Container } from '@/components/common/container'
import { HorizontalScroller } from '@/components/common/horizontal-scroller'
import { Section } from '@/components/common/section'
import { HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeSectionFrameProps } from '@/components/home/rhythm'
import { HomeMoreLinkMobile, HomeSectionHeader } from '@/components/home/section-header'
import type { TeachersSectionProps } from '@/components/home/types'
import { TeacherCard } from '@/components/course/teacher-card-grid'
import { zh } from '@/i18n/zh'
import { cn } from '@/lib/utils'
import { TEACHERS_PATH } from '@/lib/teachers/paths'

import { cardDesktopLayout, scrollerLayoutProps } from './layout'

const t = zh.home.bottom.teachers

/**
 * 头像宽度：< sm 卡片为“头像在左”的横排，头像固定 96px；sm 每屏 2.6 张、md 3.3 张（头像在上、撑满卡片宽）；
 * ≥ lg 每行 4 张（网格或横滑，版心 1280px）
 */
const AVATAR_SIZES =
  '(min-width: 1360px) 300px, (min-width: 1024px) 23vw, (min-width: 768px) 29vw, (min-width: 640px) 36vw, 96px'

/**
 * 区块 8：师资团队（服务端组件）。TeacherCard（整张卡片链接到讲师详情）：
 * - < sm：每页 3 位讲师纵向排列（头像在左），按页横滑（三行、按列排布，露出下一页的一部分）；
 * - sm–lg：头像在上的卡片横滑；
 * - ≥ lg：不超过 4 位时一行网格，更多时一行 4 张继续横滑——方形头像的卡片较高，
 *   两行网格会让首页过长，完整名单在 /teachers。
 * 横滑时下方有进度条与上一组 / 下一组按钮。
 * “查看全部讲师 →”进入 /teachers。
 */
export function TeachersSection({
  section,
  tone = 'light',
  className,
}: TeachersSectionProps & HomeSectionFrameProps) {
  const { heading, items } = section
  const more = { href: TEACHERS_PATH, label: t.all }
  const layout = cardDesktopLayout(items.length, { maxColumns: 4, maxRows: 1 })

  return (
    <Section tone={tone} aria-labelledby={HOME_SECTION_IDS.teachers} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', HOME_CONTAINER_CLASS)}>
        <HomeSectionHeader id={HOME_SECTION_IDS.teachers} heading={heading} more={more} />
        <HorizontalScroller
          label={heading.title}
          size="compact"
          {...scrollerLayoutProps(layout)}
          controls
          // < sm：三行、按列排布的分页横滑（列宽公式与 scroller-item 一致，每屏 1.12 页）
          listClassName="max-sm:grid max-sm:grid-flow-col max-sm:grid-rows-3 max-sm:gap-y-6 max-sm:[--scroller-per-view:1.12] max-sm:auto-cols-[calc((100%_-_(var(--scroller-per-view)_-_1)_*_var(--scroller-gap))_/_var(--scroller-per-view))]"
        >
          {items.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} imageSizes={AVATAR_SIZES} />
          ))}
        </HorizontalScroller>
        <HomeMoreLinkMobile {...more} />
      </Container>
    </Section>
  )
}
