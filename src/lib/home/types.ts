import type { CourseCardData, DisciplineRef } from '@/lib/course/types'
import type { ImageSource } from '@/lib/media'
import type { TeacherListItem } from '@/lib/teachers/types'
import type { WorkCardData } from '@/lib/works/types'
import type { HomePage } from '@/payload-types'

/**
 * 首页（/）的视图模型，由数据层 `src/lib/data/home.ts` 的 getHomePageData() 给出。
 *
 * - 全部是可 JSON 序列化的普通对象：可以直接作为 props 传给客户端组件，也能进 unstable_cache；
 * - 图片已经 imageSource() 处理（地址带 basePath），尺寸见各字段说明；
 * - 草稿、授权与隐私已在数据层处理：出现的专业方向、课程、讲师、校区、文章、学员故事都是已发布的，
 *   作品与学员故事都已确认学员授权（consentConfirmed）；学员故事不含任何薪资信息；
 * - **区块为 null = 整块不渲染**：后台关闭了该区块（enabled = false）、没有可展示的内容，
 *   或（学员故事）站点设置“展示学员故事模块”关闭。组件不需要再判断 enabled / 空数组。
 */

/** 区块的通用文字（后台每个区块的 enabled / eyebrow / title / description，已补齐默认值） */
export type HomeSectionHeading = {
  /** 英文眉标，如 MAJORS；后台清空时为 null（不显示） */
  eyebrow: string | null
  title: string
  description: string | null
}

/**
 * 后台填写的链接（已经过 safeHref 校验，不安全的协议已剔除）。
 * - external = false：站内路径（/courses）、页内锚点、mailto: / tel: → 站内路径用 next/link；
 * - external = true：http(s) 外链 → `<a target="_blank" rel="noopener noreferrer">`。
 */
export type HomeLink = { href: string; external: boolean }

/** 主视觉轮播图（placement = 首页主视觉、已启用） */
export type HomeBanner = {
  id: number
  /** 第一张用 h1，其余用 h2（见 HeroCarouselProps） */
  title: string
  subtitle: string | null
  /** 按钮文字；null 时不显示按钮 */
  ctaLabel: string | null
  /** 按钮去向；null 时按钮打开留资弹窗（position home_hero） */
  link: HomeLink | null
  /** 桌面端图片（hero 尺寸，最宽 1920，不放大） */
  image: ImageSource
  /**
   * 移动端图片（hero 尺寸，最宽 1920，不放大）：后台上传了移动端图片时用它，否则就是桌面图
   * （组件用 object-cover 裁切，并按宽高比放大 sizes，见 src/lib/home/cover-sizes.ts）。始终有值。
   */
  mobileImage: ImageSource
  /** 投放时间窗（ISO 时间戳，null 表示不限）；getHomePageData() 已按渲染时间过滤，组件无需处理 */
  startAt: string | null
  endAt: string | null
}

/** 主视觉：总是存在（没有轮播图时 banners 为空，页面用站点品牌名作为视觉隐藏的 h1） */
export type HomeHeroData = {
  /** 后台“自动轮播”（访客开启减少动态效果时组件不自动轮播） */
  autoplay: boolean
  /** 轮播间隔（毫秒，≥ 3000） */
  intervalMs: number
  /** 当前时间窗内的轮播图，按后台排序 */
  banners: HomeBanner[]
}

/** 快速了解的入口卡片 */
export type HomeQuickEntry = {
  /** 数组行 ID（React key） */
  id: string
  title: string
  description: string | null
  /** 配图（thumbnail 尺寸，400 宽），可为空（只显示文字） */
  image: ImageSource | null
  /**
   * link：跳转（HomeLink）；
   * lead：打开留资弹窗（position home_quick，intent consult）
   */
  action: { kind: 'link'; link: HomeLink } | { kind: 'lead' }
}

/** 热门专业卡片 */
export type HomeDiscipline = DisciplineRef & {
  /** 一句话卖点 */
  tagline: string | null
  /** 封面（card 尺寸，800 宽） */
  cover: ImageSource | null
  /** 该方向可公开访问的课程数（与课程列表一致） */
  courseCount: number
}

