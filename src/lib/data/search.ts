import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'
import { cache } from 'react'

import { cacheTags } from '@/hooks/revalidate'
import { pickHotCourses } from '@/lib/articles/mappers'
import { DISCIPLINE_REF_SELECT, queryCourseCards } from '@/lib/data/courses'
import { getPayloadClient } from '@/lib/payload'
import {
  rankHits,
  SEARCH_GROUP_LIMIT,
  toArticleHit,
  toCourseHit,
  toDisciplineHit,
  toTeacherHit,
  toWorkHit,
} from '@/lib/search/mappers'
import { escapeLikeTerm, searchCacheKey, searchQuerySchema, searchTerms } from '@/lib/search/query'
import {
  SEARCH_GROUP_KEYS,
  type SearchGroup,
  type SearchGroupKey,
  type SearchHit,
  type SearchResults,
  type SearchSuggestions,
} from '@/lib/search/types'

/**
 * 站内搜索的数据查询（MVP：数据库模糊匹配，PostgreSQL ILIKE，大小写不敏感，中文不分词）。
 *
 * 两层导出（同 src/lib/data/courses.ts）：
 * - `query*(payload, …)`：查询函数，接收 Payload 实例，集成测试直接调用；
 * - `get*(…)`：页面使用的版本。热门入口没有参数，走 unstable_cache（相关集合标签）；
 *   搜索结果**不进入持久数据缓存**：关键词是访客任意输入，每个不同的关键词都会在磁盘上新增一个缓存文件
 *   （.next/cache/fetch-cache，不会被淘汰），可被脚本刷满磁盘。改用 React cache() 只在单次请求内去重，
 *   每次请求查 5 次小表 ILIKE（每类最多 30 条），开销可以接受。
 *
 * 搜索范围（每类最多 10 条，另给匹配总数）：
 * - 课程：标题、简介；已发布、且所属专业方向已发布；
 * - 专业方向：名称、简称、tagline；已发布；
 * - 资讯：标题、searchText（标题 + 摘要 + 正文纯文本）；已发布；
 * - 讲师：姓名、头衔、擅长领域；已发布；
 * - 学员作品：标题、作品说明；已发布、且已确认学员授权。
 * 关键词按空格拆成检索词（searchTerms），每个检索词都要在某个被搜索字段中出现（AND）；
 * LIKE 通配符按字面匹配（escapeLikeTerm）。不涉及线索、用户等数据。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

/**
 * 每组从数据库取的候选数：多取一些，再把标题匹配的排到前面（rankHits）后截取 10 条，
 * 避免只在正文中提到关键词的内容挤掉标题匹配的内容。
 */
const SEARCH_FETCH_LIMIT = 30

/** 每个检索词都要出现在 fields 中的某一个字段里 */
function termsWhere(fields: readonly string[], terms: readonly string[]): Where {
  return {
    and: terms.map((term) => ({
      or: fields.map((field) => ({ [field]: { contains: escapeLikeTerm(term) } })),
    })),
  }
}

type GroupQuery = { docs: SearchHit[]; total: number }

async function searchCourses(payload: Payload, terms: string[]): Promise<GroupQuery> {
  const result = await payload.find({
    collection: 'courses',
    where: {
      and: [
        published,
        { 'discipline._status': { equals: 'published' } },
        termsWhere(['title', 'summary'], terms),
      ],
    },
    select: { title: true, slug: true, summary: true, cover: true, discipline: true },
    populate: { disciplines: DISCIPLINE_REF_SELECT },
    depth: 1,
    sort: ['order', 'id'],
    limit: SEARCH_FETCH_LIMIT,
  })
  return { docs: result.docs.map((doc) => toCourseHit(doc, terms)), total: result.totalDocs }
}

async function searchDisciplines(payload: Payload, terms: string[]): Promise<GroupQuery> {
  const result = await payload.find({
    collection: 'disciplines',
    where: { and: [published, termsWhere(['name', 'shortName', 'tagline'], terms)] },
    select: { name: true, slug: true, tagline: true, cover: true },
    depth: 1,
    sort: ['order', 'id'],
    limit: SEARCH_FETCH_LIMIT,
  })
  return { docs: result.docs.map((doc) => toDisciplineHit(doc, terms)), total: result.totalDocs }
}

async function searchArticles(payload: Payload, terms: string[]): Promise<GroupQuery> {
  const result = await payload.find({
    collection: 'articles',
    where: { and: [published, termsWhere(['title', 'searchText'], terms)] },
    select: {
      title: true,
      slug: true,
      excerpt: true,
      searchText: true,
      cover: true,
      category: true,
    },
    populate: { 'article-categories': { name: true } },
    depth: 1,
    sort: ['-publishedAt', '-id'],
    limit: SEARCH_FETCH_LIMIT,
  })
  return { docs: result.docs.map((doc) => toArticleHit(doc, terms)), total: result.totalDocs }
}

async function searchTeachers(payload: Payload, terms: string[]): Promise<GroupQuery> {
  const result = await payload.find({
    collection: 'teachers',
    where: { and: [published, termsWhere(['name', 'title', 'specialties.text'], terms)] },
    select: { name: true, slug: true, title: true, avatar: true, specialties: true },
    depth: 1,
    sort: ['order', 'id'],
    limit: SEARCH_FETCH_LIMIT,
  })
  return { docs: result.docs.map((doc) => toTeacherHit(doc, terms)), total: result.totalDocs }
}

