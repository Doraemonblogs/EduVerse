import type { ImageSource } from '@/lib/media'
import type { Course, CoursePage, Discipline } from '@/payload-types'

/**
 * 课程模块（课程列表 / 课程详情 / 专业方向页）的视图模型。
 *
 * - 全部是可 JSON 序列化的普通对象：可以直接作为 props 传给客户端组件，也能进 unstable_cache；
 * - 由数据层 `src/lib/data/courses.ts` 从 Payload 文档映射而来，页面与组件只使用这些类型，
 *   不要把 Payload 文档整个传下去；
 * - 草稿已在数据层剔除：这里出现的专业方向、校区、讲师、作品都是已发布的，作品都已确认授权，
 *   开班计划不含“已结束”（closed）。
 */

/** 班型：长期就业班 / 短期提升班 */
export type ClassType = Course['classType']

/** 授课方式：线下面授 / 线上直播 / 双师课堂 */
export type DeliveryMode = Course['deliveryModes'][number]

/** 前台展示的开班状态（“已结束”不会出现在前台） */
export type CohortStatus = 'enrolling' | 'upcoming' | 'full'

/** 课程时长的单位 */
export type DurationUnit = Course['duration']['unit']

export type DisciplineRef = {
  id: number
  /** 全称，如“影视特效与后期” */
  name: string
  /** 简称（后台未填时等于全称），用于徽标、筛选项等空间有限的位置 */
  shortName: string
  slug: string
}

export type CampusRef = {
  id: number
  name: string
  slug: string
  /** 城市名，如“北京” */
  city: string
  /** 城市标识，如 beijing（课程筛选 ?city= 的取值） */
  citySlug: string
  address: string
  /** 校区排序（后台“排序”字段），城市筛选项按它排列 */
  order: number
}

export type CohortItem = {
  id: number
  /** 开班日期（ISO 时间戳）。展示用 formatCohortDate()，按北京时间取日期 */
  startDate: string
  endDate: string | null
  mode: DeliveryMode
  status: CohortStatus
  /** 开班校区；null 表示线上开班（没有校区） */
  campus: { name: string; city: string; address: string } | null
  note: string | null
}

export type CourseDuration = { value: number; unit: DurationUnit }

export type CourseCardData = {
  id: number
  slug: string
  title: string
  summary: string
  /** 封面（card 尺寸 800 宽） */
  cover: ImageSource | null
  discipline: DisciplineRef
  classType: ClassType
  deliveryModes: DeliveryMode[]
  duration: CourseDuration | null
  /** 上课时间，如“全日制（周一至周五）” */
  schedule: string | null
  /** 开设校区：仅已发布的校区，按校区排序 */
  campuses: CampusRef[]
  /** 分阶段大纲的阶段名（课程卡片的“学习路线”） */
  stageTitles: string[]
  /**
   * 未结束（status ≠ closed）的全部开班计划，按开班日期升序。
   * 缓存里存的是全部未结束的开班，**渲染时**再用 `upcomingCohorts(cohorts, new Date())` 去掉已过开班日的。
   */
  cohorts: CohortItem[]
  featured: boolean
}

/** 薪资参考：只有区间、来源、统计时间齐全时才会生成；免责声明来自站点设置，必须随区间一起展示 */
export type SalaryReference = {
  range: string
  source: string
  statDate: string
  note: string | null
  disclaimer: string
}

export type CareerDirection = { title: string; description: string | null }

export type CourseStage = {
  title: string
  /** 如“4 周” */
  duration: string | null
  goals: string | null
  topics: string[]
}

export type CourseProject = {
  title: string
  description: string | null
  /** 配图（card 尺寸），可为空 */
  image: ImageSource | null
}

export type SoftwareRef = {
  id: number
  name: string
  /** 软件类别（modeling / rendering / compositing / design / painting） */
  category: string
}

