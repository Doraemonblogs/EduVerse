import { Container } from '@/components/common/container'
import { HorizontalScroller } from '@/components/common/horizontal-scroller'
import { Section } from '@/components/common/section'
import { CourseCard } from '@/components/course/course-card'
import { HOME_LEAD_POSITIONS, HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeSectionFrameProps } from '@/components/home/rhythm'
import { HomeMoreLinkMobile, HomeSectionHeader } from '@/components/home/section-header'
import type { CoursesRailProps } from '@/components/home/types'
import { zh } from '@/i18n/zh'
import { COURSES_PATH } from '@/lib/course/paths'
import { cn } from '@/lib/utils'

const t = zh.home.top.courses

/**
 * 封面宽度，与 HorizontalScroller size="card" 的每屏项数一致：
 * 移动端 1.15 张（≈ 85vw）、≥ sm 2.15 张（≈ 45vw）、≥ lg 3 张（版心 1280px，间距 24px → 410px）
 */
const COVER_SIZES =
  '(min-width: 1360px) 410px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 85vw'

/**
 * 区块 4：精选课程（服务端组件）。M3 的 CourseCard（学习路线 + “课程详情 / 预约试听”两个出口，
 * 预约试听 position home_course）放进横滑容器：移动端露出下一张的一部分，桌面端一屏 3 张，
 * 有上一组 / 下一组按钮与进度条；卡片在同一行内等高。
 */
export function CoursesRail({
  section,
  now = new Date(),
  tone = 'light',
  className,
}: CoursesRailProps & HomeSectionFrameProps) {
  const { heading, items } = section
  const more = { href: COURSES_PATH, label: t.allCourses }
  return (
    <Section tone={tone} aria-labelledby={HOME_SECTION_IDS.courses} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', HOME_CONTAINER_CLASS)}>
        <HomeSectionHeader id={HOME_SECTION_IDS.courses} heading={heading} more={more} />
        <HorizontalScroller label={heading.title} controls itemClassName="flex">
          {items.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              now={now}
              imageSizes={COVER_SIZES}
              leadPosition={HOME_LEAD_POSITIONS.courses}
              className="w-full"
            />
          ))}
        </HorizontalScroller>
        <HomeMoreLinkMobile {...more} />
      </Container>
    </Section>
  )
}
