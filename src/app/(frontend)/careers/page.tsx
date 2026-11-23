import type { Metadata } from 'next'

import { careerEventsJsonLd } from '@/components/careers/careers-json-ld'
import { CareersView } from '@/components/careers/careers-view'
import { getSiteUrl, siteFallback } from '@/config/site'
import { liveCareersHeroBanner, upcomingCareerEvents } from '@/lib/careers/mappers'
import { CAREERS_PATH } from '@/lib/careers/paths'
import { getCareersPageData } from '@/lib/data/careers'
import { getLeadFormConfig } from '@/lib/data/lead-form'
import { getSiteSettings } from '@/lib/data/site'
import { JsonLd } from '@/lib/seo/json-ld'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 就业服务页 /careers：服务流程、学员故事、合作企业、近期招聘活动与预约就业咨询，
 * 标题 / 简介 / 各区块文案 / SEO 来自后台「就业服务页」，首屏背景图来自后台「轮播图」（就业服务页顶部）。
 * 静态页面：内容在后台保存后按缓存标签即时失效；另每小时重新生成一次，让已过去的招聘活动按时消失、
 * 首屏背景图按投放时间窗切换（两者都在渲染时按当前时间过滤）。
 */

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const data = await getCareersPageData()
  return buildMetadata({
    seo: data.seo,
    title: data.intro.title,
    description: data.intro.description,
    path: CAREERS_PATH,
  })
}

export default async function CareersPage() {
  const [data, leadConfig, site] = await Promise.all([
    getCareersPageData(),
    getLeadFormConfig(),
    getSiteSettings(),
  ])
  // 招聘活动与首屏背景图按同一个“现在”过滤
  const now = new Date()
  const events = data.events ? upcomingCareerEvents(data.events.items, now) : []
  const heroBanner = liveCareersHeroBanner(data.heroBanners, now)
  const eventsJsonLd = careerEventsJsonLd(events, {
    siteUrl: getSiteUrl(),
    brandName: site.brandName || siteFallback.name,
  })

  return (
    <>
      {eventsJsonLd.map((event, index) => (
        <JsonLd key={index} data={event} />
      ))}
      <CareersView data={data} events={events} heroBanner={heroBanner} leadConfig={leadConfig} />
    </>
  )
}
