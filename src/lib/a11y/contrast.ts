/**
 * WCAG 2.x 对比度计算。
 * 用于设计令牌的自动化校验（tests/unit/design-tokens.test.ts）和 /styleguide 展示。
 */

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function normalizeHex(input: string): string {
  const hex = input.trim().toLowerCase()
  if (!HEX_PATTERN.test(hex)) {
    throw new Error(`无效的十六进制颜色：${input}`)
  }
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return hex
}

function channelToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** 相对亮度（0 = 纯黑，1 = 纯白） */
export function relativeLuminance(hex: string): number {
  const value = normalizeHex(hex)
  const [r, g, b] = [1, 3, 5].map((i) => channelToLinear(parseInt(value.slice(i, i + 2), 16)))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** 两个颜色的对比度，范围 1–21 */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

/** WCAG AA 阈值：正文 4.5，大字号（≥24px 或 ≥18.66px 粗体）与界面组件 3.0 */
export const WCAG_AA = {
  text: 4.5,
  largeText: 3,
  nonText: 3,
} as const
