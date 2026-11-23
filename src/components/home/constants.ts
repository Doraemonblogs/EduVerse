import type { HomePageData } from '@/lib/home/types'
import type { LeadIntent } from '@/lib/validation/lead'

/**
 * 首页的留资位置标识（LeadCTA / LeadForm 的 position，写入线索的 source.position）。
 * e2e 与后台线索统计按这些值区分转化入口，改动时同步 tests/e2e/home.e2e.spec.ts。
 */
export const HOME_LEAD_POSITIONS = {
  /** 主视觉：轮播图没有链接地址时，按钮打开留资弹窗 */
  hero: 'home_hero',
  /** 快速了解：点击行为为“打开预约弹窗”的入口卡片 */
  quickEntries: 'home_quick',
  /** 精选课程：CourseCard 的“预约试听”（传给 CourseCard 的 leadPosition） */
  courses: 'home_course',
  /** 预约试听区块：页内表单 LeadForm variant="inline" */
  form: 'home_form',
} as const satisfies Record<string, string>

export type HomeLeadPosition = (typeof HOME_LEAD_POSITIONS)[keyof typeof HOME_LEAD_POSITIONS]

/** 各留资入口的意向类型 */
export const HOME_LEAD_INTENTS = {
  hero: 'trial',
  /** 入口卡片的标题由运营填写，无法可靠映射到意向，统一按“咨询”处理 */
  quickEntries: 'consult',
  courses: 'trial',
  form: 'trial',
} as const satisfies Record<keyof typeof HOME_LEAD_POSITIONS, LeadIntent>

/**
 * 首页各区块标题的 id（`<Section aria-labelledby>` 与 SectionHeading 的 id；页面内唯一）。
 * 主视觉的标题是第一张轮播图的 h1（或视觉隐藏的品牌名 h1），id 为 hero。
 */
export const HOME_SECTION_IDS = {
  hero: 'home-hero-title',
  quickEntries: 'home-quick-entries-title',
  hotDisciplines: 'home-hot-disciplines-title',
  courses: 'home-courses-title',
  works: 'home-works-title',
  stories: 'home-stories-title',
  partners: 'home-partners-title',
  teachers: 'home-teachers-title',
  campuses: 'home-campuses-title',
  articles: 'home-articles-title',
  leadForm: 'home-lead-form-title',
} as const

/** 首页区块自上而下的顺序（页面按它渲染 getHomePageData() 中非 null 的区块；主视觉总是渲染） */
export const HOME_SECTION_ORDER = [
  'hero',
  'quickEntries',
  'hotDisciplines',
  'courses',
  'works',
  'stories',
  'partners',
  'teachers',
  'campuses',
  'articles',
  'leadForm',
] as const satisfies readonly (keyof Omit<HomePageData, 'brandName' | 'seo'>)[]
