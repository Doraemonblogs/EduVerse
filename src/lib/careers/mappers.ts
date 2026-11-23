import { publishedDoc } from '@/lib/course/mappers'
import { beijingDayStart } from '@/lib/course/cohorts'
import { liveBanners } from '@/lib/home/rules'
import { imageSource } from '@/lib/media'
import type { Banner, Campus, CareerEvent as CareerEventDoc, CareersPage } from '@/payload-types'

import type { CareerEvent, CareerProcessStep, CareersHeroBanner } from './types'

/**
 * Payload 文档 → 就业服务页视图模型，以及招聘活动、首屏背景图的时间过滤（纯函数，可单测）。
 */

type Relation<T> = number | T | null | undefined

const textOrNull = (value: string | null | undefined) => value?.trim() || null

/** 服务流程步骤：去掉名称为空的步骤 */
export function toCareerProcessSteps(
  steps: NonNullable<CareersPage['process']>['steps'],
): CareerProcessStep[] {
  return (steps ?? [])
    .map((step) => ({ title: step.title?.trim() ?? '', description: textOrNull(step.description) }))
    .filter((step) => step.title)
}

export type CareerEventSource = Pick<
  CareerEventDoc,
  'id' | 'title' | 'date' | 'location' | 'image' | 'description' | 'registrationNote'
> & {
  campus?: Relation<Pick<Campus, 'name' | 'slug' | 'city' | 'address' | '_status'>>
}

/** 招聘活动；校区只在已填充且已发布时给出 */
export function toCareerEvent(event: CareerEventSource): CareerEvent {
  const campus = publishedDoc(event.campus)
  return {
    id: event.id,
    title: event.title.trim(),
    date: event.date,
    location: textOrNull(event.location),
    campus: campus
      ? { name: campus.name, slug: campus.slug, city: campus.city, address: campus.address }
      : null,
    image: imageSource(event.image, 'card'),
    description: textOrNull(event.description),
    registrationNote: textOrNull(event.registrationNote),
  }
}

/**
 * 近期招聘活动：活动时间 ≥ 北京时间今天 0 点（今天举办的仍显示），按时间升序（相同时按 ID）。
 * 过去的活动不显示。不修改传入的数组。
 *
 * 用法（服务端组件渲染时）：`upcomingCareerEvents(data.events.items, new Date())`
 */
export function upcomingCareerEvents<T extends Pick<CareerEvent, 'id' | 'date'>>(
  events: readonly T[],
  now: Date,
): T[] {
  const from = beijingDayStart(now)
  return events
    .filter((event) => {
      const time = Date.parse(event.date)
      return !Number.isNaN(time) && time >= from
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id - b.id)
}

/** 北京时间的“2026年11月30日 14:00”（招聘活动时间）；无效日期返回空字符串 */
const beijingDateTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatEventDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = Object.fromEntries(
    beijingDateTime.formatToParts(date).map((part) => [part.type, part.value]),
  )
  return `${parts.year}年${Number(parts.month)}月${Number(parts.day)}日 ${parts.hour}:${parts.minute}`
}

export type CareersHeroBannerSource = Pick<
  Banner,
  'id' | 'image' | 'mobileImage' | 'startAt' | 'endAt'
>

/**
 * 首屏背景图（“就业服务页顶部”轮播图）；桌面图未填充 / 没有地址时返回 null（不展示）。
 * 两张图都取 hero 尺寸：首屏通栏铺满，object-cover 裁切时绘制宽度最多约 1.5 倍视口，card 尺寸（800）不够用；
 * 没有移动端图时用桌面图（组件按宽高比放大 sizes，见 coverSizes）。
 */
export function toCareersHeroBanner(banner: CareersHeroBannerSource): CareersHeroBanner | null {
  const image = imageSource(banner.image, 'hero')
  const mobileImage = imageSource(banner.mobileImage, 'hero') ?? image
  if (!image || !mobileImage) return null
  return {
    id: banner.id,
    image,
    mobileImage,
    startAt: banner.startAt ?? null,
    endAt: banner.endAt ?? null,
  }
}

/**
 * 渲染时的首屏背景图：候选（已按后台排序）里第一张在投放时间窗内的（开始时间不晚于 now、结束时间晚于 now，
 * 规则同首页主视觉 isBannerLive）；没有时返回 null，首屏用纯深色底。
 *
 * 用法（服务端组件渲染时）：`liveCareersHeroBanner(data.heroBanners, new Date())`
 */
export function liveCareersHeroBanner<T extends Pick<CareersHeroBanner, 'startAt' | 'endAt'>>(
  banners: readonly T[],
  now: Date | number,
): T | null {
  return liveBanners(banners, now, 1)[0] ?? null
}
