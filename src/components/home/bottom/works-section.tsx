import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeDarkSectionFrameProps } from '@/components/home/rhythm'
import { HomeMoreLinkMobile, HomeSectionHeader } from '@/components/home/section-header'
import type { WorksSectionProps } from '@/components/home/types'
import { WORK_CARD_SIZES, WorkCard } from '@/components/works/work-card'
import { zh } from '@/i18n/zh'
import { cn } from '@/lib/utils'
import { WORKS_PATH } from '@/lib/works/paths'

import { worksItemVisibility } from './layout'

const t = zh.home.bottom.works

/**
 * 区块 5：学员作品（服务端组件）。深色区块衬托作品：WorkCard 整齐网格（封面统一裁切为 4:3，
 * 移动端 2 列、md 3 列、≥ lg 4 列；件数少时瀑布流的列高参差不齐，首页用网格），
 * 移动端只显示前 6 件、md 前 9 件（整行），压缩首页纵向长度；“查看更多作品 →”进入 /works。
 * 区块本身即作品展示，卡片不再逐张标“精选”。末尾注明作品授权与署名化名。
 */
export function WorksSection({
  section,
  className,
}: WorksSectionProps & HomeDarkSectionFrameProps) {
  const { heading, items } = section
  const more = { href: WORKS_PATH, label: t.more }

  return (
    <Section tone="dark" aria-labelledby={HOME_SECTION_IDS.works} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', HOME_CONTAINER_CLASS)}>
        <HomeSectionHeader id={HOME_SECTION_IDS.works} heading={heading} more={more} />
        <ul
          role="list"
          className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4"
        >
          {items.map((work, index) => (
            <li key={work.id} className={worksItemVisibility(index)}>
              <WorkCard
                work={work}
                cover="uniform"
                showFeatured={false}
                imageSizes={WORK_CARD_SIZES}
              />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">{t.pseudonymNote}</p>
          <HomeMoreLinkMobile {...more} />
        </div>
      </Container>
    </Section>
  )
}
