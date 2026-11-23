import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { liveCareersHeroBanner } from '@/lib/careers/mappers'
import config from '@/payload.config'

import { generatePlaceholder } from '../../scripts/seed/placeholders'

/**
 * 就业服务页首屏背景图（集成）：真实 Payload + 测试库，直接调用查询函数（不经过 Next 缓存）。
 * 数据层只取“就业服务页顶部”且已启用的轮播图（按排序），不按时间过滤；渲染时 liveCareersHeroBanner 按投放时间窗挑选。
 * 测试数据统一用 chb-int 前缀，开始前与结束后都会清理；测试库里已有的其它轮播图（如种子数据）不影响断言。
 */
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => fn,
  revalidateTag: vi.fn(),
}))

const { queryCareersPageData } = await import('@/lib/data/careers')

const PREFIX = 'chb-int'
const DAY = 24 * 60 * 60 * 1000
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString()

let payload: Payload
const ids = {
  media: 0,
  mobileMedia: 0,
  live: 0,
  liveNoMobile: 0,
  ended: 0,
  inactive: 0,
  homeHero: 0,
}

async function cleanup() {
  await payload.delete({ collection: 'banners', where: { title: { like: PREFIX } } })
  await payload.delete({ collection: 'media', where: { alt: { like: PREFIX } } })
}

async function uploadPlaceholder(name: string, aspect: '12:5' | '3:4m') {
  const image = await generatePlaceholder(
    { kind: 'art', seed: `${PREFIX}-${name}`, hue: 30, aspect, label: '测试', size: 64 },
    `seed-${PREFIX}-${name}`,
  )
  const doc = await payload.create({
    collection: 'media',
    data: { alt: `${PREFIX} ${name}` },
    file: {
      data: image.data,
      mimetype: image.mimetype,
      name: image.filename,
      size: image.data.length,
    },
  })
  return doc.id
}

async function createBanner(
  title: string,
  data: {
    placement: 'home_hero' | 'careers_hero'
    active: boolean
    order: number
    mobile?: boolean
    startAt?: string
    endAt?: string
  },
) {
  const doc = await payload.create({
    collection: 'banners',
    data: {
      title: `${PREFIX} ${title}`,
      image: ids.media,
      mobileImage: data.mobile === false ? null : ids.mobileMedia,
      placement: data.placement,
      active: data.active,
      order: data.order,
      startAt: data.startAt ?? null,
      endAt: data.endAt ?? null,
    },
  })
  return doc.id
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await cleanup()
  ids.media = await uploadPlaceholder('desktop', '12:5')
  ids.mobileMedia = await uploadPlaceholder('mobile', '3:4m')
  // 排序：已结束（-3）→ 投放中（-2）→ 没有移动端图（-1）；未启用与首页主视觉不应出现
  ids.ended = await createBanner('已结束', {
    placement: 'careers_hero',
    active: true,
    order: -3,
    startAt: inDays(-30),
    endAt: inDays(-1),
  })
  ids.live = await createBanner('投放中', {
    placement: 'careers_hero',
    active: true,
    order: -2,
    startAt: inDays(-1),
    endAt: inDays(30),
  })
  ids.liveNoMobile = await createBanner('没有移动端图', {
    placement: 'careers_hero',
    active: true,
    order: -1,
    mobile: false,
  })
  ids.inactive = await createBanner('未启用', {
    placement: 'careers_hero',
    active: false,
    order: -4,
  })
  ids.homeHero = await createBanner('首页主视觉', {
    placement: 'home_hero',
    active: true,
    order: -5,
  })
})

afterAll(async () => {
  if (!payload) return
  await cleanup()
})

describe('就业服务页首屏背景图', () => {
  it('候选只含“就业服务页顶部”且已启用的轮播图，按排序，不按时间过滤；两张图都是 hero 尺寸', async () => {
    const { heroBanners } = await queryCareersPageData(payload)
    const mine = heroBanners.filter((banner) =>
      [ids.live, ids.liveNoMobile, ids.ended, ids.inactive, ids.homeHero].includes(banner.id),
    )
    expect(mine.map((banner) => banner.id)).toEqual([ids.ended, ids.live, ids.liveNoMobile])

    const live = mine.find((banner) => banner.id === ids.live)!
    expect(live.image.src).toMatch(/\/api\/media\/file\/.+\.webp$/)
    expect(live.mobileImage.src).not.toBe(live.image.src)
    expect(live.mobileImage.height).toBeGreaterThan(live.mobileImage.width)
    // 没有移动端图时用桌面图
    const noMobile = mine.find((banner) => banner.id === ids.liveNoMobile)!
    expect(noMobile.mobileImage).toEqual(noMobile.image)
  })

  it('渲染时取第一张在投放时间窗内的（已结束的跳过）；时间窗过后换成下一张', async () => {
    const { heroBanners } = await queryCareersPageData(payload)
    const mine = heroBanners.filter((banner) =>
      [ids.live, ids.liveNoMobile, ids.ended].includes(banner.id),
    )
    expect(liveCareersHeroBanner(mine, new Date())?.id).toBe(ids.live)
    expect(liveCareersHeroBanner(mine, new Date(Date.now() + 31 * DAY))?.id).toBe(ids.liveNoMobile)
  })
})
