import { CAREERS_PATH } from '@/lib/careers/paths'
import type { CareerEvent } from '@/lib/careers/types'
import { absoluteUrl, type JsonLdData } from '@/lib/seo/json-ld'

import { careerEventAnchor } from './careers-layout'

/**
 * 就业服务页的 Event 结构化数据（schema.org），配合 <JsonLd data={...} /> 每场活动输出一段。
 * 纯函数：站点地址、品牌名由调用方传入，便于测试。BreadcrumbList 由面包屑组件输出。
 */

export type CareersJsonLdOptions = {
  /** 站点地址（getSiteUrl()，无末尾斜杠，子路径部署时含子路径） */
  siteUrl: string
  /** 品牌名（站点设置 brandName），作为活动的主办方 */
  brandName: string
}

/**
 * 媒体地址转绝对地址。imageSource() 给出的地址已带 basePath（如 /EduVerse/api/media/…），
 * 用 URL 解析（以 / 开头的路径替换站点地址的路径部分），子路径部署时不会重复拼接子路径。
 */
function absoluteMediaUrl(src: string, siteUrl: string): string {
  return new URL(src, `${siteUrl}/`).href
}

/**
 * 每场有实际地点的招聘活动一个 Event：名称、开始时间、线下参加、已排期、地点（Place + PostalAddress）、
 * 说明、图片（绝对地址）、主办方（品牌）与页内锚点地址。
 * 只给举办校区已发布（地址可知）的活动输出——线上直播等没有实际地址的活动不输出（Event 的 location 必须是地点）。
 * events 应是页面上实际展示的活动（已按当前时间过滤）。
 */
export function careerEventsJsonLd(
  events: readonly CareerEvent[],
  { siteUrl, brandName }: CareersJsonLdOptions,
): JsonLdData[] {
  const pageUrl = absoluteUrl(CAREERS_PATH, siteUrl)
  return events.flatMap((event) => {
    const campus = event.campus
    if (!campus || Number.isNaN(Date.parse(event.date))) return []
    const data: JsonLdData = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      startDate: event.date,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: event.location ?? campus.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: campus.address,
          addressLocality: campus.city,
          addressCountry: 'CN',
        },
      },
      organizer: { '@type': 'Organization', name: brandName, url: absoluteUrl('/', siteUrl) },
      url: `${pageUrl}#${careerEventAnchor(event.id)}`,
    }
    if (event.description) data.description = event.description
    if (event.image) data.image = [absoluteMediaUrl(event.image.src, siteUrl)]
    return [data]
  })
}
