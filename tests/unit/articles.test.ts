import { describe, expect, it } from 'vitest'

import {
  articleCategoryDescription,
  articleViewsLabel,
  formatArticleViews,
  normalizeViews,
} from '@/lib/articles/format'
import {
  articlesInCategory,
  buildArticleCategories,
  compareArticles,
  findArticleCategory,
  pickHotCourses,
  pickRelatedArticles,
  sortArticles,
  toArticleCard,
  toArticleCategoryRef,
  type ArticleCardSource,
} from '@/lib/articles/mappers'
import {
  ARTICLES_PAGE_SIZE,
  articleCategoryPath,
  articlePath,
  articlesPageHref,
  articleViewSessionKey,
  articleViewUrl,
} from '@/lib/articles/paths'
import type { ArticleCardData } from '@/lib/articles/types'
import { articleViewKey, parseArticleId, ViewDeduper } from '@/lib/articles/view'
import type { Media } from '@/payload-types'

import { courseCard, disciplineRef } from '../helpers/course-fixtures'

const media = (name: string): Media =>
  ({
    id: 1,
    alt: '封面',
    url: `/api/media/file/${name}.webp`,
    width: 1600,
    height: 1000,
    sizes: {
      card: { url: `/api/media/file/${name}-800.webp`, width: 800, height: 500 },
      hero: { url: `/api/media/file/${name}-1920.webp`, width: 1920, height: 1200 },
      og: { url: `/api/media/file/${name}-og.webp`, width: 1200, height: 630 },
    },
    updatedAt: '',
    createdAt: '',
  }) as Media

const NEWS = { id: 1, name: '学院新闻', slug: 'news', order: 1, description: ' 学院动态 ' }
const GUIDE = { id: 2, name: '学习干货', slug: 'guide', order: 0, description: '' }
const FAQ = { id: 3, name: '常见问题', slug: 'faq', order: 2 }

const source = (overrides: Partial<ArticleCardSource> = {}): ArticleCardSource => ({
  id: 10,
  slug: 'maya-basics',
  title: ' Maya 入门 ',
  excerpt: ' 摘要 ',
  cover: media('a'),
  category: NEWS,
  publishedAt: '2026-11-20T02:00:00.000Z',
  views: 128,
  authorName: ' 教研中心 ',
  ...overrides,
})

const card = (id: number, publishedAt: string, category = NEWS): ArticleCardData => ({
  ...toArticleCard(source({ id, publishedAt, category })),
})

describe('资讯路径', () => {
  it('详情、分类页与分页地址：第 1 页不带 ?page=', () => {
    expect(articlePath('maya-basics')).toBe('/articles/maya-basics')
    expect(articleCategoryPath('news')).toBe('/articles/category/news')
    expect(articlesPageHref(1)).toBe('/articles')
    expect(articlesPageHref(3)).toBe('/articles?page=3')
    expect(articlesPageHref(1, 'news')).toBe('/articles/category/news')
    expect(articlesPageHref(2, 'news')).toBe('/articles/category/news?page=2')
    expect(ARTICLES_PAGE_SIZE).toBe(12)
  })

  it('阅读量上报地址补上 basePath；会话标记按文章区分', () => {
    expect(articleViewUrl(12, '')).toBe('/api/articles/12/view')
    expect(articleViewUrl(12, '/EduVerse')).toBe('/EduVerse/api/articles/12/view')
    expect(articleViewSessionKey(12)).not.toBe(articleViewSessionKey(13))
  })
})

