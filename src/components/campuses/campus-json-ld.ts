import { campusPath } from '@/lib/campuses/paths'
import type { CampusDetail } from '@/lib/campuses/types'
import { gcj02ToWgs84 } from '@/lib/geo'
import { absoluteUrl, type JsonLdData } from '@/lib/seo/json-ld'

/**
 * 校区详情页的 EducationalOrganization 结构化数据（schema.org），配合 <JsonLd data={...} /> 输出。
 * 纯函数：站点地址、品牌名由调用方传入，便于测试。BreadcrumbList 由面包屑组件输出。
 */

export type CampusJsonLdOptions = {
  /** 站点地址（getSiteUrl()，无末尾斜杠，子路径部署时含子路径） */
  siteUrl: string
  /** 品牌名（站点设置 brandName），作为上级机构 parentOrganization */
  brandName: string
}

/**
 * 媒体地址转绝对地址。imageSource() 给出的地址已带 basePath（如 /EduVerse/api/media/…），
 * 用 URL 解析（以 / 开头的路径替换站点地址的路径部分），子路径部署时不会重复拼接子路径。
 */
function absoluteMediaUrl(src: string, siteUrl: string): string {
  return new URL(src, `${siteUrl}/`).href
}

/** 结构化数据里坐标的小数位数：6 位约 0.1 米 */
const GEO_DECIMALS = 6

const roundCoordinate = (value: number) => Number(value.toFixed(GEO_DECIMALS))

/**
 * EducationalOrganization：校区名、详情页地址、地址（PostalAddress：街道地址、城市、国家 CN）、
 * 电话、坐标（GeoCoordinates）、图片（分享图 → 首屏大图，绝对地址）与上级机构。
 * 坐标：后台填写的是高德坐标（GCJ-02），schema.org 的经纬度是 WGS 84，两者在大陆相差几百米，
 * 输出前用 gcj02ToWgs84() 换算（保留 6 位小数）；地图外链仍直接用 GCJ-02（见 src/lib/campuses/map.ts）。
 * 没有的项不输出。开放时间是后台填写的自由文本（如“周一至周日 9:00–21:00”），
 * 不符合 openingHours 的格式要求（Mo-Su 09:00-21:00），不输出。
 */
export function campusJsonLd(
  campus: Pick<
    CampusDetail,
    'slug' | 'name' | 'city' | 'address' | 'phone' | 'location' | 'shareImage' | 'heroImage'
  >,
  { siteUrl, brandName }: CampusJsonLdOptions,
): JsonLdData {
  const address: JsonLdData = {
    '@type': 'PostalAddress',
    streetAddress: campus.address.trim(),
    addressCountry: 'CN',
  }
  const city = campus.city.trim()
  if (city) address.addressLocality = city

  const data: JsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: campus.name,
    url: absoluteUrl(campusPath(campus.slug), siteUrl),
    address,
    parentOrganization: {
      '@type': 'Organization',
      name: brandName,
      url: absoluteUrl('/', siteUrl),
    },
  }
  const telephone = campus.phone?.trim()
  if (telephone) data.telephone = telephone
  if (campus.location) {
    const { lat, lng } = gcj02ToWgs84(campus.location)
    data.geo = {
      '@type': 'GeoCoordinates',
      latitude: roundCoordinate(lat),
      longitude: roundCoordinate(lng),
    }
  }
  const image = campus.shareImage ?? campus.heroImage
  if (image) data.image = absoluteMediaUrl(image.src, siteUrl)
  return data
}