async function searchWorks(payload: Payload, terms: string[]): Promise<GroupQuery> {
  const result = await payload.find({
    collection: 'works',
    where: {
      and: [
        published,
        { consentConfirmed: { equals: true } },
        termsWhere(['title', 'description'], terms),
      ],
    },
    select: { title: true, description: true, cover: true, author: true },
    depth: 1,
    sort: ['-publishedAt', '-id'],
    limit: SEARCH_FETCH_LIMIT,
  })
  return { docs: result.docs.map((doc) => toWorkHit(doc, terms)), total: result.totalDocs }
}

const SEARCHERS: Record<
  SearchGroupKey,
  (payload: Payload, terms: string[]) => Promise<GroupQuery>
> = {
  courses: searchCourses,
  disciplines: searchDisciplines,
  articles: searchArticles,
  teachers: searchTeachers,
  works: searchWorks,
}

/** 没有结果（五个分组都为空） */
export function emptySearchResults(): SearchResults {
  return { groups: SEARCH_GROUP_KEYS.map((key) => ({ key, total: 0, hits: [] })), total: 0 }
}

/** 按检索词查五类内容（检索词已校验；为空时不查库） */
async function searchByTerms(payload: Payload, terms: string[]): Promise<SearchResults> {
  if (terms.length === 0) return emptySearchResults()
  const groups: SearchGroup[] = await Promise.all(
    SEARCH_GROUP_KEYS.map(async (key) => {
      const { docs, total } = await SEARCHERS[key](payload, terms)
      return { key, total, hits: rankHits(docs, terms, SEARCH_GROUP_LIMIT) }
    }),
  )
  return { groups, total: groups.reduce((sum, group) => sum + group.total, 0) }
}

/**
 * 查询：站内搜索结果。query 应为 parseSearchQuery() 给出的规范化关键词（未规范化也可以，这里会再规范化）；
 * 不合法（空、只有空白、超过 50 个字）时直接返回空结果，不查库。
 */
export async function querySearchResults(payload: Payload, query: string): Promise<SearchResults> {
  const parsed = searchQuerySchema.safeParse(query)
  if (!parsed.success) return emptySearchResults()
  return searchByTerms(payload, searchTerms(parsed.data))
}

/** 热门入口里的专业方向数、课程数 */
const SUGGESTED_DISCIPLINES = 8
const SUGGESTED_COURSES = 6

/**
 * 查询：空搜索 / 无结果时的热门入口——在导航中显示的已发布专业方向（后台排序，最多 8 个），
 * 热门课程（精选课程最多 6 门，没有精选时取各专业方向的长期就业班）。
 */
export async function querySearchSuggestions(payload: Payload): Promise<SearchSuggestions> {
  const [{ docs }, courses] = await Promise.all([
    payload.find({
      collection: 'disciplines',
      where: { and: [published, { showInNav: { equals: true } }] },
      select: { name: true, shortName: true, slug: true },
      depth: 0,
      sort: ['order', 'id'],
      limit: SUGGESTED_DISCIPLINES,
      pagination: false,
    }),
    queryCourseCards(payload),
  ])
  return {
    disciplines: docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      shortName: doc.shortName?.trim() || doc.name,
      slug: doc.slug,
    })),
    courses: pickHotCourses(courses, SUGGESTED_COURSES).map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      disciplineName: course.discipline.name,
    })),
  }
}

// ───────────────────────── 缓存版本（页面使用） ─────────────────────────

const tags = (...slugs: string[]) => [...new Set(slugs.map(cacheTags.collection))]

/**
 * 单次请求内去重（React cache，请求结束即丢弃，不写磁盘）。参数是已校验关键词的缓存键
 * （searchCacheKey：规范化 + 小写），不再按长度校验：个别字符转小写后会变长（如“İ”），
 * 不能因此把合法的关键词当成超长。
 */
const searchResultsPerRequest = cache(async (key: string): Promise<SearchResults> =>
  searchByTerms(await getPayloadClient(), searchTerms(key)),
)

/**
 * 站内搜索结果（每次请求查库，同一请求内去重；不进入持久数据缓存，原因见文件头注释）。
 * 关键词不合法时返回空结果，不查库。
 * 高亮用 splitHighlight(text, parsed.terms)（检索词已转小写，匹配不区分大小写）。
 */
export async function getSearchResults(query: string): Promise<SearchResults> {
  const parsed = searchQuerySchema.safeParse(query)
  if (!parsed.success) return emptySearchResults()
  return searchResultsPerRequest(searchCacheKey(parsed.data))
}

/** 热门入口（缓存，没有参数，只有一份）：专业方向、热门课程 */
export const getSearchSuggestions = unstable_cache(
  async (): Promise<SearchSuggestions> => querySearchSuggestions(await getPayloadClient()),
  ['search-suggestions'],
  { tags: tags('courses', 'disciplines', 'campuses', 'cohorts', 'media') },
)