describe('toArticleCard', () => {
  it('去空格、取 card 尺寸封面（头条另取 hero 尺寸大图）、分类引用与作者；阅读量取整', () => {
    expect(toArticleCard(source({ views: 12.7 }))).toEqual({
      id: 10,
      slug: 'maya-basics',
      title: 'Maya 入门',
      excerpt: '摘要',
      cover: { src: '/api/media/file/a-800.webp', alt: '封面', width: 800, height: 500 },
      headlineCover: {
        src: '/api/media/file/a-1920.webp',
        alt: '封面',
        width: 1920,
        height: 1200,
      },
      category: { id: 1, name: '学院新闻', slug: 'news' },
      publishedAt: '2026-11-20T02:00:00.000Z',
      views: 12,
      authorName: '教研中心',
    })
  })

  it('原图比 hero 尺寸小（没有生成 hero 尺寸）时头条用原图，封面未填充时都为 null', () => {
    const small = media('small')
    small.sizes = { ...small.sizes, hero: { url: null, width: null, height: null } }
    expect(toArticleCard(source({ cover: small })).headlineCover).toEqual({
      src: '/api/media/file/small.webp',
      alt: '封面',
      width: 1600,
      height: 1000,
    })
    // 封面未填充（只有 ID）
    const bare = toArticleCard(source({ cover: 99 }))
    expect(bare.cover).toBeNull()
    expect(bare.headlineCover).toBeNull()
  })

  it('分类未填充（只有 ID）或已删除时为 null；作者清空时为 null', () => {
    const article = toArticleCard(source({ category: 3, authorName: ' ' }))
    expect(article.category).toBeNull()
    expect(article.authorName).toBeNull()
    expect(toArticleCategoryRef(null)).toBeNull()
  })

  it('阅读量：空值、负数、非数字按 0', () => {
    expect(normalizeViews(null)).toBe(0)
    expect(normalizeViews(undefined)).toBe(0)
    expect(normalizeViews(-3)).toBe(0)
    expect(normalizeViews(Number.NaN)).toBe(0)
    expect(normalizeViews('42')).toBe(42)
  })
})

describe('文章排序', () => {
  it('发布时间降序，相同时 ID 降序；没有发布时间的排在最后', () => {
    const a = card(1, '2026-11-20T00:00:00.000Z')
    const b = card(2, '2026-11-21T00:00:00.000Z')
    const c = card(3, '2026-11-20T00:00:00.000Z')
    const none = { ...card(4, ''), publishedAt: '' }
    expect(sortArticles([a, none, b, c]).map((x) => x.id)).toEqual([2, 3, 1, 4])
    expect(compareArticles(a, a)).toBe(0)
  })
})

describe('分类导航', () => {
  const articles = [
    card(1, '2026-11-01', NEWS),
    card(2, '2026-11-02', GUIDE),
    card(3, '2026-11-03', NEWS),
  ]

  it('只保留有文章的分类，按后台排序，带文章数与描述', () => {
    expect(buildArticleCategories([NEWS, GUIDE, FAQ], articles)).toEqual([
      { id: 2, name: '学习干货', slug: 'guide', description: null, count: 1 },
      { id: 1, name: '学院新闻', slug: 'news', description: '学院动态', count: 2 },
    ])
  })

  it('按分类过滤文章（保持顺序），按 slug 找分类；没有文章的分类找不到', () => {
    expect(articlesInCategory(articles, 'news').map((a) => a.id)).toEqual([1, 3])
    expect(articlesInCategory(articles, 'faq')).toEqual([])
    const categories = buildArticleCategories([NEWS, GUIDE, FAQ], articles)
    expect(findArticleCategory(categories, 'guide')?.name).toBe('学习干货')
    expect(findArticleCategory(categories, 'faq')).toBeNull()
  })

  it('分类页简介：有描述时用描述；没有描述时用含分类名与文章数的模板，各分类互不相同', () => {
    const [guide, news] = buildArticleCategories([NEWS, GUIDE, FAQ], articles)
    expect(articleCategoryDescription(news!)).toBe('学院动态')
    expect(articleCategoryDescription(guide!)).toBe(
      '「学习干货」分类下的全部资讯，共 1 篇，按发布时间从新到旧排列。',
    )
    expect(articleCategoryDescription({ name: '常见问题', description: '  ', count: 4 })).toBe(
      '「常见问题」分类下的全部资讯，共 4 篇，按发布时间从新到旧排列。',
    )
    const fallbacks = [
      { name: '学院新闻', description: null, count: 6 },
      { name: '行业资讯', description: null, count: 6 },
    ].map(articleCategoryDescription)
    expect(new Set(fallbacks).size).toBe(2)
  })
})

