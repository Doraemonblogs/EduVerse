import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeSectionFrameProps } from '@/components/home/rhythm'
import { HomeMoreLinkMobile, HomeSectionHeader } from '@/components/home/section-header'
import type { ArticlesSectionProps } from '@/components/home/types'
import { zh } from '@/i18n/zh'
import { ARTICLES_PATH } from '@/lib/articles/paths'
import { cn } from '@/lib/utils'

import { ArticleTabs } from './article-tabs'

const t = zh.home.bottom.articles

/**
 * 区块 10：最新资讯（服务端组件）。按分类 Tab 切换的列表（ArticleTabs，客户端小组件，键盘可用；
 * 出现的分类不足 2 个时只显示列表）。每行链接到 /articles/{slug}（M6）；“查看全部资讯 →”进入 /articles。
 */
export function ArticlesSection({
  section,
  tone = 'light',
  className,
}: ArticlesSectionProps & HomeSectionFrameProps) {
  const { heading, items, categories } = section
  const more = { href: ARTICLES_PATH, label: t.all }

  return (
    <Section tone={tone} aria-labelledby={HOME_SECTION_IDS.articles} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', HOME_CONTAINER_CLASS)}>
        <HomeSectionHeader id={HOME_SECTION_IDS.articles} heading={heading} more={more} />
        <ArticleTabs articles={items} categories={categories} />
        <HomeMoreLinkMobile {...more} />
      </Container>
    </Section>
  )
}
