import type { LeadFormConfig } from '@/components/lead/types'
import type { CourseCardData } from '@/lib/course/types'
import type {
  HomeArticlesSection,
  HomeCampus,
  HomeDiscipline,
  HomeHeroData,
  HomeLeadFormSection,
  HomeListSection,
  HomePartner,
  HomeQuickEntry,
  HomeStory,
} from '@/lib/home/types'
import type { TeacherListItem } from '@/lib/teachers/types'
import type { WorkCardData } from '@/lib/works/types'

/**
 * 首页区块组件的目录与 props 契约（只有类型；组件本身由 Top / Bottom Agent 实现）。
 *
 * 目录：
 * - src/components/home/top/      区块 1–4：hero-carousel.tsx（HeroCarousel）、quick-entries.tsx（QuickEntries）、
 *                                 hot-disciplines.tsx（HotDisciplines）、courses-rail.tsx（CoursesRail）
 * - src/components/home/bottom/   区块 5–11：works-section.tsx（WorksSection）、stories-section.tsx（StoriesSection）、
 *                                 partners-section.tsx（PartnersSection）、teachers-section.tsx（TeachersSection）、
 *                                 campuses-section.tsx（CampusesSection）、articles-section.tsx（ArticlesSection）、
 *                                 lead-section.tsx（LeadSection）
 * - src/components/home/constants.ts  留资位置 HOME_LEAD_POSITIONS、意向 HOME_LEAD_INTENTS、区块标题 id HOME_SECTION_IDS、
 *                                 区块顺序 HOME_SECTION_ORDER
 *
 * 通用约定（所有区块）：
 * - 数据来自 getHomePageData()（src/lib/data/home.ts），页面把每个区块的数据原样作为 props 传入；
 *   **区块数据为 null 时页面不渲染该组件**（关闭 / 没有内容 / 学员故事总开关关闭都已在数据层处理），
 *   组件内不再判断 enabled，也不需要处理空列表；
 * - 每个区块是一个 `<Section tone=… aria-labelledby={HOME_SECTION_IDS.x}>` + `<Container>`，
 *   Container 一律加 HOME_CONTAINER_CLASS（rhythm.ts：给桌面端悬浮操作栏让位，各区块右缘对齐）；
 *   标题行用 `<HomeSectionHeader>`（section-header.tsx，内部是 `<SectionHeading as="h2" id={HOME_SECTION_IDS.x}>`，
 *   “查看全部 →”配合 HomeMoreLinkMobile）；
 *   区块内卡片标题用 h3；
 * - 默认写服务端组件；只有轮播（HeroCarousel 的内层）、横滑按钮（HorizontalScroller 已封装）、资讯 Tab 需要客户端；
 * - 横滑一律用 src/components/common/horizontal-scroller.tsx 的 HorizontalScroller；
 * - 系统文案用 zh.home.top / zh.home.bottom（src/i18n/zh.ts），运营文案只来自 props；
 * - 站内链接用 next/link（prefetch={false}）；HomeLink.external 为 true 时用 `<a target="_blank" rel="noopener noreferrer">`；
 * - 图片用 next/image，src 已带 basePath；只有主视觉第一张预加载（priority / fetchPriority=high），其余懒加载并给出正确 sizes。
 */

/** 区块 1：主视觉轮播（src/components/home/top/hero-carousel.tsx） */
export type HeroCarouselProps = {
  /**
   * 轮播设置与当前时间窗内的轮播图（已按排序）。banners 为空时组件只输出视觉隐藏的
   * `<h1 id={HOME_SECTION_IDS.hero} className="sr-only">{brandName}</h1>`。
   * 第一张标题用 h1（id = HOME_SECTION_IDS.hero），其余用 h2；按钮：ctaLabel 为 null 不显示，
   * link 为 null 时用 LeadCTA（position HOME_LEAD_POSITIONS.hero，intent HOME_LEAD_INTENTS.hero）。
   * 自动轮播：hero.autoplay && 张数 > 1 && 未开启减少动态效果；有暂停 / 播放按钮，悬停或键盘聚焦时暂停；
   * 只有 1 张时不显示上一张 / 下一张 / 圆点 / 暂停按钮。
   */
  hero: HomeHeroData
  /** 站点品牌名（getHomePageData().brandName）：没有轮播图时作为视觉隐藏的 h1 */
  brandName: string
}

