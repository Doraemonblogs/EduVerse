import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { QUIZ_PATH } from '@/components/quiz/constants'
import { cacheTags } from '@/hooks/revalidate'
import { articleCategoryPath, articlePath, ARTICLES_PATH } from '@/lib/articles/paths'
import { CAMPUSES_PATH, campusPath } from '@/lib/campuses/paths'
import { CAREERS_PATH } from '@/lib/careers/paths'
import { COURSES_PATH, coursePath, majorPath } from '@/lib/course/paths'
import { isPageSlug } from '@/lib/data/pages'
import { getPayloadClient } from '@/lib/payload'
import { isValidSlug } from '@/lib/search-params'
import { latestDate, type SitemapItem } from '@/lib/seo/sitemap'
import { TEACHERS_PATH, teacherPath } from '@/lib/teachers/paths'
import { TUTORIALS_PATH } from '@/lib/tutorials/paths'
import { WORKS_PATH, workPath } from '@/lib/works/paths'

/**
 * sitemap.xml 的数据：全部可收录的页面及最后修改时间（文档 updatedAt）。
 *
 * 收录范围与各详情页的可见条件一致（Local API 默认 overrideAccess=true，这里逐一显式过滤）：
 * - 课程：已发布且所属专业方向已发布；专业方向 / 讲师 / 文章 / 校区 / 通用页面：已发布；
 * - 作品：已发布且已确认授权（consentConfirmed）；文章分类：至少有一篇已发布文章（与分类页一致）；
 * - 内容或列表页设置里勾选了“禁止搜索引擎收录”（seo.noindex）的不列入；
 * - slug 不符合路由规则的不列入（详情页会直接 404）。
 * 不列入：筛选组合、站内搜索、教程播放深链接（都是 noindex）、/majors（重定向到 /courses）、
 * 分页（第 2 页起可收录，但其中的内容都已单独列出）、设计规范与后台。
 * 只读 slug / id、updatedAt 与 seo.noindex，不涉及线索、用户等数据。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 只需要的字段：路径、修改时间、是否禁止收录 */
const DOC_SELECT = { slug: true, updatedAt: true, seo: { noindex: true } } as const

/** 带 SEO 字段组的文档（内容、单页设置，或列表页设置里的 list） */
type SeoDoc = { seo?: { noindex?: boolean | null } | null }

const isNoindex = (doc: SeoDoc | null | undefined) => doc?.seo?.noindex === true

/** 列表页设置（全局）：列表页 SEO 在 list.seo 下 */
type ListPageGlobal = { updatedAt?: string | null; list?: SeoDoc | null }
/** 单页设置（全局，首页 / 就业服务 / 职业测试）：SEO 在 seo 下 */
type PageGlobal = { updatedAt?: string | null } & SeoDoc

/** 读取全局设置（depth 0，只用到 updatedAt 与 noindex） */
async function findGlobals(payload: Payload) {
  const find = <S extends Parameters<Payload['findGlobal']>[0]['slug']>(slug: S) =>
    payload.findGlobal({ slug, depth: 0 })
  const [home, careers, quiz, courses, works, teachers, articles, campuses, tutorials] =
    await Promise.all([
      find('home-page'),
      find('careers-page'),
      find('quiz-settings'),
      find('course-pages'),
      find('work-pages'),
      find('teacher-pages'),
      find('article-pages'),
      find('campus-pages'),
      find('tutorial-pages'),
    ])
  const pages: Record<'home' | 'careers' | 'quiz', PageGlobal> = { home, careers, quiz }
  const lists: Record<
    'courses' | 'works' | 'teachers' | 'articles' | 'campuses' | 'tutorials',
    ListPageGlobal
  > = { courses, works, teachers, articles, campuses, tutorials }
  return { ...pages, lists }
}

const DETAIL = { changeFrequency: 'weekly', priority: 0.7 } as const
const LIST = { changeFrequency: 'daily', priority: 0.8 } as const
/** 通用页面（关于、联系、隐私政策 …）更新很少 */
const PAGE = { changeFrequency: 'monthly', priority: 0.4 } as const

