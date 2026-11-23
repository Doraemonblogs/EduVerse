import { describe, expect, it, vi } from 'vitest'

import { cacheTags } from '@/hooks/revalidate'

/**
 * 就业服务页数据层的首屏背景图（mock Payload）：查询条件、只取需要的字段、不按时间过滤（缓存全部候选，
 * 渲染时再按投放时间窗挑选），以及缓存随轮播图失效。真实数据见 tests/int/careers-hero-banner.int.spec.ts。
 */

/** 记录每个 unstable_cache 的键与标签；被缓存的函数直接执行，不做缓存 */
const cached = vi.hoisted(() => new Map<string, string[]>())

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    keyParts: string[],
    options: { tags?: string[] },
  ) => {
    cached.set(keyParts.join('/'), options.tags ?? [])
    return fn
  },
  revalidateTag: vi.fn(),
}))
vi.mock('@/lib/payload', () => ({ getPayloadClient: vi.fn() }))

const { queryCareersPageData } = await import('@/lib/data/careers')

type CareersPayload = Parameters<typeof queryCareersPageData>[0]

const media = (name: string, width: number, height: number) => ({
  id: width,
  alt: name,
  url: `/api/media/file/${name}.jpg`,
  width,
  height,
  sizes: { hero: { url: `/api/media/file/${name}-${width}x${height}.webp`, width, height } },
})

describe('就业服务页数据：首屏背景图', () => {
  it('查询“就业服务页顶部”且已启用的轮播图（按排序 → ID），只取图片与投放时间窗，不按时间过滤', async () => {
    const banners = [
      {
        id: 1,
        image: media('a', 1920, 800),
        mobileImage: media('a-mobile', 750, 1000),
        startAt: '2026-12-01T00:00:00.000Z',
        endAt: null,
      },
      // 桌面图未填充：不展示
      { id: 2, image: 5, mobileImage: null, startAt: null, endAt: null },
      { id: 3, image: media('c', 1920, 800), mobileImage: null, startAt: null, endAt: null },
    ]
    const find = vi.fn(async ({ collection }: { collection: string }) => ({
      docs: collection === 'banners' ? banners : [],
    }))
    const findGlobal = vi.fn(async () => ({ id: 1 }))
    const payload = { find, findGlobal } as unknown as CareersPayload

    const data = await queryCareersPageData(payload, new Date('2026-11-23T04:00:00.000Z'))

    expect(find).toHaveBeenCalledWith({
      collection: 'banners',
      where: { and: [{ placement: { equals: 'careers_hero' } }, { active: { equals: true } }] },
      select: { image: true, mobileImage: true, startAt: true, endAt: true },
      depth: 1,
      sort: ['order', 'id'],
      pagination: false,
    })
    // 未开始的（id 1）也保留：时间窗在渲染时判断
    expect(data.heroBanners.map((banner) => banner.id)).toEqual([1, 3])
    expect(data.heroBanners[0]).toMatchObject({
      image: { src: '/api/media/file/a-1920x800.webp', width: 1920, height: 800 },
      mobileImage: { src: '/api/media/file/a-mobile-750x1000.webp', width: 750, height: 1000 },
      startAt: '2026-12-01T00:00:00.000Z',
      endAt: null,
    })
    expect(data.heroBanners[1]!.mobileImage).toEqual(data.heroBanners[1]!.image)
  })

  it('缓存随轮播图（及其图片）失效', () => {
    expect(cached.get('careers-page-data')).toEqual(
      expect.arrayContaining([cacheTags.collection('banners'), cacheTags.collection('media')]),
    )
  })
})
