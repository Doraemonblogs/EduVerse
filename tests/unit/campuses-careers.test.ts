import { describe, expect, it } from 'vitest'

import {
  formatEventDateTime,
  toCareerEvent,
  toCareerProcessSteps,
  upcomingCareerEvents,
  type CareerEventSource,
} from '@/lib/careers/mappers'
import {
  BAIDU_MAP_SRC,
  baiduMarkerUrl,
  campusCoordinates,
  campusMapLinks,
} from '@/lib/campuses/map'
import {
  toCampusCard,
  toCampusDetailBase,
  toCampusPhotos,
  type CampusDetailSource,
} from '@/lib/campuses/mappers'
import { campusPath } from '@/lib/campuses/paths'
import type { Media } from '@/payload-types'

const media = (name: string, overrides: Partial<Media> = {}): Media => ({
  id: 1,
  alt: `${name}（占位图）`,
  url: `/api/media/file/${name}.png`,
  mimeType: 'image/png',
  width: 1920,
  height: 1080,
  sizes: {
    card: { url: `/api/media/file/${name}-800.webp`, width: 800, height: 450 },
    thumbnail: { url: `/api/media/file/${name}-400.webp`, width: 400, height: 225 },
    hero: { url: `/api/media/file/${name}-1920.webp`, width: 1920, height: 1080 },
    og: { url: `/api/media/file/${name}-og.webp`, width: 1200, height: 630 },
  },
  updatedAt: '',
  createdAt: '',
  ...overrides,
})

const LOCATION = { lng: 116.310316, lat: 39.992806 }

const campus = (overrides: Partial<CampusDetailSource> = {}): CampusDetailSource => ({
  id: 3,
  name: '北京海淀校区',
  slug: 'beijing-haidian',
  city: '北京',
  address: '北京市海淀区示例路 1 号（示例地址）',
  phone: ' 010-0000 0000 ',
  openingHours: ' 周一至周日 9:00–21:00 ',
  cover: media('campus'),
  location: LOCATION,
  transit: ' 地铁 10 号线示例站 B 口\n步行约 5 分钟 ',
  photos: [
    { image: media('lobby'), caption: ' 前台接待区 ' },
    { image: 7, caption: '未填充的图片' },
    { image: media('lab', { sizes: {} }), caption: ' ' },
  ],
  ...overrides,
})

describe('校区地图外链', () => {
  it('百度地图标注页：location 为“纬度,经度”，gcj02 坐标，名称与地址编码，带调用来源', () => {
    const url = baiduMarkerUrl(LOCATION, '北京海淀校区', '海淀区 示例路')
    expect(url).toBe(
      'https://api.map.baidu.com/marker?location=39.992806,116.310316' +
        `&title=${encodeURIComponent('北京海淀校区')}` +
        `&content=${encodeURIComponent('海淀区 示例路')}` +
        `&output=html&coord_type=gcj02&src=${encodeURIComponent(BAIDU_MAP_SRC)}`,
    )
    expect(url).toContain('%20')
    // 没有地址时说明用校区名
    expect(baiduMarkerUrl(LOCATION, '北京海淀校区')).toContain(
      `content=${encodeURIComponent('北京海淀校区')}`,
    )
  })

  it('坐标缺失、超出范围或 (0, 0) 时没有地图外链', () => {
    for (const location of [null, {}, { lng: 0, lat: 0 }, { lng: 200, lat: 39 }, { lng: 116 }]) {
      expect(baiduMarkerUrl(location, '校区')).toBeNull()
      expect(campusCoordinates(location)).toBeNull()
      expect(campusMapLinks(location, '校区')).toEqual({ amap: null, baidu: null })
    }
    expect(campusCoordinates({ lng: 116.1234567, lat: 39.9876543 })).toEqual({
      lng: 116.123457,
      lat: 39.987654,
    })
  })

  it('两个外链同时给出（高德为“经度,纬度”）', () => {
    const links = campusMapLinks(LOCATION, '北京海淀校区', '示例地址')
    expect(links.amap).toContain('https://uri.amap.com/marker?position=116.310316,39.992806')
    expect(links.baidu).toContain('location=39.992806,116.310316')
  })
})