/** 查询：sitemap 的全部条目（不经过缓存，集成测试可直接调用） */
export async function querySitemapItems(payload: Payload): Promise<SitemapItem[]> {
  const [
    courses,
    disciplines,
    works,
    teachers,
    articles,
    categories,
    campuses,
    pages,
    tutorials,
    globals,
  ] = await Promise.all([
    payload.find({
      collection: 'courses',
      where: { and: [published, { 'discipline._status': { equals: 'published' } }] },
      select: DOC_SELECT,
      depth: 0,
      sort: 'order',
      pagination: false,
    }),
    payload.find({
      collection: 'disciplines',
      where: published,
      select: DOC_SELECT,
      depth: 0,
      sort: 'order',
      pagination: false,
    }),
    payload.find({
      collection: 'works',
      where: { and: [published, { consentConfirmed: { equals: true } }] },
      select: { updatedAt: true, seo: { noindex: true } },
      depth: 0,
      sort: ['-publishedAt', '-id'],
      pagination: false,
    }),
    payload.find({
      collection: 'teachers',
      where: published,
      select: DOC_SELECT,
      depth: 0,
      sort: 'order',
      pagination: false,
    }),
    payload.find({
      collection: 'articles',
      where: published,
      select: { ...DOC_SELECT, category: true },
      depth: 0,
      sort: '-publishedAt',
      pagination: false,
    }),
    payload.find({
      collection: 'article-categories',
      select: { slug: true, updatedAt: true },
      depth: 0,
      sort: 'order',
      pagination: false,
    }),
    payload.find({
      collection: 'campuses',
      where: published,
      select: DOC_SELECT,
      depth: 0,
      sort: 'order',
      pagination: false,
    }),
    payload.find({
      collection: 'pages',
      where: published,
      select: DOC_SELECT,
      depth: 0,
      sort: 'slug',
      pagination: false,
    }),
    payload.find({
      collection: 'tutorials',
      where: published,
      select: { updatedAt: true },
      depth: 0,
      pagination: false,
    }),
    findGlobals(payload),
  ])
  const { home, careers, quiz, lists: settings } = globals

  const bySlug = (
    docs: ({ slug?: string | null; updatedAt: string } & SeoDoc)[],
    toPath: (slug: string) => string,
  ): SitemapItem[] =>
    docs.flatMap((doc) =>
      !isNoindex(doc) && doc.slug && isValidSlug(doc.slug)
        ? [{ path: toPath(doc.slug), lastModified: doc.updatedAt, ...DETAIL }]
        : [],
    )

  const courseItems = bySlug(courses.docs, coursePath)
  const majorItems = bySlug(disciplines.docs, majorPath)
  const workItems: SitemapItem[] = works.docs.flatMap((doc) =>
    isNoindex(doc) ? [] : [{ path: workPath(doc.id), lastModified: doc.updatedAt, ...DETAIL }],
  )
  const teacherItems = bySlug(teachers.docs, teacherPath)
  const articleItems = bySlug(articles.docs, articlePath)
  const campusItems = bySlug(campuses.docs, campusPath)
  const pageItems: SitemapItem[] = pages.docs.flatMap((doc) =>
    !isNoindex(doc) && doc.slug && isPageSlug(doc.slug)
      ? [{ path: `/${doc.slug}`, lastModified: doc.updatedAt, ...PAGE }]
      : [],
  )

  // 文章分类页：只列有已发布文章的分类（与 /articles/category/[slug] 一致），修改时间取分类与其中文章的最新值
  const articleDates = new Map<number, string[]>()
  for (const article of articles.docs) {
    const id = typeof article.category === 'number' ? article.category : article.category?.id
    if (id === undefined) continue
    articleDates.set(id, [...(articleDates.get(id) ?? []), article.updatedAt])
  }
  const categoryItems: SitemapItem[] = categories.docs
    .filter((category) => articleDates.has(category.id) && isValidSlug(category.slug))
    .map((category) => ({
      path: articleCategoryPath(category.slug),
      lastModified: latestDate([category.updatedAt, ...(articleDates.get(category.id) ?? [])]),
      ...LIST,
    }))

  const dates = (items: SitemapItem[]) => items.map((item) => item.lastModified)
  /** 列表页：页面设置里没有禁止收录时列入，修改时间取设置与列表内容的最新值 */
  const listPage = (
    path: string,
    setting: ListPageGlobal,
    contentDates: (string | null)[],
  ): SitemapItem[] =>
    isNoindex(setting.list)
      ? []
      : [{ path, lastModified: latestDate([setting.updatedAt, ...contentDates]), ...LIST }]
  /** 单页（就业服务、职业测试）：修改时间取页面设置 */
  const singlePage = (path: string, setting: PageGlobal): SitemapItem[] =>
    isNoindex(setting) ? [] : [{ path, lastModified: latestDate([setting.updatedAt]), ...LIST }]

  const lists: SitemapItem[] = [
    ...listPage(COURSES_PATH, settings.courses, dates(courseItems)),
    ...listPage(WORKS_PATH, settings.works, dates(workItems)),
    ...listPage(TEACHERS_PATH, settings.teachers, dates(teacherItems)),
    ...listPage(ARTICLES_PATH, settings.articles, dates(articleItems)),
    ...listPage(CAMPUSES_PATH, settings.campuses, dates(campusItems)),
    ...listPage(
      TUTORIALS_PATH,
      settings.tutorials,
      tutorials.docs.map((doc) => doc.updatedAt),
    ),
    ...singlePage(CAREERS_PATH, careers),
    ...singlePage(QUIZ_PATH, quiz),
  ]

  const details = [
    ...majorItems,
    ...courseItems,
    ...workItems,
    ...teacherItems,
    ...articleItems,
    ...categoryItems,
    ...campusItems,
    ...pageItems,
  ]
  const homeItem: SitemapItem[] = isNoindex(home)
    ? []
    : [
        {
          path: '/',
          lastModified: latestDate([home.updatedAt, ...dates(lists), ...dates(details)]),
          changeFrequency: 'daily',
          priority: 1,
        },
      ]

  return [...homeItem, ...lists, ...details]
}

/** 依赖的集合与全局（任一变更都让 sitemap 失效） */
const SITEMAP_TAGS = [
  ...[
    'courses',
    'disciplines',
    'works',
    'teachers',
    'articles',
    'article-categories',
    'campuses',
    'pages',
    'tutorials',
  ].map(cacheTags.collection),
  ...[
    'home-page',
    'course-pages',
    'work-pages',
    'teacher-pages',
    'article-pages',
    'campus-pages',
    'tutorial-pages',
    'careers-page',
    'quiz-settings',
  ].map(cacheTags.global),
]

/** sitemap 的全部条目（缓存，标签同各集合 / 全局） */
export const getSitemapItems = unstable_cache(
  async (): Promise<SitemapItem[]> => querySitemapItems(await getPayloadClient()),
  ['sitemap-items'],
  { tags: SITEMAP_TAGS },
)
