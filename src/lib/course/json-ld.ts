import { absoluteUrl, type JsonLdData } from '@/lib/seo/json-ld'

import { upcomingCohorts } from './cohorts'
import { toBeijingIsoDate } from './format'
import { coursePath } from './paths'
import type { CourseCardData, CourseDetail, CourseDuration, DeliveryMode, FaqItem } from './types'

/**
 * 课程模块的结构化数据（schema.org），配合 <JsonLd data={...} />（src/lib/seo/json-ld.tsx）输出。
 * 纯函数：站点地址、品牌名、当前时间都由调用方传入，便于测试。
 */

export type CourseJsonLdOptions = {
  /** 站点地址（getSiteUrl()，无末尾斜杠，子路径部署时含子路径） */
  siteUrl: string
  /** 品牌名（站点设置 brandName） */
  brandName: string
  /** 当前时间：只输出未开班的开班计划 */
  now: Date
}

/** schema.org courseMode：线下 → Onsite，线上 → Online，双师 → Blended */
const COURSE_MODE: Record<DeliveryMode, string> = {
  offline: 'Onsite',
  online: 'Online',
  dual: 'Blended',
}

/** 课程时长转 ISO 8601 时长：7 个月 → P7M，8 周 → P8W */
function isoDuration(duration: CourseDuration | null): string | undefined {
  if (!duration || !Number.isInteger(duration.value) || duration.value <= 0) return undefined
  return `P${duration.value}${duration.unit === 'month' ? 'M' : 'W'}`
}

/**
 * 媒体地址转绝对地址。imageSource() 给出的地址已带 basePath（如 /EduVerse/api/media/…），
 * 用 URL 解析（以 / 开头的路径替换站点地址的路径部分），子路径部署时不会重复拼接子路径。
 */
function absoluteMediaUrl(src: string, siteUrl: string): string {
  return new URL(src, `${siteUrl}/`).href
}

/** 去掉值为 undefined 的键，输出更干净的 JSON */
function compact(data: Record<string, unknown>): JsonLdData {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}

/**
 * Course 结构化数据：课程名称、简介、地址、封面、机构，以及每个未开班的开班计划（CourseInstance）。
 * - courseMode：offline → Onsite、online → Online、dual → Blended；
 * - startDate / endDate：北京时间的日期（YYYY-MM-DD）；
 * - location：校区名与地址（线上开班没有 location）；
 * - 课程没有公开价格，不输出 offers。
 */
export function courseJsonLd(
  course: CourseDetail,
  { siteUrl, brandName, now }: CourseJsonLdOptions,
): JsonLdData {
  const url = absoluteUrl(coursePath(course.slug), siteUrl)
  const image = course.heroImage ?? course.cover
  const provider = { '@type': 'Organization', name: brandName, url: absoluteUrl('/', siteUrl) }
  const instances = upcomingCohorts(course.cohorts, now).map((cohort) =>
    compact({
      '@type': 'CourseInstance',
      courseMode: COURSE_MODE[cohort.mode],
      startDate: toBeijingIsoDate(cohort.startDate) || undefined,
      endDate: toBeijingIsoDate(cohort.endDate) || undefined,
      location: cohort.campus
        ? {
            '@type': 'Place',
            name: cohort.campus.name,
            address: {
              '@type': 'PostalAddress',
              streetAddress: cohort.campus.address,
              addressLocality: cohort.campus.city,
              addressCountry: 'CN',
            },
          }
        : undefined,
    }),
  )

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.summary,
    url,
    image: image ? absoluteMediaUrl(image.src, siteUrl) : undefined,
    inLanguage: 'zh-CN',
    timeRequired: isoDuration(course.duration),
    about: course.discipline.name,
    provider,
    hasCourseInstance: instances.length > 0 ? instances : undefined,
  })
}

/** FAQPage 结构化数据；没有问题时返回 null（页面不输出） */
export function faqPageJsonLd(faqs: readonly FaqItem[]): JsonLdData | null {
  if (faqs.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/**
 * 课程清单的 ItemList 结构化数据（课程列表页、专业方向页可选输出）：按展示顺序列出课程详情页地址。
 * 没有课程时返回 null。
 */
export function courseItemListJsonLd(
  courses: readonly Pick<CourseCardData, 'slug' | 'title'>[],
  siteUrl: string,
): JsonLdData | null {
  if (courses.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: courses.map((course, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(coursePath(course.slug), siteUrl),
      name: course.title,
    })),
  }
}
