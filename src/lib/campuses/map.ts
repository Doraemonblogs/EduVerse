import { amapMarkerUrl } from '@/lib/home/map'

/**
 * 校区的地图外链（纯函数）：高德地图标注页（复用 src/lib/home/map.ts）与百度地图标注页。
 * 只输出“在地图中打开”的普通链接（新窗口、rel="noopener noreferrer"），页面不加载任何地图脚本、不请求第三方。
 * 坐标为高德坐标系（GCJ-02，后台“地图坐标”字段）。
 */

export { amapMarkerUrl, telHref } from '@/lib/home/map'

/** 百度地图标注页（URI API，网页版） */
export const BAIDU_MARKER_URL = 'https://api.map.baidu.com/marker'

/** 百度 URI API 要求的调用来源标识（格式 webapp.公司名.应用名，不含个人信息） */
export const BAIDU_MAP_SRC = 'webapp.eduverse.site'

type Coordinates = { lng?: number | null; lat?: number | null }

const isCoordinate = (value: unknown, limit: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit

/** 合法坐标（6 位小数）；缺失、不是数字、超出范围或 (0, 0)（视为未填写）时返回 null */
export function campusCoordinates(
  location: Coordinates | null | undefined,
): { lat: number; lng: number } | null {
  const lng = location?.lng
  const lat = location?.lat
  if (!isCoordinate(lng, 180) || !isCoordinate(lat, 90)) return null
  if (lng === 0 && lat === 0) return null
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
}

/**
 * 百度地图标注页：
 * `https://api.map.baidu.com/marker?location=纬度,经度&title=名称&content=地址&output=html&coord_type=gcj02&src=…`。
 * 注意百度的 location 是“纬度,经度”（与高德相反）；coord_type=gcj02 告诉百度坐标是高德坐标系，由它换算。
 * 坐标不合法时返回 null（不显示链接）。名称、地址做 URL 编码（空格为 %20）。
 */
export function baiduMarkerUrl(
  location: Coordinates | null | undefined,
  name: string,
  address = '',
): string | null {
  const point = campusCoordinates(location)
  if (!point) return null
  const params = [
    `location=${point.lat},${point.lng}`,
    `title=${encodeURIComponent(name.trim())}`,
    `content=${encodeURIComponent(address.trim() || name.trim())}`,
    'output=html',
    'coord_type=gcj02',
    `src=${encodeURIComponent(BAIDU_MAP_SRC)}`,
  ]
  return `${BAIDU_MARKER_URL}?${params.join('&')}`
}

/** 校区详情的两个地图外链；没有坐标时都为 null */
export function campusMapLinks(
  location: Coordinates | null | undefined,
  name: string,
  address = '',
): { amap: string | null; baidu: string | null } {
  return { amap: amapMarkerUrl(location, name), baidu: baiduMarkerUrl(location, name, address) }
}
