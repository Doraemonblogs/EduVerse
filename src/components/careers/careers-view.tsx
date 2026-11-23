import { PartnerWall } from '@/components/careers/partner-wall'
import type { LeadFormConfig } from '@/components/lead/types'
import { zh } from '@/i18n/zh'
import type { CareerEvent, CareersHeroBanner, CareersPageData } from '@/lib/careers/types'

import { CareersCta } from './careers-cta'
import { CareersEvents } from './careers-events'
import { CareersHero } from './careers-hero'
import {
  CAREERS_SECTION_IDS,
  careersSectionKeys,
  careersSectionTones,
  type CareersSectionKey,
} from './careers-layout'
import { CareersProcess } from './careers-process'
import { CareersSection } from './careers-section'
import { CareersStories } from './careers-stories'

const p = zh.careers.page

type CareersViewProps = {
  data: CareersPageData
  /**
   * 页面上展示的近期招聘活动：渲染时用 upcomingCareerEvents(data.events.items, now) 过滤过的列表
   * （与 Event 结构化数据同一份）；招聘活动区块关闭时不使用
   */
  events: CareerEvent[]
  /**
   * 首屏背景图：渲染时用 liveCareersHeroBanner(data.heroBanners, now) 挑出的投放期内的一张；
   * 没有时为 null（首屏纯深色底）
   */
  heroBanner: CareersHeroBanner | null
  leadConfig: LeadFormConfig
}

/**
 * 就业服务页 /careers：
 * 首屏（深色，可有后台轮播图做背景）→ 服务流程 → 学员故事 → 合作企业 → 近期招聘活动 → 结尾行动号召（深色，含预约表单）。
 * 后台关闭或没有内容的区块整块不渲染（招聘活动开启时总是渲染，没有近期活动显示空状态）；中间区块白底 / 米色交替。
 * 广告法：页面只描述学院提供的服务，不出现就业率、薪资承诺等表述（运营文案由后台维护，系统文案见 zh.careers）。
 */
export function CareersView({ data, events, heroBanner, leadConfig }: CareersViewProps) {
  const keys = careersSectionKeys(data)
  const tones = careersSectionTones(keys)
  const tone = (key: CareersSectionKey) => tones.get(key) ?? 'light'

  return (
    <>
      <CareersHero
        intro={data.intro}
        cta={data.cta}
        banner={heroBanner}
        nextEvent={data.events ? (events[0] ?? null) : null}
      />

      {data.process ? (
        <CareersSection
          id={CAREERS_SECTION_IDS.process}
          heading={data.process.heading}
          tone={tone('process')}
        >
          <CareersProcess steps={data.process.items} />
        </CareersSection>
      ) : null}

      {data.stories ? (
        <CareersSection
          id={CAREERS_SECTION_IDS.stories}
          heading={data.stories.heading}
          tone={tone('stories')}
        >
          <CareersStories label={data.stories.heading.title} stories={data.stories.items} />
        </CareersSection>
      ) : null}

      {data.partners ? (
        <CareersSection
          id={CAREERS_SECTION_IDS.partners}
          heading={data.partners.heading}
          tone={tone('partners')}
        >
          <PartnerWall partners={data.partners.items} />
        </CareersSection>
      ) : null}

      {data.events ? (
        <CareersSection
          id={CAREERS_SECTION_IDS.events}
          heading={data.events.heading}
          fallbackDescription={p.eventsNote}
          tone={tone('events')}
        >
          <CareersEvents events={events} />
        </CareersSection>
      ) : null}

      <CareersCta cta={data.cta} config={leadConfig} />
    </>
  )
}
