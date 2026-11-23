import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { LINKABLE_COLLECTIONS } from '@/components/common/rich-text'
import { ARTICLE_PAGES_DEFAULTS } from '@/globals/article-pages-defaults'
import { cacheTags } from '@/hooks/revalidate'
import {
  buildArticleCategories,
  pickHotCourses,
  pickRelatedArticles,
  sortArticles,
  toArticleCard,
} from '@/lib/articles/mappers'
import type {
  ArticleCardData,
  ArticleDetail,
  ArticleListData,
  ArticlePagesSettings,
} from '@/lib/articles/types'
import { relationId } from '@/lib/course/mappers'
import type { CourseCardData } from '@/lib/course/types'
import {
  findCourseCards,
  guardCourseLinks,
  optionalText,
  queryCourseCards,
} from '@/lib/data/courses'
import { pickByIds } from '@/lib/home/rules'
import { imageSource } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { isValidSlug } from '@/lib/search-params'

import { loadIfKnown } from './known-key'

/**
 * 资讯的数据查询：资讯列表（含分类导航）、资讯详情、侧栏热门课程、资讯页面设置。
 *
 * 两层导出（同 src/lib/data/courses.ts）：
 * - `query*(payload, …)`：查询函数，接收 Payload 实例，集成测试直接调用；
 * - `get*(…)`：页面使用的缓存版本（unstable_cache + 与 Payload 钩子一致的缓存标签）。
 *
 * 草稿与隐私：Local API 默认 overrideAccess=true——
 * - 文章一律过滤 `_status: published`（草稿不出现在列表，详情返回 null）；分类没有草稿；
 * - 相关课程、热门课程只含可公开访问的课程（已发布、且所属专业方向已发布，findCourseCards）；
 * - 正文里指向不可访问课程的链接只渲染文字（guardCourseLinks）。
 * 只读取前台展示需要的字段，不涉及线索、用户等数据。
 *
 * 阅读量：页面显示的是缓存里的值（最迟 1 小时更新）；计数走 POST /api/articles/:id/view，
 * 原生 SQL 自增、不触发钩子，因此不会让这里的缓存失效。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 文章卡片用到的文章字段（mappers 读取这些字段，增删时同步） */
const ARTICLE_CARD_SELECT = {
  title: true,
  slug: true,
  excerpt: true,
  cover: true,
  category: true,
  publishedAt: true,
  views: true,
  authorName: true,
} as const

/** 填充分类时只取名称与 slug */
const CATEGORY_POPULATE = { name: true, slug: true } as const

/** 详情页“相关文章”的数量 */
export const RELATED_ARTICLES_LIMIT = 4

/** 数据库排序（发布时间降序、ID 降序）；NULL 的处理见 compareArticles，查出后统一 sortArticles */
const ARTICLE_SORT = ['-publishedAt', '-id']

/** 已发布文章的卡片（where 为附加条件），按 compareArticles 排序 */
async function findArticleCards(payload: Payload, where: Where | null): Promise<ArticleCardData[]> {
  const { docs } = await payload.find({
    collection: 'articles',
    where: where ? { and: [published, where] } : published,
    select: ARTICLE_CARD_SELECT,
    populate: { 'article-categories': CATEGORY_POPULATE },
    depth: 1,
    sort: ARTICLE_SORT,
    pagination: false,
  })
  return sortArticles(docs.map(toArticleCard))
}

/**
 * 查询：资讯列表的数据——全部已发布文章（发布时间降序、ID 降序）+ 有已发布文章的分类（后台排序，含描述与文章数）。
 * 列表页 / 分类页渲染时：articlesInCategory → paginate(items, page, ARTICLES_PAGE_SIZE)。
 */
export async function queryArticleList(payload: Payload): Promise<ArticleListData> {
  const [articles, categories] = await Promise.all([
    findArticleCards(payload, null),
    payload.find({
      collection: 'article-categories',
      select: { name: true, slug: true, description: true, order: true },
      depth: 0,
      sort: ['order', 'id'],
      pagination: false,
    }),
  ])
  return { articles, categories: buildArticleCategories(categories.docs, articles) }
}

/** 查询：资讯详情；文章不存在或未发布时返回 null */
export async function queryArticleDetail(
  payload: Payload,
  slug: string,
): Promise<ArticleDetail | null> {
  const { docs } = await payload.find({
    collection: 'articles',
    where: { and: [published, { slug: { equals: slug } }] },
    // depth 1：封面、分享图、分类，以及正文里的站内链接 / 关联 / 图片。
    // populate 对整次查询生效（正文里链接到的课程也按它取字段）：课程必须含 slug、title 与 _status，
    // 富文本才能生成 /courses/<slug> 并判断发布状态；相关课程只用 ID，下面单独查询可访问的课程卡片。
    populate: {
      'article-categories': CATEGORY_POPULATE,
      courses: { title: true, slug: true, _status: true },
    },
    depth: 1,
    limit: 1,
    pagination: false,
  })
  const article = docs[0]
  if (!article) return null

  const card = toArticleCard(article)
  const relatedIds = (article.relatedCourses ?? [])
    .map(relationId)
    .filter((id): id is number => id !== null)
  const categoryId = relationId(article.category)

  const [relatedCourses, sameCategory, content] = await Promise.all([
    relatedIds.length > 0 ? findCourseCards(payload, { id: { in: relatedIds } }) : [],
    categoryId !== null ? findArticleCards(payload, { category: { equals: categoryId } }) : [],
    guardCourseLinks(payload, article.content),
  ])

  return {
    ...card,
    heroImage: imageSource(article.cover, 'hero'),
    shareImage: imageSource(article.cover, 'og'),
    content,
    relatedCourses: pickByIds(relatedCourses, relatedIds),
    relatedArticles: pickRelatedArticles(sameCategory, article.id, RELATED_ARTICLES_LIMIT),
    updatedAt: article.updatedAt,
    seo: article.seo,
  }
}