/** 学员故事卡片（化名；不含薪资；没有详情页，不加链接） */
export type HomeStory = {
  id: number
  /** 化名（后台“化名”字段，不是真实姓名） */
  displayName: string
  /** 学习前背景，如“财务专员转行” */
  background: string | null
  /** 头像（thumbnail 尺寸，400 宽，1:1），可为空 */
  avatar: ImageSource | null
  /** 现任岗位 */
  currentRole: string | null
  /** 就职公司：后台“就职公司”，为空时取关联合作企业的名称；只作文字展示，不链接 */
  companyName: string | null
  /** 一句话摘要 */
  quote: string | null
  /** 所学课程：只有课程可公开访问时给出（可链接到 /courses/[slug]，也可只显示名称） */
  course: { title: string; slug: string } | null
}

/** 合作企业 Logo（不输出官网链接，避免外链第三方） */
export type HomePartner = {
  id: number
  /** 企业名称（Logo 的 alt 用它） */
  name: string
  industry: string | null
  /** Logo（thumbnail 尺寸，400 宽） */
  logo: ImageSource
}

/** 校区卡片 */
export type HomeCampus = {
  id: number
  name: string
  slug: string
  city: string
  address: string
  /** 校区电话（展示用原文） */
  phone: string | null
  /** 电话的 tel: 链接（只保留数字与 +），没有电话时为 null */
  phoneHref: string | null
  openingHours: string | null
  /** 封面（card 尺寸，800 宽） */
  cover: ImageSource | null
  /**
   * “在地图中打开”：高德地图标注页（https://uri.amap.com/marker?…，新窗口、rel="noopener noreferrer"）。
   * 只有填写了坐标时才有值；只是链接，页面不加载任何地图脚本。
   */
  mapUrl: string | null
}

export type HomeArticleCategory = { id: number; name: string; slug: string }

/** 资讯条目 */
export type HomeArticle = {
  id: number
  slug: string
  title: string
  excerpt: string
  /**
   * 发布时间（ISO 时间戳）。展示用 formatCohortDate()（北京时间“2026年11月23日”），
   * `<time dateTime>` 用 toBeijingIsoDate()（均在 src/lib/course/format.ts）
   */
  publishedAt: string
  /** 分类；分类被删除时为 null（只出现在“全部”里） */
  category: HomeArticleCategory | null
  /** 封面（card 尺寸，800 宽） */
  cover: ImageSource | null
}

/** 带标题的列表区块 */
export type HomeListSection<T> = { heading: HomeSectionHeading; items: T[] }

export type HomeArticlesSection = HomeListSection<HomeArticle> & {
  /** 这些文章出现过的分类（按后台分类排序），用于 Tab；只有一个分类时组件可只显示列表 */
  categories: HomeArticleCategory[]
}

export type HomeLeadFormSection = {
  heading: HomeSectionHeading
  /** 提交按钮文字（后台未填写时为默认值） */
  submitLabel: string
}

/** getHomePageData() 的返回值：区块顺序即首页自上而下的顺序 */
export type HomePageData = {
  /** 站点品牌名：没有轮播图时作为视觉隐藏的 h1 */
  brandName: string
  hero: HomeHeroData
  quickEntries: HomeListSection<HomeQuickEntry> | null
  hotDisciplines: HomeListSection<HomeDiscipline> | null
  /** 精选课程：CourseCard 的数据（cohorts 含全部未结束开班，卡片渲染时按当前时间取近期开班） */
  courses: HomeListSection<CourseCardData> | null
  /** 学员作品：WorkCard / WorkMasonry 的数据 */
  works: HomeListSection<WorkCardData> | null
  stories: HomeListSection<HomeStory> | null
  partners: HomeListSection<HomePartner> | null
  /** 师资：可以直接交给 TeacherCardGrid / TeacherCard（带专业方向） */
  teachers: HomeListSection<TeacherListItem> | null
  campuses: HomeListSection<HomeCampus> | null
  articles: HomeArticlesSection | null
  leadForm: HomeLeadFormSection | null
  /** 首页 SEO 字段组，原样交给 buildMetadata({ seo }) */
  seo: HomePage['seo'] | null
}
