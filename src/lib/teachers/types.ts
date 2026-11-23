import type { CourseCardData, DisciplineRef, TeacherCardData } from '@/lib/course/types'
import type { ImageSource } from '@/lib/media'
import type { WorkCardData } from '@/lib/works/types'
import type { Teacher, TeacherPage } from '@/payload-types'

/**
 * 师资模块（讲师列表 /teachers、讲师详情 /teachers/[slug]）的视图模型。
 *
 * - 全部是可 JSON 序列化的普通对象，由数据层 `src/lib/data/teachers.ts` 映射而来；
 * - 草稿已在数据层剔除：讲师、专业方向、校区、课程（及其专业方向）都是已发布的，
 *   作品已发布且已确认学员授权。
 */

/**
 * 讲师列表的卡片：M3 的讲师卡片（TeacherCardData，课程详情 / 专业方向页也在用）
 * 加上已发布的专业方向（按后台关联顺序），用于 /teachers 的筛选与卡片上的展示。
 * 可以直接交给 <TeacherCardGrid teachers>（有 disciplines 时卡片会列出专业方向）。
 */
export type TeacherListItem = TeacherCardData & {
  disciplines: DisciplineRef[]
}

/** 讲师列表页的数据：全部讲师（后台排序）+ 筛选项来源（已发布的专业方向，后台排序） */
export type TeacherListData = {
  teachers: TeacherListItem[]
  disciplines: DisciplineRef[]
}

/** 从业经历的一条 */
export type TeacherExperience = {
  /** 如“2018–2022”，可为空 */
  period: string | null
  /** 机构 / 公司（演示数据均为虚构） */
  org: string
  role: string
}

export type TeacherDetail = {
  id: number
  slug: string
  name: string
  /** 头衔，如“三维动画讲师” */
  title: string
  /** 头像（card 尺寸，800 宽） */
  avatar: ImageSource | null
  /** 分享图兜底（og 尺寸：1200×630 居中裁切的头像），交给 buildMetadata({ shareImage }) */
  shareImage: ImageSource | null
  yearsOfExperience: number | null
  /** 所在校区：仅已发布的校区，链接到 /campuses/[slug] */
  campus: { name: string; slug: string; city: string } | null
  /** 已发布的专业方向（按后台关联顺序），链接到 /majors/[slug] */
  disciplines: DisciplineRef[]
  specialties: string[]
  /**
   * 个人简介（富文本，交给 <RichText data={bio} />）。
   * 指向不可访问课程的链接已在数据层标记为草稿，只渲染文字（guardCourseLinks）
   */
  bio: Teacher['bio']
  experience: TeacherExperience[]
  /** 授课课程：已发布、所属专业方向已发布、授课讲师含该讲师的课程（排序同课程列表） */
  courses: CourseCardData[]
  /** 这些课程已发布且已授权的学员作品（发布时间降序），最多 8 件 */
  works: WorkCardData[]
  /** 讲师的 SEO 字段组，原样交给 buildMetadata({ seo }) */
  seo: Teacher['seo']
}

/** /teachers 的筛选条件（单选；未出现 = 全部） */
export type TeacherFilters = {
  /** 专业方向 slug */
  discipline?: string
}

/** 后台「师资页面设置」（全局 teacher-pages），已补齐默认值 */
export type TeacherPagesSettings = {
  list: {
    title: string
    description: string | null
    /** 讲师列表页的 SEO 字段组，原样交给 buildMetadata({ seo }) */
    seo: TeacherPage['list']['seo'] | null
  }
  detail: { ctaTitle: string; ctaDescription: string | null }
}