describe('校区视图模型', () => {
  it('校区卡片：去空格、tel: 链接、card 封面、高德外链', () => {
    expect(toCampusCard(campus())).toEqual({
      id: 3,
      name: '北京海淀校区',
      slug: 'beijing-haidian',
      city: '北京',
      address: '北京市海淀区示例路 1 号（示例地址）',
      phone: '010-0000 0000',
      phoneHref: 'tel:01000000000',
      openingHours: '周一至周日 9:00–21:00',
      cover: {
        src: '/api/media/file/campus-800.webp',
        alt: 'campus（占位图）',
        width: 800,
        height: 450,
      },
      mapUrl: `https://uri.amap.com/marker?position=116.310316,39.992806&name=${encodeURIComponent('北京海淀校区')}`,
    })
    expect(campusPath('beijing-haidian')).toBe('/campuses/beijing-haidian')
  })

  it('环境照片：hero 大图 + thumbnail 缩略图（没有时用原图），未填充的跳过，空说明为 null', () => {
    expect(toCampusPhotos(campus().photos)).toEqual([
      {
        image: {
          src: '/api/media/file/lobby-1920.webp',
          alt: 'lobby（占位图）',
          width: 1920,
          height: 1080,
        },
        thumb: {
          src: '/api/media/file/lobby-400.webp',
          alt: 'lobby（占位图）',
          width: 400,
          height: 225,
        },
        caption: '前台接待区',
      },
      {
        image: { src: '/api/media/file/lab.png', alt: 'lab（占位图）', width: 1920, height: 1080 },
        thumb: { src: '/api/media/file/lab.png', alt: 'lab（占位图）', width: 1920, height: 1080 },
        caption: null,
      },
    ])
    expect(toCampusPhotos(null)).toEqual([])
  })

  it('详情基础部分：首屏大图、分享图、交通、坐标与百度外链', () => {
    const detail = toCampusDetailBase(campus())
    expect(detail.heroImage?.src).toBe('/api/media/file/campus-1920.webp')
    expect(detail.shareImage?.src).toBe('/api/media/file/campus-og.webp')
    expect(detail.transit).toBe('地铁 10 号线示例站 B 口\n步行约 5 分钟')
    expect(detail.location).toEqual({ lat: 39.992806, lng: 116.310316 })
    expect(detail.baiduMapUrl).toContain('api.map.baidu.com/marker')

    const bare = toCampusDetailBase(
      campus({ location: { lng: null, lat: null }, transit: ' ', phone: null }),
    )
    expect(bare.location).toBeNull()
    expect(bare.baiduMapUrl).toBeNull()
    expect(bare.mapUrl).toBeNull()
    expect(bare.transit).toBeNull()
    expect(bare.phoneHref).toBeNull()
  })
})

const event = (overrides: Partial<CareerEventSource> = {}): CareerEventSource => ({
  id: 1,
  title: ' 作品集评审日 ',
  date: '2026-12-14T06:00:00.000Z',
  location: ' 上海徐汇校区 5 层评图室 ',
  image: null,
  description: ' 说明 ',
  registrationNote: ' ',
  campus: {
    name: '上海徐汇校区',
    slug: 'shanghai-xuhui',
    city: '上海',
    address: '示例地址',
    _status: 'published',
  },
  ...overrides,
})

describe('就业服务页视图模型', () => {
  it('服务流程：去空格，名称为空的步骤去掉', () => {
    expect(
      toCareerProcessSteps([
        { title: ' 作品集打磨 ', description: ' 逐一点评 ' },
        { title: ' ', description: '空步骤' },
        { title: '模拟面试', description: null },
      ]),
    ).toEqual([
      { title: '作品集打磨', description: '逐一点评' },
      { title: '模拟面试', description: null },
    ])
    expect(toCareerProcessSteps(undefined)).toEqual([])
  })

  it('招聘活动：已发布的校区可链接，草稿 / 未填充的校区为 null（地点文字保留）', () => {
    expect(toCareerEvent(event())).toEqual({
      id: 1,
      title: '作品集评审日',
      date: '2026-12-14T06:00:00.000Z',
      location: '上海徐汇校区 5 层评图室',
      campus: { name: '上海徐汇校区', slug: 'shanghai-xuhui', city: '上海', address: '示例地址' },
      image: null,
      description: '说明',
      registrationNote: null,
    })
    const draft = event({
      campus: { name: '草稿', slug: 'draft', city: '', address: '', _status: 'draft' },
    })
    expect(toCareerEvent(draft).campus).toBeNull()
    expect(toCareerEvent(event({ campus: 9 })).campus).toBeNull()
    expect(toCareerEvent(event({ campus: null, location: null })).location).toBeNull()
  })

  it('近期活动：北京时间今天 0 点起（今天的仍显示），按时间升序；过去的不显示', () => {
    // 北京时间 2026-11-23 10:00
    const now = new Date('2026-11-23T02:00:00.000Z')
    const items = [
      { id: 1, date: '2026-12-30T02:00:00.000Z' },
      { id: 2, date: '2026-11-22T15:59:00.000Z' }, // 北京时间 11-22 23:59：已过去
      { id: 3, date: '2026-11-22T16:00:00.000Z' }, // 北京时间 11-23 0:00：今天
      { id: 4, date: '2026-12-01T02:00:00.000Z' },
      { id: 5, date: 'not-a-date' },
    ]
    expect(upcomingCareerEvents(items, now).map((e) => e.id)).toEqual([3, 4, 1])
    // 不修改传入的数组
    expect(items.map((e) => e.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('活动时间按北京时间显示到分钟', () => {
    expect(formatEventDateTime('2026-12-14T06:00:00.000Z')).toBe('2026年12月14日 14:00')
    expect(formatEventDateTime('2026-12-14T16:05:00.000Z')).toBe('2026年12月15日 00:05')
    expect(formatEventDateTime('bad')).toBe('')
    expect(formatEventDateTime(null)).toBe('')
  })
})
