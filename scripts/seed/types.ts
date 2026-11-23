/**
 * 种子数据的输入类型（与 Payload 集合字段对应，但用 slug 互相引用，由种子脚本解析为 ID）。
 * 图片不在数据里声明：种子脚本按内容类型自动生成本地占位图。
 */
import type {
  ArticleCategorySlug,
  CampusSlug,
  CourseSlug,
  DisciplineSlug,
  SoftwareSlug,
} from './registry'

/** 富文本块：种子脚本转换为 Lexical JSON */
export type RichBlock =
  | { h2: string }
  | { h3: string }
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { quote: string }

export type SalaryRef = {
  /** 如：8,000–15,000 元/月 */
  range: string
  /** 必须标明来源；演示数据统一写明“示例数据（虚构）” */
  source: string
  /** 如：2026 年 9 月 */
  statDate: string
  note?: string
}

export type SeedDiscipline = {
  slug: DisciplineSlug
  tagline: string
  intro: RichBlock[]
  careerDirections: { title: string; description: string }[]
  salaryRef: SalaryRef
  seo: { title: string; description: string; keywords: string }
}

export type SeedCourse = {
  slug: CourseSlug
  duration: { value: number; unit: 'week' | 'month' }
  schedule: string
  /** 线下 / 双师课程开设的校区；纯线上课程为空数组 */
  campuses: CampusSlug[]
  summary: string
  highlights: string[]
  audience: string[]
  stages: { title: string; duration: string; goals: string; topics: string[] }[]
  software: SoftwareSlug[]
  projects: { title: string; description: string }[]
  careerDirections: { title: string; description: string }[]
  /** 留空则继承专业方向的薪资参考 */
  salaryRef?: SalaryRef
  /** 课程专属常见问题（通用的学费 / 报名问题由 FAQ 数据统一追加） */
  faqs: { question: string; answer: string }[]
  featured: boolean
  seo: { title: string; description: string; keywords: string }
}

export type SeedTeacher = {
  slug: string
  name: string
  title: string
  disciplines: DisciplineSlug[]
  campus: CampusSlug
  yearsOfExperience: number
  specialties: string[]
  bio: RichBlock[]
  /** 机构名称一律虚构 */
  experience: { period: string; org: string; role: string }[]
  /** 该讲师授课的课程，种子脚本据此回填课程的“授课讲师” */
  courses: CourseSlug[]
  featured: boolean
}

export type WorkAspect = '3:4' | '4:5' | '1:1' | '4:3' | '16:9' | '2:3'

export type SeedWork = {
  title: string
  author: { displayName: string; cohortLabel: string }
  discipline: DisciplineSlug
  course: CourseSlug
  software: SoftwareSlug[]
  description: string
  featured: boolean
  /** 封面宽高比，用于生成占位图（让瀑布流有真实的高低变化） */
  aspect: WorkAspect
  /**
   * 作品图集每张图的说明（每项生成一张占位图）。
   * 不填时：精选作品 2 张（过程稿、细节），其余作品没有图集（见 data/works.ts 的 galleryCaptions）。
   */
  gallery?: string[]
  /**
   * 外部播放器视频：哔哩哔哩占位 BV 号（格式合法，不对应真实视频），
   * 种子脚本拼成 https://player.bilibili.com/player.html?bvid=… 写入 video.embedUrl
   */
  videoBvid?: string
}

export type SeedStory = {
  displayName: string
  background: string
  course: CourseSlug
  currentRole: string
  companyName: string
  /** 若就职于虚构的合作企业，填合作企业名称以建立关联 */
  partnerName?: string
  quote: string
  story: RichBlock[]
  /** 关联作品：SeedWork 数组中的下标 */
  workIndexes: number[]
  featured: boolean
}

export type SeedPartner = { name: string; industry: string }

export type SeedCareerEvent = {
  title: string
  /** 相对今天的天数（正数为未来），保证种子数据中的活动日期始终合理 */
  daysFromNow: number
  location: string
  campus?: CampusSlug
  description: string
  registrationNote: string
}

export type SeedArticle = {
  slug: string
  title: string
  category: ArticleCategorySlug
  excerpt: string
  content: RichBlock[]
  authorName: string
  /** 发布于多少天前 */
  publishedDaysAgo: number
  relatedCourses: CourseSlug[]
}

export type SeedFaq = {
  question: string
  answer: string
  category: 'course' | 'fee' | 'career' | 'general'
}

export type SeedTutorial = {
  slug: string
  title: string
  discipline: DisciplineSlug
  /** 占位 BV 号（格式合法，非真实视频） */
  videoId: string
  duration: string
  level: 'beginner' | 'intermediate' | 'advanced'
  gated: boolean
  description: string
}

export type SeedQuizQuestion = {
  question: string
  options: { label: string; scores: { discipline: DisciplineSlug; weight: number }[] }[]
}

export type SeedBanner = {
  title: string
  subtitle: string
  ctaLabel: string
  href: string
  placement: 'home_hero' | 'careers_hero'
}

export type SeedCampusDetail = {
  slug: CampusSlug
  address: string
  transit: string
  phone: string
  openingHours: string
  photoCaptions: string[]
}

export type SeedPageBlock =
  | { blockType: 'richText'; content: RichBlock[] }
  | { blockType: 'imageText'; title: string; content: RichBlock[]; imagePosition: 'left' | 'right' }
  | { blockType: 'stats'; items: { value: string; label: string; note: string }[] }
  | { blockType: 'timeline'; items: { year: string; title: string; description: string }[] }
  | {
      blockType: 'cta'
      title: string
      description: string
      buttonLabel: string
      intent: 'trial' | 'tuition' | 'materials' | 'consult'
    }

export type SeedPage = {
  slug: 'about' | 'contact' | 'privacy' | 'terms'
  title: string
  layout: SeedPageBlock[]
  seo: { title: string; description: string }
}
