import type { CourseCardData } from '@/lib/course/types'
import type { ImageSource } from '@/lib/media'
import type { Article, ArticlePage } from '@/payload-types'

/**
 * 资讯模块（资讯列表 /articles、分类页 /articles/category/[slug]、资讯详情 /articles/[slug]）的视图模型。
 *
 * - 全部是可 JSON 序列化的普通对象：可以直接作为 props 传给客户端组件，也能进 unstable_cache；
 * - 由数据层 `src/lib/data/articles.ts` 从 Payload 文档映射而来，页面与组件只使用这些类型；
 * - 草稿已在数据层剔除：这里出现的文章都是已发布的；相关课程只含可公开访问的课程
 *   （已发布、且所属专业方向已发布）；正文里指向不可访问课程的链接只渲染文字（guardCourseLinks）。
 */

/** 文章分类引用（卡片、面包屑用） */
export type ArticleCategoryRef = {
  id: number
  name: string
  slug: string
}

/** 分类导航 / 分类页用的分类：只包含有已发布文章的分类，按后台排序 */
export type ArticleCategoryItem = ArticleCategoryRef & {
  /**
   * 后台填写的分类描述；未填写为 null。分类页 h1 下的简介与 meta description 用
   * articleCategoryDescription()（未填写时为含分类名与文章数的模板，各分类页互不重复）
   */
  description: string | null
  /** 该分类已发布的文章数（≥ 1） */
  count: number
}

export type ArticleCardData = {
  id: number
  slug: string
  title: string
  excerpt: string
  /** 封面（card 尺寸，800 宽）；alt 为媒体库填写的替代文字，可能为空，组件用标题兜底 */
  cover: ImageSource | null
  /**
   * 同一张封面的大图（hero 尺寸，最宽 1920，原图更小时为原图），给资讯列表第 1 页的头条大卡
   * （≥ lg 约 850px 宽，高分屏需要 1700px 左右；800px 的 card 尺寸会被放大发虚）。
   * toArticleCard 总会给出；缺省（如测试数据）时头条退回 cover
   */
  headlineCover?: ImageSource | null
  /** 分类；分类被删除时为 null（只出现在“全部”里） */
  category: ArticleCategoryRef | null
  /**
   * 发布时间（ISO 时间戳）。展示用 formatCohortDate()（北京时间“2026年11月23日”），
   * `<time dateTime>` 用 toBeijingIsoDate()（均在 src/lib/course/format.ts）
   */
  publishedAt: string
  /**
   * 阅读量（来自缓存数据，最迟 1 小时更新；展示用 formatArticleViews()）。
   * 前台上报走 POST /api/articles/:id/view（原生 SQL 自增，不触发缓存失效）
   */
  views: number
  /** 作者署名（后台“作者”，默认“教研中心”）；清空时为 null */
  authorName: string | null
}

export type ArticleDetail = ArticleCardData & {
  /** 首屏大图（hero 尺寸，文章封面） */
  heroImage: ImageSource | null
  /**
   * 分享图兜底（og 尺寸：1200×630 居中裁切的封面），交给 buildMetadata({ shareImage })；
   * JSON-LD Article.image 也用它（绝对地址用 absoluteUrl() 处理）
   */
  shareImage: ImageSource | null
  /**
   * 正文（富文本，交给 <RichText data={content} />）。
   * 指向不可访问课程的链接已在数据层标记为草稿，只渲染文字（guardCourseLinks）
   */
  content: Article['content']
  /** 相关课程：后台关联顺序，只含可公开访问的课程（CourseCard 的数据） */
  relatedCourses: CourseCardData[]
  /** 同分类的其它文章（发布时间降序，不含本文），最多 4 篇；没有分类时为空 */
  relatedArticles: ArticleCardData[]
  /** 最后修改时间（ISO 时间戳），JSON-LD dateModified；阅读量上报不会改动它 */
  updatedAt: string
  /** 文章的 SEO 字段组，原样交给 buildMetadata({ seo }) */
  seo: Article['seo']
}

/**
 * 资讯列表的数据：全部已发布文章（发布时间降序、ID 降序）+ 有文章的分类（后台排序）。
 * 列表页与分类页共用一份缓存：分类页用 articlesInCategory(list.articles, slug) 过滤，
 * 再用 paginate(items, page, ARTICLES_PAGE_SIZE) 分页。
 */
export type ArticleListData = {
  articles: ArticleCardData[]
  categories: ArticleCategoryItem[]
}

/** 后台「资讯页面设置」（全局 article-pages），已补齐默认值 */
export type ArticlePagesSettings = {
  list: {
    title: string
    description: string | null
    /** 资讯列表页的 SEO 字段组，原样交给 buildMetadata({ seo }) */
    seo: ArticlePage['list']['seo'] | null
  }
  detail: { sidebarTitle: string; sidebarDescription: string | null }
}