describe('相关文章与热门课程', () => {
  it('相关文章排除本文、按发布时间降序取前 N 篇', () => {
    const list = [
      card(1, '2026-11-01'),
      card(2, '2026-11-05'),
      card(3, '2026-11-04'),
      card(4, '2026-11-03'),
      card(5, '2026-11-02'),
      card(6, '2026-11-06'),
    ]
    expect(pickRelatedArticles(list, 6, 4).map((a) => a.id)).toEqual([2, 3, 4, 5])
  })

  it('热门课程：精选课程按列表顺序最多 3 门；没有精选时取各专业方向的长期就业班', () => {
    const animation = disciplineRef({ id: 1 })
    const game = disciplineRef({ id: 2, slug: 'game-art' })
    const courses = [
      courseCard({ id: 1, discipline: animation, classType: 'short_term' }),
      courseCard({ id: 2, discipline: animation }),
      courseCard({ id: 3, discipline: animation }),
      courseCard({ id: 4, discipline: game }),
    ]
    expect(pickHotCourses(courses).map((c) => c.id)).toEqual([2, 4])

    const featured = courses.map((c) => ({ ...c, featured: c.id !== 2 }))
    expect(pickHotCourses(featured).map((c) => c.id)).toEqual([1, 3, 4])
    expect(pickHotCourses(featured, 2).map((c) => c.id)).toEqual([1, 3])
  })
})

describe('阅读量展示', () => {
  it('不足 1 万显示整数，1 万起以“万”为单位保留 1 位小数', () => {
    expect(formatArticleViews(0)).toBe('0')
    expect(formatArticleViews(9999)).toBe('9999')
    expect(formatArticleViews(10_000)).toBe('1万')
    expect(formatArticleViews(12_345)).toBe('1.2万')
    expect(formatArticleViews(30_999)).toBe('3万')
    expect(formatArticleViews(1_234_567)).toBe('123.4万')
    expect(formatArticleViews(-5)).toBe('0')
    expect(articleViewsLabel(12_345)).toBe('1.2万 次阅读')
  })
})

describe('阅读量上报：参数与去重', () => {
  it('文章 ID 只接受不带前导 0 的正整数（整数范围内）', () => {
    expect(parseArticleId('12')).toBe(12)
    expect(parseArticleId('2147483647')).toBe(2147483647)
    for (const value of ['0', '012', '-1', '1.5', 'abc', '', '2147483648', 12, undefined]) {
      expect(parseArticleId(value)).toBeNull()
    }
  })

  it('同一个键在时间窗内只放行一次，过期后再次放行；forget 撤销放行', () => {
    const deduper = new ViewDeduper(1000)
    const key = articleViewKey(12, '203.0.113.7')
    expect(deduper.shouldCount(key, 0)).toBe(true)
    expect(deduper.shouldCount(key, 999)).toBe(false)
    expect(deduper.shouldCount(articleViewKey(13, '203.0.113.7'), 999)).toBe(true)
    expect(deduper.shouldCount(articleViewKey(12, '203.0.113.8'), 999)).toBe(true)
    expect(deduper.shouldCount(key, 1000)).toBe(true)
    deduper.forget(key)
    expect(deduper.shouldCount(key, 1001)).toBe(true)
  })

  it('键数量有上限：先清理过期的，仍超出时丢弃最早的', () => {
    const deduper = new ViewDeduper(1000, 3)
    for (const ip of ['a', 'b', 'c']) deduper.shouldCount(ip, 0)
    deduper.shouldCount('d', 2000)
    // a、b、c 已过期被清理，只剩 d
    expect(deduper.size).toBe(1)
    for (const ip of ['e', 'f', 'g']) deduper.shouldCount(ip, 2001)
    expect(deduper.size).toBe(3)
    // 最早的 d 被丢弃：再次出现时重新放行
    expect(deduper.shouldCount('d', 2002)).toBe(true)
    expect(deduper.shouldCount('g', 2002)).toBe(false)
  })
})
