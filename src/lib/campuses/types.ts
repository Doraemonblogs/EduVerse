import type { CohortCourseRef, CohortItem, CourseCardData } from '@/lib/course/types'
import type { ImageSource } from '@/lib/media'
import type { TeacherListItem } from '@/lib/teachers/types'
import type { Campus, CampusPage } from '@/payload-types'

/**
 * 校区模块（校区列表 /campuses、校区详情 /campuses/[slug]）的视图模型；首页“校区分布”也用 CampusCardData。
 *
 * - 全部是可 JSON 序列化的普通对象，由数据层 `src/lib/data/campuses.ts`（首页为 src/lib/data/home.ts）映射而来；
 * - 草稿已在数据层剔除：校区、课程（及其专业方向）、讲师都是已发布的；
 * - 地图只输出外链（高德 / 百度标注页），页面不加载任何地图脚本、不请求第三方。
 */

/** 校区卡片（src/components/campuses/campus-card.tsx） */
export type CampusCardData = {
  id: number
  name: string
  slug: string
  /** 城市名，如“北京” */
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
   * 只有填写了坐标时才有值。
   */
  mapUrl: string | null
}

/** 环境照片（与灯箱 src/components/common/lightbox.tsx 的 LightboxImage 结构相同，可直接作为 items） */
export type CampusPhoto = {
  /** 灯箱大图（hero 尺寸，1920 宽，保留宽高比） */
  image: ImageSource
  /** 缩略图（thumbnail 尺寸，400 宽；没有时退回原图） */
  thumb: ImageSource
  caption: string | null
}

/** 校区详情的开班计划：带所属课程（每行显示课程名，“预约试听”带上课程与专业方向） */
export type CampusCohortItem = CohortItem & { course: CohortCourseRef }

export type CampusDetail = CampusCardData & {
  /** 首屏大图（hero 尺寸，校区封面） */
  heroImage: ImageSource | null
  /** 分享图兜底（og 尺寸：1200×630 居中裁切的封面），交给 buildMetadata({ shareImage })；JSON-LD image 也用它 */
  shareImage: ImageSource | null
  /** 交通指引（多行文本，保留换行：whitespace-pre-line） */
  transit: string | null
  /**
   * 坐标（GCJ-02 高德坐标，6 位小数）；JSON-LD geo 换算成 WGS 84 后输出（gcj02ToWgs84，src/lib/geo.ts）。
   * 未填写时为 null（同时没有地图外链）
   */
  location: { lat: number; lng: number } | null
  /** 百度地图标注页（坐标按 gcj02 换算）；没有坐标时为 null */
  baiduMapUrl: string | null
  /** 环境照片：大图（hero 尺寸）、缩略图（thumbnail 尺寸）、说明；可直接交给 <Lightbox items> */
  photos: CampusPhoto[]
  /** 在此开课的课程（开设校区含本校区；排序同课程列表） */
  courses: CourseCardData[]
  /**
   * 本校区未结束（status ≠ closed）的开班计划（只含可公开访问的课程），按开班日期升序。
   * 缓存里存的是全部未结束的开班，**渲染时**用 `upcomingCohorts(cohorts, new Date())` 去掉已过开班日的。
   */
  cohorts: CampusCohortItem[]
  /** 所在校区为本校区的已发布讲师（后台排序），可直接交给 <TeacherCardGrid teachers> */
  teachers: TeacherListItem[]
  /** 校区的 SEO 字段组，原样交给 buildMetadata({ seo }) */
  seo: Campus['seo']
}

/** 后台「校区页面设置」（全局 campus-pages），已补齐默认值 */
export type CampusPagesSettings = {
  list: {
    title: string
    description: string | null
    /** 校区列表页的 SEO 字段组，原样交给 buildMetadata({ seo }) */
    seo: CampusPage['list']['seo'] | null
  }
  detail: { ctaTitle: string; ctaDescription: string | null }
}
