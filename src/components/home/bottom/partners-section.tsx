import { PartnerWall } from '@/components/careers/partner-wall'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeSectionFrameProps } from '@/components/home/rhythm'
import { HomeSectionHeader } from '@/components/home/section-header'
import type { PartnersSectionProps } from '@/components/home/types'
import { cn } from '@/lib/utils'

/**
 * 区块 7：合作企业（服务端组件）。Logo 墙是与就业服务页共用的 PartnerWall（src/components/careers/partner-wall.tsx）：
 * 灰度显示、悬停恢复原色，alt 为企业名称；移动端两行横滑，≥ lg 为 5 或 6 列网格。
 * 不输出企业官网链接（避免外链第三方），Logo 不可点击。
 */
export function PartnersSection({
  section,
  tone = 'paper',
  className,
}: PartnersSectionProps & HomeSectionFrameProps) {
  const { heading, items } = section

  return (
    <Section tone={tone} aria-labelledby={HOME_SECTION_IDS.partners} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', HOME_CONTAINER_CLASS)}>
        <HomeSectionHeader id={HOME_SECTION_IDS.partners} heading={heading} />
        <PartnerWall partners={items} />
      </Container>
    </Section>
  )
}
