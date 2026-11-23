/**
 * 用 object-cover 铺满固定宽高比框的图片：按图片自身的宽高比算出 `sizes`（纯函数，可单测）。
 *
 * object-cover 把图片等比缩放到同时盖住框的宽和高。图片比框“扁”（宽高比更大）时，
 * 绘制宽度 = 框宽 × 图片宽高比 ÷ 框宽高比，比框本身宽（多出的部分被裁掉）；
 * 图片不比框扁时，绘制宽度就是框宽。`sizes` 若只写框宽，浏览器会按框宽从 srcset 里挑候选，
 * 下载的图比实际绘制的小、被拉伸发虚——首屏最大内容（LCP）的主视觉尤其明显。
 *
 * 同一个字符串要同时用于 `<img sizes>` / `<source sizes>` 与预加载的 `imageSizes`，
 * 否则预加载的候选与实际使用的不一致，会重复下载。
 */

/** 框在某个断点起的宽高比与显示宽度 */
export type CoverFrame = {
  /** 断点：视口最小宽度（px）；0 表示不限 */
  minWidth: number
  /** 框的宽高比（宽 ÷ 高），如 4 / 5 */
  ratio: number
  /** 框的显示宽度：视口宽度的百分比（vw，取略大于实际的整数），或固定像素（版心封顶时） */
  width: { vw: number } | { px: number }
}

type Dimensions = { width: number; height: number }

/** 浮点误差容差：152.00000000000003 不应进位成 153 */
const EPSILON = 1e-6

/**
 * 图片铺满（cover）宽高比为 frameRatio 的框时，绘制宽度是框宽的几倍（≥ 1）。
 * 尺寸或宽高比不是正数时按 1 处理。
 */
export function coverScale(image: Dimensions, frameRatio: number): number {
  if (!(image.width > 0 && image.height > 0 && frameRatio > 0)) return 1
  return Math.max(1, image.width / image.height / frameRatio)
}

function frameLength(image: Dimensions, frame: CoverFrame): string {
  const scale = coverScale(image, frame.ratio)
  const [value, unit] = 'vw' in frame.width ? [frame.width.vw, 'vw'] : [frame.width.px, 'px']
  return `${Math.ceil(value * scale - EPSILON)}${unit}`
}

/**
 * 按各断点的框算出 `sizes`：断点从大到小排列，最小的一个不带媒体条件（兜底）；
 * 相邻断点算出的长度相同时只保留较小的断点（结果相同，字符串更短）。
 *
 * 例：1920×800（12:5）的横幅放进 3:2 的框（95vw），绘制宽度是框宽的 1.6 倍 → `152vw`；
 * 放进 12:5 的框则不放大 → `95vw`。
 */
export function coverSizes(image: Dimensions, frames: readonly CoverFrame[]): string {
  const sorted = [...frames].sort((a, b) => b.minWidth - a.minWidth)
  const entries: string[] = []
  sorted.forEach((frame, index) => {
    const length = frameLength(image, frame)
    const next = sorted[index + 1]
    if (!next) {
      entries.push(length)
    } else if (frameLength(image, next) !== length) {
      entries.push(`(min-width: ${frame.minWidth}px) ${length}`)
    }
  })
  return entries.join(', ')
}
