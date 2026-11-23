import type { Metadata } from 'next'

import { ArticlesSection } from '@/components/home/bottom/articles-section'
import { CampusesSection } from '@/components/home/bottom/campuses-section'
import { LeadSection } from '@/components/home/bottom/lead-section'
import { PartnersSection } from '@/components/home/bottom/partners-section'
import { StoriesSection } from '@/components/home/bottom/stories-section'
import { TeachersSection } from '@/components/home/bottom/teachers-section'
import { WorksSection } from '@/components/home/bottom/works-section'
import { HOME_SECTION_ORDER } from '@/components/home/constants'
import { type HomeSectionKey, homePageFrames } from '@/components/home/rhythm'
import { CoursesRail } from '@/components/home/top/courses-rail'
import { HeroCarousel } from '@/components/home/top/hero-carousel'
import { HotDisciplines } from '@/components/home/top/hot-disciplines'
import { QuickEntries } from '@/components/home/top/quick-entries'
import { getSiteUrl } from '@/config/site'
import { zh } from '@/i18n/zh'
import { getHomePageData } from '@/lib/data/home'
import { getSiteSettings } from '@/lib/data/site'
import { homeJsonLd } from '@/lib/home/json-ld'
import type { HomePageData } from '@/lib/home/types'
import { imageSource } from '@/lib/media'
import { JsonLd } from '@/lib/seo/json-ld'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 首页：各区块的内容、开关与 SEO 全部来自后台「首页」（全局 home-page），数据由 getHomePageData() 组装。
 * - 区块顺序见 HOME_SECTION_ORDER；数据为 null 的区块（关闭 / 没有内容 / 学员故事总开关关闭）不渲染；
 * - 色调与分隔按实际渲染的区块计算（homePageFrames），任意区块关闭后仍深浅交替；
 * - 轮播图的投放时间窗按渲染时间过滤：每小时重新生成一次，到点上下线的轮播图最迟一小时内生效
 *   （后台保存内容时按缓存标签立即失效）。
 */
export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getHomePageData()
  // 首页标题不套用“%s - 品牌名”模板：后台首页 SEO → 站点默认 SEO → 品牌名
  return buildMetadata({ seo, path: '/', absoluteTitle: true })
}

/** 实际渲染的区块（主视觉总是渲染，不在其中） */
function renderedSections(data: HomePageData): HomeSectionKey[] {
  return HOME_SECTION_ORDER.filter(
    (key): key is HomeSectionKey => key !== 'hero' && data[key] !== null,
  )
}

export default async function HomePage() {
  const now = new Date()
  const [data, settings] = await Promise.all([getHomePageData(now), getSiteSettings()])
  const frames = homePageFrames(renderedSections(data))

  return (
    <>
      <JsonLd
        data={homeJsonLd({
          siteUrl: getSiteUrl(),
          brandName: data.brandName,
          description: settings.brandDescription,
          logoSrc: imageSource(settings.logo)?.src ?? null,
          hotline: settings.hotline,
          contactType: zh.home.page.contactType,
        })}
      />
      <HeroCarousel hero={data.hero} brandName={data.brandName} className={frames.hero} />
      {data.quickEntries ? (
        <QuickEntries section={data.quickEntries} {...frames.quickEntries} />
      ) : null}
      {data.hotDisciplines ? (
        <HotDisciplines section={data.hotDisciplines} {...frames.hotDisciplines} />
      ) : null}
      {data.courses ? <CoursesRail section={data.courses} now={now} {...frames.courses} /> : null}
      {data.works ? <WorksSection section={data.works} {...frames.works} /> : null}
      {data.stories ? <StoriesSection section={data.stories} {...frames.stories} /> : null}
      {data.partners ? <PartnersSection section={data.partners} {...frames.partners} /> : null}
      {data.teachers ? <TeachersSection section={data.teachers} {...frames.teachers} /> : null}
      {data.campuses ? <CampusesSection section={data.campuses} {...frames.campuses} /> : null}
      {data.articles ? <ArticlesSection section={data.articles} {...frames.articles} /> : null}
      {data.leadForm ? <LeadSection section={data.leadForm} {...frames.leadForm} /> : null}
    </>
  )
}
