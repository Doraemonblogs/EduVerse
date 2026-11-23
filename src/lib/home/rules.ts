import type { CourseCardData } from '@/lib/course/types'

import type { HomeArticleCategory, HomeBanner, HomeSectionHeading } from './types'

/**
 * 首页区块的取数规则（纯函数，供 src/lib/data/home.ts 使用，可单测）。
 *
 * 规则概要（后台“指定”留空、或指定的内容全部不可用时，走自动规则）：
 * - 主视觉：投放位置 = 首页主视觉、已启用，按排序；渲染时按当前时间过滤时间窗（isBannerLive）；
 * - 热门专业：指定专业（按所选顺序）→ 否则已发布且“在导航中显示”的专业（按排序），最多 8 个；
 * - 精选课程：指定课程（按所选顺序）→ 否则每个专业方向排序最靠前的长期就业班（按专业方向排序）；
 * - 学员作品：manual 指定作品（按所选顺序）→ 否则只取精选作品（发布时间降序，最多 limit 件；
 *   不足时有多少展示多少，不用非精选作品补足）；
 * - 学员故事：指定故事（按所选顺序）→ 否则精选故事（按排序）；站点设置关闭时整块不显示；
 * - 师资团队：指定讲师（按所选顺序，最多 8 位）→ 否则精选讲师在前、再按排序补足到 4 位（精选超过 4 位时取到 8 位）；
 * - 校区 / 合作企业：全部（按排序，有上限）；资讯：最新 limit 篇。
 */

/** 各区块的数量上限 */
export const HOME_LIMITS = {
  /** 主视觉同时展示的轮播图（按时间窗过滤之后截取，见 liveBanners） */
  banners: 10,
  disciplines: 8,
  courses: 12,
  stories: 8,
  /** 讲师：自动规则补足到 min（一行 4 位），精选超过 min 时取到 max（两行） */
  teachers: { min: 4, max: 8 },
  campuses: 12,
  partners: 24,
} as const

type SectionSource =
  | {
      enabled?: boolean | null
      eyebrow?: string | null
      title?: string | null
      description?: string | null
    }
  | null
  | undefined

/**
 * 区块文字：后台关闭（enabled = false）时返回 null（整块不渲染）。
 * 从未保存过（undefined）的标题、眉标用默认值；后台清空的眉标 / 描述不显示。
 */
export function toSectionHeading(
  section: SectionSource,
  defaults: { title: string; eyebrow: string },
): HomeSectionHeading | null {
  if (section?.enabled === false) return null
  const eyebrow = section?.eyebrow === undefined ? defaults.eyebrow : section.eyebrow
  return {
    eyebrow: eyebrow?.trim() || null,
    title: section?.title?.trim() || defaults.title,
    description: section?.description?.trim() || null,
  }
}

/** 数字设置：不是有限数时用默认值，再限定在 [min, max] 内并取整 */
export function clampSetting(
  value: number | null | undefined,
  { fallback, min, max }: { fallback: number; min: number; max: number },
): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.round(Math.min(max, Math.max(min, number)))
}

const timeOf = (value: string | null): number | null => {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

/**
 * 轮播图是否在投放时间窗内：开始时间为空或不晚于 now，且结束时间为空或晚于 now
 * （结束时间那一刻起不再展示）。无法解析的时间按“不限”处理。
 */
export function isBannerLive(
  banner: Pick<HomeBanner, 'startAt' | 'endAt'>,
  now: Date | number,
): boolean {
  const current = typeof now === 'number' ? now : now.getTime()
  const start = timeOf(banner.startAt)
  const end = timeOf(banner.endAt)
  return (start === null || start <= current) && (end === null || end > current)
}

/**
 * 当前时间窗内的轮播图（保持传入的顺序，返回新数组），最多 limit 张。
 * 先按时间窗过滤再截取：已结束但仍启用的轮播图不占名额，不会把正在投放的挤掉。
 */
export function liveBanners<T extends Pick<HomeBanner, 'startAt' | 'endAt'>>(
  banners: readonly T[],
  now: Date | number,
  limit: number = HOME_LIMITS.banners,
): T[] {
  return banners.filter((banner) => isBannerLive(banner, now)).slice(0, limit)
}

/**
 * 按指定 ID 的顺序从 pool 中挑出（跳过 pool 里没有的——未发布 / 未授权 / 已删除，并去重），
 * 最多 limit 个。
 */
export function pickByIds<T extends { id: number }>(
  pool: readonly T[],
  ids: readonly number[],
  limit = Number.POSITIVE_INFINITY,
): T[] {
  const byId = new Map(pool.map((item) => [item.id, item]))
  const seen = new Set<number>()
  const result: T[] = []
  for (const id of ids) {
    if (result.length >= limit) break
    const item = byId.get(id)
    if (!item || seen.has(id)) continue
    seen.add(id)
    result.push(item)
  }
  return result
}

/** 依次合并多组（按 ID 去重，保持先后顺序），最多 limit 个 */
export function mergeUnique<T extends { id: number }>(
  groups: readonly (readonly T[])[],
  limit = Number.POSITIVE_INFINITY,
): T[] {
  const seen = new Set<number>()
  const result: T[] = []
  for (const item of groups.flat()) {
    if (result.length >= limit) break
    if (seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
  }
  return result
}

/**
 * 精选课程的自动规则：每个专业方向取排序最靠前的一门长期就业班。
 * cards 须已按“专业方向排序 → 课程排序”排好（findCourseCards / getCourseCards 的顺序），结果保持这个顺序。
 */
export function pickCareerCourses(
  cards: readonly CourseCardData[],
  limit = Number.POSITIVE_INFINITY,
): CourseCardData[] {
  const seen = new Set<number>()
  const result: CourseCardData[] = []
  for (const card of cards) {
    if (result.length >= limit) break
    if (card.classType !== 'long_term' || seen.has(card.discipline.id)) continue
    seen.add(card.discipline.id)
    result.push(card)
  }
  return result
}

/** 每个专业方向的课程数（只统计传入的、可公开访问的课程卡片） */
export function countCoursesByDiscipline(cards: readonly CourseCardData[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const card of cards) {
    counts.set(card.discipline.id, (counts.get(card.discipline.id) ?? 0) + 1)
  }
  return counts
}

/**
 * 讲师的自动规则：精选讲师在前，其余按排序补足。
 * 精选不超过 4 位时一共取 4 位（一行），超过 4 位时取到 8 位（两行）；讲师总数不够时有多少取多少。
 * 两组都须已按后台排序排好。
 */
export function pickHomeTeachers<T extends { id: number }>(
  featured: readonly T[],
  others: readonly T[],
): T[] {
  const { min, max } = HOME_LIMITS.teachers
  const target = featured.length <= min ? min : max
  return mergeUnique([featured, others], target)
}

type CategorySource = HomeArticleCategory & { order?: number | null }

/** 文章里出现过的分类（按 ID 去重），按分类排序 → ID 排列，用于资讯 Tab */
export function collectArticleCategories(
  categories: readonly (CategorySource | null)[],
): HomeArticleCategory[] {
  const byId = new Map<number, CategorySource>()
  for (const category of categories) {
    if (category && !byId.has(category.id)) byId.set(category.id, category)
  }
  return [...byId.values()]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)
    .map(({ id, name, slug }) => ({ id, name, slug }))
}
