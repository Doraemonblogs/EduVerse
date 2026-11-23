import type { DisciplineRef } from '@/lib/course/types'
import type { ImageSource } from '@/lib/media'
import type { Work, WorkPage } from '@/payload-types'

/**
 * 学员作品模块（作品列表 /works、作品详情 /works/[id]）的视图模型。
 *
 * - 全部是可 JSON 序列化的普通对象：可以直接作为 props 传给客户端组件，也能进 unstable_cache；
 * - 由数据层 `src/lib/data/works.ts` 从 Payload 文档映射而来，页面与组件只使用这些类型；
 * - 草稿与授权已在数据层处理：这里出现的作品都是已发布、且已确认学员授权（consentConfirmed）的，
 *   专业方向、课程只在已发布（课程还要求其专业方向已发布）时给出。
 * - 作者署名一律是学员化名（后台“署名”字段），不是真实姓名。
 */

/** 作品使用的软件（只展示名称，不链接；筛选 ?software= 的取值是 slug） */
export type SoftwareTag = {
  slug: string
  name: string
}

export type WorkCardData = {
  id: number
  title: string
  /**
   * 封面（card 尺寸，800 宽，**保留原图宽高比**：瀑布流按 width / height 排布）。
   * alt 为媒体库填写的替代文字，可能为空，组件用作品名兜底
   */
  cover: ImageSource | null
  /** 署名（学员化名） */
  authorName: string | null
  /** 届别，如“2026 届” */
  cohortLabel: string | null
  /** 所属专业方向；专业方向未发布时为 null（作品照常展示，只是不显示 / 不能按它筛选） */
  discipline: DisciplineRef | null
  /** 使用软件的 slug（按后台关联顺序），用于 ?software= 筛选 */
  software: string[]
  featured: boolean
  /** 发布时间（ISO 时间戳）；列表按它降序，相同再按 ID 降序 */
  publishedAt: string | null
}

/** 作品图集中的一张图 */
export type WorkGalleryItem = {
  /** 灯箱大图（hero 尺寸，1920 宽，保留宽高比） */
  image: ImageSource
  /** 缩略图（thumbnail 尺寸，400 宽；没有时退回 card 尺寸） */
  thumb: ImageSource
  caption: string | null
}

/**
 * 作品视频：
 * - embed：白名单内的外部播放器地址（数据层已用 isAllowedVideoEmbedUrl 校验；
 *   插入 iframe 前前台还应再校验一次，不合法当作无视频）。必须“点击后加载”，首屏不请求第三方；
 * - file：后台上传的视频文件（地址已补 basePath），poster 为作品封面（hero 尺寸）。
 */
export type WorkVideo =
  | { kind: 'embed'; embedUrl: string }
  | { kind: 'file'; src: string; mimeType: string; poster: ImageSource | null }

/** 作品所属课程：只有课程已发布、且课程的专业方向已发布时才给出（可以链接到 /courses/[slug]） */
export type WorkCourseRef = { id: number; title: string; slug: string }

export type WorkDetail = Omit<WorkCardData, 'software'> & {
  /** 主图（hero 尺寸，1920 宽，保留宽高比） */
  heroImage: ImageSource | null
  /** 分享图兜底（og 尺寸：1200×630 居中裁切的封面），交给 buildMetadata({ shareImage }) */
  shareImage: ImageSource | null
  /** 作品图集（不含封面）；灯箱序列用 workLightboxItems(work)（封面在前） */
  gallery: WorkGalleryItem[]
  video: WorkVideo | null
  description: string | null
  course: WorkCourseRef | null
  /** 使用软件（名称 + slug，按后台关联顺序） */
  software: SoftwareTag[]
  /** 相关作品：同课程优先、再同专业方向，排除本作品，最多 8 件 */
  related: WorkCardData[]
  /** 作品的 SEO 字段组，原样交给 buildMetadata({ seo }) */
  seo: Work['seo']
}

/** /works 的筛选条件（未出现 = 全部） */
export type WorkFilters = {
  /** 专业方向 slug */
  discipline?: string
  /** 软件 slug */
  software?: string
  /** 只看精选（URL 中为 featured=1） */
  featured?: true
}

export type WorkFilterKey = keyof WorkFilters

/**
 * 筛选项的来源（按后台排序）：已发布的专业方向、全部软件。
 * 只有在作品里出现过的取值才会成为筛选项（见 buildWorkFilterOptions）。
 */
export type WorkFacets = {
  disciplines: DisciplineRef[]
  software: SoftwareTag[]
}

/** 作品列表页的数据：全部作品卡片（已排序）+ 筛选项来源 */
export type WorkListData = {
  works: WorkCardData[]
  facets: WorkFacets
}

/** 后台「作品页面设置」（全局 work-pages），已补齐默认值 */
export type WorkPagesSettings = {
  list: {
    title: string
    description: string | null
    /** 作品列表页的 SEO 字段组，原样交给 buildMetadata({ seo }) */
    seo: WorkPage['list']['seo'] | null
  }
  detail: { ctaTitle: string; ctaDescription: string | null }
}
