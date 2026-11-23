import type { SectionTone } from '@/components/common/section'
import type { CareersPageData } from '@/lib/careers/types'

/**
 * 就业服务页（/careers）的纯函数与常量：区块 id、区块取舍与底色、服务流程的列数。
 * 页面路径见 src/lib/careers/paths.ts（CAREERS_PATH）；故事正文是否为空用 src/lib/rich-text-filled.ts。
 */

/** 首屏 h1 的 id（首屏区块用 aria-labelledby 关联） */
export const CAREERS_TITLE_ID = 'careers-title'

/** 各区块的 id（页内锚点；标题 id 为 `${id}-title`） */
export const CAREERS_SECTION_IDS = {
  process: 'careers-process',
  stories: 'careers-stories',
  partners: 'careers-partners',
  events: 'careers-events',
  cta: 'careers-cta',
} as const

/**
 * 每个版心都加：桌面端（lg 起）右侧给悬浮操作栏让位（见 globals.css 的 avoid-floating-actions）。
 * 1024–1439px 时贴着版心右缘的内容（故事卡片、Logo 墙、活动卡片、结尾表单）会被悬浮栏盖住；
 * 全页统一让位，上下区块的右缘也对齐（与首页的 HOME_CONTAINER_CLASS 同一做法）。
 */
export const CAREERS_CONTAINER_CLASS = 'lg:avoid-floating-actions'

/**
 * 石墨遮罩（不用彩色渐变）：保证首屏文字在任何背景图上都达到 WCAG AA（单元测试按设计令牌校验）。
 * 次要文字（面包屑、眉标、描述，muted-foreground）压在纯白图片上也要 ≥ 4.5:1，文字下方的遮罩不透明度须 ≥ 82%：
 * - single：单栏（< lg，或没有活动卡片时）文字铺满整个首屏，整体 85%；
 * - split：两栏（≥ lg 且有活动卡片）时文字只在左侧 7/12 栏（实测不超过首屏宽度的 55%）：
 *   自左 95% 渐变到 55% 处的 85%，再到右缘 45%，图片在右侧露出；右栏的活动卡片是实色卡片，不受背景影响。
 */
export const CAREERS_HERO_SCRIM_CLASS = {
  single: 'bg-background/85',
  split:
    'bg-background/85 lg:bg-transparent lg:bg-linear-to-r lg:from-background/95 lg:via-background/85 lg:via-55% lg:to-background/45',
} as const

/** 招聘活动卡片的 id（页内锚点；Event 结构化数据的 url 也指向它） */
export function careerEventAnchor(id: number): string {
  return `career-event-${id}`
}

/** 首屏之后可能出现的内容区块（按页面顺序）；结尾行动号召总是出现，不在其中 */
export type CareersSectionKey = 'process' | 'stories' | 'partners' | 'events'

/**
 * 实际渲染的区块：后台关闭或没有内容的区块（数据为 null）不渲染；
 * 招聘活动区块开启时总是渲染（没有近期活动时显示空状态）。
 */
export function careersSectionKeys(
  data: Pick<CareersPageData, 'process' | 'stories' | 'partners' | 'events'>,
): CareersSectionKey[] {
  const keys: CareersSectionKey[] = []
  if (data.process) keys.push('process')
  if (data.stories) keys.push('stories')
  if (data.partners) keys.push('partners')
  if (data.events) keys.push('events')
  return keys
}

/**
 * 给实际渲染的区块分配底色：首屏与结尾行动号召是深色，中间的区块白底 / 米色交替
 * （首屏之后从白底开始，缺了某个区块也保证相邻两个区块底色不同）。
 */
export function careersSectionTones(
  keys: readonly CareersSectionKey[],
): Map<CareersSectionKey, SectionTone> {
  const tones = new Map<CareersSectionKey, SectionTone>()
  keys.forEach((key, index) => tones.set(key, index % 2 === 0 ? 'light' : 'paper'))
  return tones
}

/**
 * 服务流程在桌面端（lg）的列数：不超过 4 步时一行排完；5、6 步排成 3 列两行（避免 5 + 1 或 6 列过窄）。
 * 平板（sm）起两列（只有 1 步时一列）。类名写全，Tailwind 才能扫描到。
 */
export function processGridClass(count: number): string {
  if (count <= 1) return ''
  if (count === 2) return 'sm:grid-cols-2'
  if (count === 3) return 'sm:grid-cols-2 lg:grid-cols-3'
  if (count === 4) return 'sm:grid-cols-2 lg:grid-cols-4'
  return 'sm:grid-cols-2 lg:grid-cols-3'
}

/** 服务流程的步骤序号：01、02…（两位数，视觉装饰；有序列表本身向读屏传达顺序） */
export function stepNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}
