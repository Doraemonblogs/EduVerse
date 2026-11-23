import { imageSource } from '@/lib/media'
import type { Campus } from '@/payload-types'

import { amapMarkerUrl, baiduMarkerUrl, campusCoordinates, telHref } from './map'
import type { CampusCardData, CampusPhoto } from './types'

/**
 * Payload 文档 → 校区视图模型（纯函数，供 src/lib/data/campuses.ts 与首页数据层使用，可单测）。
 * 发布状态由查询条件保证。
 */

const textOrNull = (value: string | null | undefined) => value?.trim() || null

export type CampusCardSource = Pick<
  Campus,
  'id' | 'name' | 'slug' | 'city' | 'address' | 'phone' | 'openingHours' | 'cover' | 'location'
>

/** 校区 → 卡片（首页“校区分布”与校区列表共用） */
export function toCampusCard(campus: CampusCardSource): CampusCardData {
  const phone = textOrNull(campus.phone)
  return {
    id: campus.id,
    name: campus.name,
    slug: campus.slug,
    city: campus.city,
    address: campus.address,
    phone,
    phoneHref: telHref(phone),
    openingHours: textOrNull(campus.openingHours),
    cover: imageSource(campus.cover, 'card'),
    mapUrl: amapMarkerUrl(campus.location, campus.name),
  }
}

/** 环境照片：图片未填充 / 没有地址的跳过；缩略图没有 thumbnail 尺寸时用原图 */
export function toCampusPhotos(photos: Campus['photos']): CampusPhoto[] {
  const result: CampusPhoto[] = []
  for (const photo of photos ?? []) {
    const image = imageSource(photo.image, 'hero')
    const thumb = imageSource(photo.image, 'thumbnail') ?? image
    if (!image || !thumb) continue
    result.push({ image, thumb, caption: textOrNull(photo.caption) })
  }
  return result
}

export type CampusDetailSource = CampusCardSource & Pick<Campus, 'transit' | 'photos'>

/** 校区详情中不需要再查库的部分（课程、开班、讲师、SEO 由数据层补充） */
export function toCampusDetailBase(campus: CampusDetailSource) {
  return {
    ...toCampusCard(campus),
    heroImage: imageSource(campus.cover, 'hero'),
    shareImage: imageSource(campus.cover, 'og'),
    transit: textOrNull(campus.transit),
    location: campusCoordinates(campus.location),
    baiduMapUrl: baiduMarkerUrl(campus.location, campus.name, campus.address),
    photos: toCampusPhotos(campus.photos),
  }
}