/** 查询：资讯详情侧栏的“热门课程”（精选课程最多 3 门，没有精选时取各专业方向的长期就业班） */
export async function queryArticleHotCourses(payload: Payload): Promise<CourseCardData[]> {
  return pickHotCourses(await queryCourseCards(payload))
}

/** 查询：已发布文章的 slug（发布时间降序），用于 /articles/[slug] 的 generateStaticParams */
export async function queryPublishedArticleSlugs(payload: Payload): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'articles',
    where: published,
    select: { slug: true },
    depth: 0,
    sort: ARTICLE_SORT,
    pagination: false,
  })
  return docs.map((doc) => doc.slug).filter(isValidSlug)
}

/** 查询：资讯页面设置（全局 article-pages），缺省值见 src/globals/article-pages-defaults.ts */
export async function queryArticlePagesSettings(payload: Payload): Promise<ArticlePagesSettings> {
  const doc = await payload.findGlobal({ slug: 'article-pages', depth: 1 })
  const D = ARTICLE_PAGES_DEFAULTS
  return {
    list: {
      title: doc.list?.title?.trim() || D.list.title,
      description: optionalText(doc.list?.description, D.list.description),
      seo: doc.list?.seo ?? null,
    },
    detail: {
      sidebarTitle: doc.detail?.sidebarTitle?.trim() || D.detail.sidebarTitle,
      sidebarDescription: optionalText(doc.detail?.sidebarDescription, D.detail.sidebarDescription),
    },
  }
}

// ───────────────────────── 缓存版本（页面使用） ─────────────────────────

const tags = (...slugs: string[]) => [...new Set(slugs.map(cacheTags.collection))]

/** 资讯列表：文章、分类（名称 / slug / 描述 / 排序）、封面 */
const ARTICLE_LIST_TAGS = tags('articles', 'article-categories', 'media')

/** 课程卡片依赖：课程、专业方向、校区、开班计划、封面（同 src/lib/data/courses.ts） */
const COURSE_CARD_TAGS = tags('courses', 'disciplines', 'campuses', 'cohorts', 'media')

/**
 * 资讯详情：文章、分类、相关课程（课程卡片依赖），另加正文（富文本）里可链接的全部集合
 * （LINKABLE_COLLECTIONS 已含 courses / disciplines：guardCourseLinks 判断课程是否可访问）
 */
const ARTICLE_DETAIL_TAGS = [
  ...new Set([
    ...ARTICLE_LIST_TAGS,
    ...COURSE_CARD_TAGS,
    ...LINKABLE_COLLECTIONS.map(cacheTags.collection),
  ]),
]

/**
 * 含阅读量的缓存最长保留时间（秒）：阅读量上报不触发缓存失效，靠定时过期让页面上的数字最迟 1 小时更新
 * （页面自身的 revalidate 只重新渲染，不会让 unstable_cache 过期）
 */
export const ARTICLE_VIEWS_REVALIDATE = 3600

/** 资讯列表的数据（缓存）：全部已发布文章 + 分类导航。列表页与分类页共用，渲染时按分类与页码切分 */
export const getArticleList = unstable_cache(
  async (): Promise<ArticleListData> => queryArticleList(await getPayloadClient()),
  ['article-list'],
  { tags: ARTICLE_LIST_TAGS, revalidate: ARTICLE_VIEWS_REVALIDATE },
)

const cachedArticleDetail = unstable_cache(
  async (slug: string): Promise<ArticleDetail | null> =>
    queryArticleDetail(await getPayloadClient(), slug),
  ['article-detail'],
  { tags: ARTICLE_DETAIL_TAGS, revalidate: ARTICLE_VIEWS_REVALIDATE },
)

/** 资讯详情（缓存）；slug 不合法、文章不存在或未发布时返回 null → 页面 notFound() */
export async function getArticleDetail(slug: string): Promise<ArticleDetail | null> {
  if (!isValidSlug(slug)) return null
  // 不在已发布清单中的 slug 不进入按 slug 的缓存（见 ./known-key.ts）
  return loadIfKnown(slug, getPublishedArticleSlugs, cachedArticleDetail)
}

/** 资讯详情侧栏的热门课程（缓存，所有文章共用） */
export const getArticleHotCourses = unstable_cache(
  async (): Promise<CourseCardData[]> => queryArticleHotCourses(await getPayloadClient()),
  ['article-hot-courses'],
  { tags: COURSE_CARD_TAGS },
)

/** 已发布文章的 slug（缓存），用于 /articles/[slug] 的 generateStaticParams */
export const getPublishedArticleSlugs = unstable_cache(
  async (): Promise<string[]> => queryPublishedArticleSlugs(await getPayloadClient()),
  ['published-article-slugs'],
  { tags: tags('articles') },
)

/** 资讯页面设置（缓存）：列表页标题 / 简介 / SEO、详情页侧栏 */
export const getArticlePagesSettings = unstable_cache(
  async (): Promise<ArticlePagesSettings> => queryArticlePagesSettings(await getPayloadClient()),
  ['article-pages-settings'],
  { tags: [cacheTags.global('article-pages'), cacheTags.collection('media')] },
)
