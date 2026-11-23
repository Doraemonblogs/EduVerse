/**
 * 坐标系换算（纯函数）：GCJ-02（国测局坐标，高德 / 腾讯地图在用，后台校区“地图坐标”填写的就是它）↔ WGS 84（GPS、schema.org）。
 *
 * 中国大陆的地图按 GCJ-02 加密偏移，与 WGS 84 相差约 300–700 米：给地图服务的链接直接用 GCJ-02
 * （高德原生、百度传 coord_type=gcj02），写进结构化数据（schema.org GeoCoordinates 规定为 WGS 84）时要先换算。
 *
 * - wgs84ToGcj02：公开的标准偏移算法（克拉索夫斯基椭球参数），与常见开源实现（coordtransform、eviltransform）一致；
 * - gcj02ToWgs84：偏移没有解析逆运算，用迭代逼近（每轮把正算结果与目标的差补回去），误差在厘米级以内；
 * - 中国大陆范围以外（粗略的矩形范围）没有偏移，原样返回。
 */

export type LatLng = { lat: number; lng: number }

/** 克拉索夫斯基椭球长半轴（米）与第一偏心率的平方：偏移算法使用的参数 */
const A = 6_378_245
const EE = 0.006_693_421_622_965_943

/** 粗略判断是否在中国大陆范围以外（与常见实现相同的矩形范围，范围外不偏移） */
export function isOutsideMainlandChina({ lat, lng }: LatLng): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x: number, y: number): number {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
  ret += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3
  ret += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3
  return ret
}

function transformLng(x: number, y: number): number {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
  ret += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3
  ret += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3
  return ret
}

/** WGS 84 → GCJ-02 的偏移量（度） */
function gcjOffset({ lat, lng }: LatLng): LatLng {
  const radLat = (lat / 180) * Math.PI
  const magic = 1 - EE * Math.sin(radLat) * Math.sin(radLat)
  const sqrtMagic = Math.sqrt(magic)
  const dLat =
    (transformLat(lng - 105, lat - 35) * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * Math.PI)
  const dLng =
    (transformLng(lng - 105, lat - 35) * 180) / ((A / sqrtMagic) * Math.cos(radLat) * Math.PI)
  return { lat: dLat, lng: dLng }
}

/** WGS 84 → GCJ-02；中国大陆范围以外原样返回 */
export function wgs84ToGcj02(point: LatLng): LatLng {
  if (isOutsideMainlandChina(point)) return { lat: point.lat, lng: point.lng }
  const offset = gcjOffset(point)
  return { lat: point.lat + offset.lat, lng: point.lng + offset.lng }
}

/** 迭代逼近的收敛阈值（度）：约 1 厘米 */
const PRECISION = 1e-7
const MAX_ITERATIONS = 30

/**
 * GCJ-02 → WGS 84（迭代逼近，误差约 1 厘米以内）；中国大陆范围以外原样返回。
 * 先用“减去该点的偏移”得到初值（误差约 1–2 米），再反复用正算结果修正，直到正算回 GCJ-02 与输入的差小于 PRECISION。
 */
export function gcj02ToWgs84(point: LatLng): LatLng {
  if (isOutsideMainlandChina(point)) return { lat: point.lat, lng: point.lng }
  const initial = gcjOffset(point)
  let wgs: LatLng = { lat: point.lat - initial.lat, lng: point.lng - initial.lng }
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const gcj = wgs84ToGcj02(wgs)
    const dLat = gcj.lat - point.lat
    const dLng = gcj.lng - point.lng
    if (Math.abs(dLat) < PRECISION && Math.abs(dLng) < PRECISION) break
    wgs = { lat: wgs.lat - dLat, lng: wgs.lng - dLng }
  }
  return wgs
}
