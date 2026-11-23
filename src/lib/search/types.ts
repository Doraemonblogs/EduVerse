import type { ImageSource } from '@/lib/media'

/**
 * 站内搜索（/search?q=）的视图模型（可 JSON 序列化，能进 unstable_cache）。
 * 数据层 `src/lib/data/search.ts` 只返回已发布的内容（课程还要求其专业方向已发布，作品还要求已确认授权）。
 */

/** 结果分组，按这个顺序显示（分组名称见 zh.search.groups） */
export const SEARCH_GROUP_KEYS = [
  'courses',
  'disciplines',
  'articles',
  'teachers',
  'works',
] as const

export type SearchGroupKey = (typeof SEARCH_GROUP_KEYS)[number]

export type SearchHit = {
  id: number
  /** 标题（课程名、专业方向名、文章标题、讲师姓名、作品名）；高亮用 splitHighlight(title, terms) */
  title: string
  /** 站内路径（不含 basePath，交给 next/link） */
  href: string
  /**
   * 摘要（纯文本，可能带省略号）：课程简介、专业 tagline、文章正文中匹配附近的一段、讲师擅长领域、作品说明。
   * 没有可显示的内容时为 null。高亮用 splitHighlight(excerpt, terms)
   */
  excerpt: string | null
  /** 补充信息（纯文本）：课程的专业方向、文章分类、讲师头衔、作品作者化名；没有时为 null */
  meta: string | null
  /** 缩略图（thumbnail 尺寸）：封面 / 头像；alt 可能为空，组件用标题兜底或作装饰图 */
  image: ImageSource | null
}

export type SearchGroup = {
  key: SearchGroupKey
  /** 该类型匹配的总数（可能大于 hits.length） */
  total: number
  /** 最多 SEARCH_GROUP_LIMIT（10）条，标题匹配的排在前面 */
  hits: SearchHit[]
}

export type SearchResults = {
  /** 五个分组，顺序同 SEARCH_GROUP_KEYS（包括没有结果的分组，页面自行过滤 total > 0） */
  groups: SearchGroup[]
  /** 各组 total 之和 */
  total: number
}

/** 空搜索 / 无结果时的热门入口 */
export type SearchSuggestions = {
  /** 已发布且在导航中显示的专业方向（按后台排序，最多 8 个） */
  disciplines: { id: number; name: string; shortName: string; slug: string }[]
  /** 热门课程（精选课程最多 6 门，没有精选时取各专业方向的长期就业班） */
  courses: { id: number; title: string; slug: string; disciplineName: string }[]
}
