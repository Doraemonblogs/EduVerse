import type { HomePartner, HomeSectionHeading, HomeStory } from '@/lib/home/types'
import type { ImageSource } from '@/lib/media'
import type { CareersPage, Story } from '@/payload-types'

/**
 * 就业服务页（/careers）的视图模型，由数据层 `src/lib/data/careers.ts` 的 getCareersPageData() 给出。
 *
 * - 全部是可 JSON 序列化的普通对象；图片已经 imageSource() 处理（地址带 basePath）；
 * - 草稿、授权与隐私已在数据层处理：学员故事已发布、已确认授权（consentConfirmed），不含任何薪资信息，
 *   站点设置“展示学员故事模块”关闭时 stories 为 null；故事正文里指向不可访问课程的链接只渲染文字；
 *   合作企业不输出官网地址；招聘活动的校区只在已发布时给出（可链接）；
 * - **区块为 null = 整块不渲染**（后台关闭、或没有可展示的内容）；招聘活动区块例外：
 *   开启时总是存在，渲染时按当前时间过滤后为空则显示空状态。
 * - 广告法：页面不出现就业率、薪资承诺、“保证 / 包就业”等表述（后台文案由编辑负责，种子与默认值由单元测试检查）。
 */

/** 服务流程的一步 */
export type CareerProcessStep = { title: string; description: string | null }

/** 学员故事：首页的故事卡片（化名、背景、岗位、引言、所学课程）+ 可展开阅读的正文 */
export type CareerStory = HomeStory & {
  /**
   * 故事正文（富文本，交给 <RichText data={story} />）；未填写为 null。
   * 指向不可访问课程的链接已在数据层标记为草稿，只渲染文字（guardCourseLinks）
   */
  story: Story['story'] | null
}

/** 合作企业 Logo（与首页 Logo 墙相同；不输出官网链接） */
export type CareerPartner = HomePartner

/** 招聘活动 */
export type CareerEvent = {
  id: number
  title: string
  /**
   * 活动时间（ISO 时间戳）。展示用 formatEventDateTime()（北京时间“2026年11月30日 14:00”），
   * `<time dateTime>` 原样使用；JSON-LD Event.startDate 也用它
   */
  date: string
  /** 地点（如“上海徐汇校区 5 层评图室”“线上直播”）；未填写为 null */
  location: string | null
  /** 举办校区：仅已发布时给出，链接到 /campuses/[slug] */
  campus: { name: string; slug: string; city: string; address: string } | null
  /** 活动图片（card 尺寸），可为空 */
  image: ImageSource | null
  description: string | null
  /** 报名方式说明 */
  registrationNote: string | null
}

export type CareersSection<T> = { heading: HomeSectionHeading; items: T[] }

/**
 * 首屏背景图：后台「轮播图」里投放位置为“就业服务页顶部”、已启用的轮播图（只用它的图片；
 * 首屏文案来自「就业服务页 · 页面介绍」）。两张图都是 hero 尺寸（最宽 1920，不放大）。
 */
export type CareersHeroBanner = {
  id: number
  /** 桌面端图片（≥ 640px 使用；横幅） */
  image: ImageSource
  /** 移动端图片（< 640px 使用；竖幅）；后台没有上传时就是桌面图。始终有值 */
  mobileImage: ImageSource
  /** 投放时间窗（ISO 时间戳，null 表示不限）；渲染时用 liveCareersHeroBanner() 按当前时间挑选 */
  startAt: string | null
  endAt: string | null
}

/** getCareersPageData() 的返回值：区块顺序即页面自上而下的顺序 */
export type CareersPageData = {
  /** 首屏：英文眉标（后台清空时为 null）、标题（h1）、描述 */
  intro: { eyebrow: string | null; title: string; description: string | null }
  /**
   * 首屏背景图的候选：全部已启用的“就业服务页顶部”轮播图（按排序 → ID；没有桌面图的已剔除），
   * **不按时间过滤**——渲染时用 `liveCareersHeroBanner(heroBanners, new Date())` 取投放时间窗内的第一张，
   * 没有时首屏是纯深色底（页面 revalidate 保证时间窗到点后按时切换）
   */
  heroBanners: CareersHeroBanner[]
  /** 服务流程：区块关闭或没有步骤时为 null */
  process: CareersSection<CareerProcessStep> | null
  /** 学员故事：区块关闭、站点设置关闭学员故事模块或没有可展示的故事时为 null（精选在前，其后按排序） */
  stories: CareersSection<CareerStory> | null
  /** 合作企业 Logo 墙：区块关闭或没有带 Logo 的企业时为 null（按排序） */
  partners: CareersSection<CareerPartner> | null
  /**
   * 招聘活动：区块关闭时为 null。items 是查询时尚未过去的活动（按时间升序），
   * **渲染时**再用 `upcomingCareerEvents(items, new Date())` 过滤（缓存期间已过去的活动不再显示），为空时显示空状态
   */
  events: CareersSection<CareerEvent> | null
  /** 结尾行动号召（含 LeadForm inline） */
  cta: { title: string; description: string | null }
  /** 就业服务页 SEO 字段组，原样交给 buildMetadata({ seo }) */
  seo: CareersPage['seo'] | null
}