export type TeacherCardData = {
  id: number
  slug: string
  name: string
  /** 头衔，如“三维动画讲师” */
  title: string
  /** 头像（thumbnail 尺寸 400 宽） */
  avatar: ImageSource | null
  yearsOfExperience: number | null
  specialties: string[]
}

export type WorkThumb = {
  id: number
  title: string
  /** 封面（card 尺寸）；alt 为媒体库填写的替代文字，可能为空，组件会用作品名兜底 */
  cover: ImageSource | null
  /** 署名（化名） */
  authorName: string | null
  /** 届别，如“2026 届” */
  cohortLabel: string | null
}

export type FaqItem = { id: number; question: string; answer: string }

export type CourseDetail = CourseCardData & {
  /** 首屏大图（hero 尺寸，课程封面） */
  heroImage: ImageSource | null
  /** 分享图兜底（og 尺寸：1200×630 居中裁切的课程封面），交给 buildMetadata({ shareImage }) */
  shareImage: ImageSource | null
  highlights: string[]
  audience: string[]
  stages: CourseStage[]
  software: SoftwareRef[]
  projects: CourseProject[]
  /** 已发布的授课讲师，按课程中的关联顺序 */
  teachers: TeacherCardData[]
  /** 本课程已发布且已确认授权的学员作品 */
  works: WorkThumb[]
  /** 课程自己的就业方向；课程未填写时继承所属专业方向的发展方向 */
  careerDirections: CareerDirection[]
  /** 课程填写了薪资区间用课程的，否则继承专业方向；数据不全时为 null（不显示薪资卡） */
  salary: SalaryReference | null
  faqs: FaqItem[]
  /** 同专业方向的其它课程（不含本课程），最多 3 门 */
  related: CourseCardData[]
  /** 课程的 SEO 字段组，原样交给 buildMetadata({ seo }) */
  seo: Course['seo']
}

export type DisciplineDetail = DisciplineRef & {
  tagline: string | null
  /** 首屏大图（hero 尺寸，专业方向封面） */
  heroImage: ImageSource | null
  /** 分享图兜底（og 尺寸：1200×630 居中裁切的专业方向封面），交给 buildMetadata({ shareImage }) */
  shareImage: ImageSource | null
  /**
   * 专业介绍（富文本，交给 <RichText data={intro} />）。
   * 指向不可访问课程（所属专业方向未发布）的链接已在数据层标记为草稿，只渲染文字
   */
  intro: Discipline['intro']
  careerDirections: CareerDirection[]
  salary: SalaryReference | null
  /** 该方向的全部课程（排序同课程列表） */
  courses: CourseCardData[]
  /** 该方向已发布且已确认授权的学员作品，最多 8 件 */
  works: WorkThumb[]
  /** 该方向已发布的讲师，最多 8 位 */
  teachers: TeacherCardData[]
  seo: Discipline['seo']
}

/** /courses 的筛选条件（全部单选；未出现 = 全部） */
export type CourseFilters = {
  /** 专业方向 slug */
  discipline?: string
  type?: ClassType
  mode?: DeliveryMode
  /** 城市标识 citySlug */
  city?: string
}

export type CourseFilterKey = keyof CourseFilters

export type FilterOption = {
  /** 写入 URL 的取值（slug / 枚举值） */
  value: string
  label: string
  /** 在“其它维度保持当前选择”的条件下，选中该项后的课程数 */
  count: number
  /** 是否为当前选中项（用于 aria-current 与视觉区分） */
  selected: boolean
}

/** 后台「课程页面设置」（全局 course-pages），已补齐默认值 */
export type CoursePagesSettings = {
  list: {
    title: string
    description: string | null
    /** 课程列表页的 SEO 字段组，原样交给 buildMetadata({ seo }) */
    seo: CoursePage['list']['seo'] | null
  }
  detail: { sidebarTitle: string; sidebarDescription: string | null }
  major: { ctaTitle: string; ctaDescription: string | null }
}
