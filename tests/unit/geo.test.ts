import { describe, expect, it } from 'vitest'

import { gcj02ToWgs84, isOutsideMainlandChina, wgs84ToGcj02, type LatLng } from '@/lib/geo'

/**
 * 坐标系换算：参考点取自常见开源实现（coordtransform、eviltransform）公开的测试数据，
 * 每组为同一地点的 WGS 84 与 GCJ-02 坐标。
 */
const REFERENCE: { name: string; wgs: LatLng; gcj: LatLng }[] = [
  {
    name: '北京',
    wgs: { lat: 39.911954, lng: 116.377817 },
    gcj: { lat: 39.91334545536069, lng: 116.38404722455657 },
  },
  {
    name: '上海',
    wgs: { lat: 31.1774276, lng: 121.5272106 },
    gcj: { lat: 31.17530398364597, lng: 121.531541859215 },
  },
  {
    name: '深圳',
    wgs: { lat: 22.543847, lng: 113.912316 },
    gcj: { lat: 22.540796131694766, lng: 113.9171764808363 },
  },
  {
    name: '北京（天安门附近）',
    wgs: { lat: 39.915, lng: 116.404 },
    gcj: { lat: 39.91640428150164, lng: 116.41024449916938 },
  },
]

/** 两点间的近似距离（米，等距矩形投影，几公里内足够准确） */
function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000
  const rad = Math.PI / 180
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad)
  const y = (b.lat - a.lat) * rad
  return Math.hypot(x, y) * R
}

describe('坐标系换算（GCJ-02 ↔ WGS 84）', () => {
  it.each(REFERENCE)('WGS 84 → GCJ-02 与参考数据一致：$name', ({ wgs, gcj }) => {
    const result = wgs84ToGcj02(wgs)
    expect(result.lat).toBeCloseTo(gcj.lat, 9)
    expect(result.lng).toBeCloseTo(gcj.lng, 9)
  })

  it.each(REFERENCE)('GCJ-02 → WGS 84 还原参考点，误差小于 1 厘米：$name', ({ wgs, gcj }) => {
    const result = gcj02ToWgs84(gcj)
    expect(distanceMeters(result, wgs)).toBeLessThan(0.01)
    // 结构化数据保留 6 位小数：与参考值一致
    expect(result.lat).toBeCloseTo(wgs.lat, 6)
    expect(result.lng).toBeCloseTo(wgs.lng, 6)
  })

  it('大陆的偏移在几百米量级：换算前后的距离在 100–1000 米之间', () => {
    for (const { wgs, gcj } of REFERENCE) {
      const offset = distanceMeters(wgs, gcj)
      expect(offset).toBeGreaterThan(100)
      expect(offset).toBeLessThan(1000)
    }
  })

  it('任意大陆坐标往返换算（GCJ-02 → WGS 84 → GCJ-02）回到原值', () => {
    const points: LatLng[] = [
      { lat: 39.98, lng: 116.31 }, // 种子：北京海淀校区
      { lat: 30.66, lng: 104.06 },
      { lat: 45.75, lng: 126.63 },
      { lat: 18.25, lng: 109.51 },
      { lat: 43.82, lng: 87.62 },
    ]
    for (const point of points) {
      const back = wgs84ToGcj02(gcj02ToWgs84(point))
      expect(distanceMeters(back, point)).toBeLessThan(0.01)
    }
  })

  it('中国大陆范围以外不偏移，原样返回', () => {
    const tokyo = { lat: 35.6812, lng: 139.7671 }
    const london = { lat: 51.5072, lng: -0.1276 }
    for (const point of [tokyo, london]) {
      expect(isOutsideMainlandChina(point)).toBe(true)
      expect(gcj02ToWgs84(point)).toEqual(point)
      expect(wgs84ToGcj02(point)).toEqual(point)
    }
    expect(isOutsideMainlandChina({ lat: 39.98, lng: 116.31 })).toBe(false)
  })

  it('返回新对象，不修改传入的坐标', () => {
    const point = { lat: 39.98, lng: 116.31 }
    const result = gcj02ToWgs84(point)
    expect(point).toEqual({ lat: 39.98, lng: 116.31 })
    expect(result).not.toBe(point)
  })
})
