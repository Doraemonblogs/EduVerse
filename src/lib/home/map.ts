/**
 * 校区卡片的联系方式链接（纯函数）。
 * 地图只输出“在高德地图中打开”的普通链接（新窗口），页面不加载任何地图脚本、不请求第三方。
 */

/** 高德地图标注页（URI API） */
export const AMAP_MARKER_URL = 'https://uri.amap.com/marker'

type Coordinates = {
  lng?: number | null
  lat?: number | null
}

const isCoordinate = (value: unknown, limit: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit

/**
 * 高德地图标注页地址：`https://uri.amap.com/marker?position=经度,纬度&name=名称`。
 * 坐标为高德坐标系（GCJ-02，后台“地图坐标”字段）；经纬度缺失、不是数字或超出范围时返回 null（不显示链接）。
 * (0, 0) 视为未填写。坐标保留 6 位小数，名称做 URL 编码。
 */
export function amapMarkerUrl(
  location: Coordinates | null | undefined,
  name: string,
): string | null {
  const lng = location?.lng
  const lat = location?.lat
  if (!isCoordinate(lng, 180) || !isCoordinate(lat, 90)) return null
  if (lng === 0 && lat === 0) return null
  const position = `${Number(lng.toFixed(6))},${Number(lat.toFixed(6))}`
  // 名称用 encodeURIComponent（空格编码为 %20 而不是 +）；坐标中的逗号保留，与高德文档示例一致
  return `${AMAP_MARKER_URL}?position=${position}&name=${encodeURIComponent(name.trim())}`
}

/** 电话号码的 tel: 链接：只保留数字与 +（“400-000-0000” → “tel:4000000000”）；没有数字时返回 null */
export function telHref(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/[^\d+]/g, '') ?? ''
  return /\d/.test(digits) ? `tel:${digits}` : null
}