/**
 * 区块 2：快速了解（src/components/home/top/quick-entries.tsx）。
 * 2×2（移动）/ 4 列（桌面）；action.kind = link → 链接，lead → LeadCTA（position HOME_LEAD_POSITIONS.quickEntries，
 * intent HOME_LEAD_INTENTS.quickEntries）。不使用彩色插画图标（image 为运营上传的配图，可为空）。
 */
export type QuickEntriesProps = { section: HomeListSection<HomeQuickEntry> }

/**
 * 区块 3：热门专业（src/components/home/top/hot-disciplines.tsx）。
 * 卡片（封面、名称、tagline、课程数 zh.home.top.hotDisciplines.courseCount）链接 majorPath(slug)；
 * 移动端 2 列、桌面 4 列；末尾“查看全部课程 →”链接 COURSES_PATH。
 */
export type HotDisciplinesProps = { section: HomeListSection<HomeDiscipline> }

/**
 * 区块 4：精选课程（src/components/home/top/courses-rail.tsx）。
 * CourseCard（leadPosition = HOME_LEAD_POSITIONS.courses，imageSizes 按横滑项宽度）放进 HorizontalScroller；
 * now 交给 CourseCard 计算近期开班（默认渲染时间）。
 */
export type CoursesRailProps = { section: HomeListSection<CourseCardData>; now?: Date }

/**
 * 区块 5：学员作品（src/components/home/bottom/works-section.tsx）。
 * 深色区块（tone="dark"），WorkMasonry / WorkCard 网格 + “查看更多作品 →” WORKS_PATH；注明授权与化名。
 */
export type WorksSectionProps = { section: HomeListSection<WorkCardData> }

/**
 * 区块 6：学员故事（src/components/home/bottom/stories-section.tsx）。
 * 横滑卡片：化名、背景、现任岗位 · 公司（文字，不链接合作企业）、引言；不展示任何薪资；
 * 必须显示 zh.home.bottom.stories.pseudonymNote。没有详情页，卡片不加链接（course 可选择链接到课程）。
 */
export type StoriesSectionProps = { section: HomeListSection<HomeStory> }

/**
 * 区块 7：合作企业（src/components/home/bottom/partners-section.tsx）。
 * Logo 墙（灰度、悬停恢复，alt = 企业名），移动端横滑；不链接外站。
 */
export type PartnersSectionProps = { section: HomeListSection<HomePartner> }

/**
 * 区块 8：师资团队（src/components/home/bottom/teachers-section.tsx）。
 * 桌面网格、移动端横滑：HorizontalScroller（desktop="grid"）+ TeacherCard（src/components/course/teacher-card-grid.tsx），
 * 或 TeacherCardGrid；“查看全部讲师 →” TEACHERS_PATH。
 */
export type TeachersSectionProps = { section: HomeListSection<TeacherListItem> }

/**
 * 区块 9：校区分布（src/components/home/bottom/campuses-section.tsx）。
 * 校区卡片：名称、地址、电话（phoneHref 为 tel: 链接）、“在地图中打开”（mapUrl 非 null 时，新窗口、
 * rel="noopener noreferrer"）、“查看校区 →” campusPath(slug)（src/lib/campuses/paths.ts，M6 实现）；移动端横滑。
 */
export type CampusesSectionProps = { section: HomeListSection<HomeCampus> }

/**
 * 区块 10：最新资讯（src/components/home/bottom/articles-section.tsx）。
 * 按 categories 做 Tab（第一项“全部”；客户端小组件，键盘可用）或简单列表；标题链接 articlePath(slug)
 * （src/lib/articles/paths.ts，M6 实现）；“查看全部资讯 →” ARTICLES_PATH。
 */
export type ArticlesSectionProps = { section: HomeArticlesSection }

/**
 * 区块 11：预约试听（src/components/home/bottom/lead-section.tsx）。
 * 深色区块，加 `data-page-end-cta`（隐藏页脚的重复转化横幅）；
 * `<LeadForm config variant="inline" position={HOME_LEAD_POSITIONS.form} intent={HOME_LEAD_INTENTS.form}
 * submitLabel={section.submitLabel} />`。config 不传时组件自己 await getLeadFormConfig()（src/lib/data/lead-form.ts）。
 */
export type LeadSectionProps = { section: HomeLeadFormSection; config?: LeadFormConfig }
