// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import type {
  ArticleCardData,
  ArticleCategoryItem,
  ArticleDetail,
  ArticlePagesSettings,
} from '@/lib/articles/types'
import { paginate } from '@/lib/pagination'

import { courseCard, disciplineRef } from '../helpers/course-fixtures'

/**
 * 资讯页面（Articles Agent）：列表 / 分类页的纯函数与主体组件、资讯详情主体、侧栏、Article 结构化数据（jsdom）。
 * 真实数据、吸顶、分页 404 与阅读量上报由 e2e（tests/e2e/articles.e2e.spec.ts）覆盖。
 */
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    scroll: _scroll,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const { articlesPagedTitle, buildArticleCategoryNav, hasArticleHeadline } =
  await import('@/components/articles/articles-list')
const { ArticleCategoryNav } = await import('@/components/articles/article-category-nav')
const { ArticleGrid } = await import('@/components/articles/article-grid')
const { ArticlesListView } = await import('@/components/articles/articles-list-view')
const { revealCurrentItem, shouldRevealCurrent } =
  await import('@/components/articles/reveal-current-category')
const { ArticleDetailView, articleBreadcrumbs } =
  await import('@/components/articles/detail/article-detail-view')
const { articleJsonLd, authorJsonLdType } =
  await import('@/components/articles/detail/article-json-ld')
const { LeadDialogProvider } = await import('@/components/lead/lead-dialog')

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver)
  // 阅读量上报组件在挂载时调用：单元测试里只确认不报错，不真的发请求
  vi.stubGlobal('navigator', { ...navigator, sendBeacon: vi.fn(() => true) })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const NEWS = { id: 1, name: '学院新闻', slug: 'news' }
const GUIDE = { id: 2, name: '学习干货', slug: 'learning' }

const article = (overrides: Partial<ArticleCardData> = {}): ArticleCardData => ({
  id: 100,
  slug: 'open-day',
  title: '北京海淀校区秋季开放日活动回顾',
  excerpt: '访客参观了机房与作品展厅，旁听了两场公开课。',
  cover: { src: '/api/media/file/open-day-800x450.webp', alt: '', width: 800, height: 450 },
  category: NEWS,
  publishedAt: '2026-10-30T15:35:15.652Z', // 北京时间 10 月 30 日 23:35
  views: 12_345,
  authorName: '北京海淀校区',
  ...overrides,
})

/** n 篇文章：ID 从 1 起，标题“文章 1”… */
const articles = (n: number): ArticleCardData[] =>
  Array.from({ length: n }, (_, i) =>
    article({ id: i + 1, slug: `article-${i + 1}`, title: `文章 ${i + 1}` }),
  )

const categories: ArticleCategoryItem[] = [
  { ...NEWS, description: null, count: 6 },
  { ...GUIDE, description: '软件、作品集与学习方法', count: 10 },
]

const leadConfig: LeadFormConfig = {
  disciplines: [{ id: 7, name: '三维动画' }],
  cities: ['北京'],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const settings: ArticlePagesSettings = {
  list: { title: '资讯', description: '学院新闻与学习干货', seo: null },
  detail: { sidebarTitle: '预约免费试听', sidebarDescription: '读完还有疑问？' },
}

const content = (headings: ('h1' | 'h2' | 'h3')[]): ArticleDetail['content'] => ({
  root: {
    type: 'root',
    direction: null,
    format: '',
    indent: 0,
    version: 1,
    children: [
      ...headings.map((tag) => ({
        type: 'heading',
        tag,
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'text',
            text: `${tag} 标题`,
            version: 1,
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
          },
        ],
      })),
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        children: [
          {
            type: 'text',
            text: '正文段落',
            version: 1,
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
          },
        ],
      },
    ],
  },
})

const detail = (overrides: Partial<ArticleDetail> = {}): ArticleDetail => ({
  ...article(),
  heroImage: {
    src: '/api/media/file/open-day-1400x788.webp',
    alt: '开放日现场',
    width: 1400,
    height: 788,
  },
  shareImage: { src: '/api/media/file/open-day-1200x630.webp', alt: '', width: 1200, height: 630 },
  content: content(['h2', 'h3']),
  relatedCourses: [courseCard()],
  relatedArticles: [article({ id: 101, slug: 'game-jam', title: '校内 48 小时游戏创作营结营' })],
  updatedAt: '2026-11-01T02:00:00.000Z',
  seo: undefined,
  ...overrides,
})

describe('资讯列表的纯函数', () => {
  it('第 2 页起标题加页码，第 1 页与非法页码原样返回', () => {
    expect(articlesPagedTitle('资讯', 1)).toBe('资讯')
    expect(articlesPagedTitle('资讯', 2)).toBe('资讯（第 2 页）')
    expect(articlesPagedTitle('学习干货', 3)).toBe('学习干货（第 3 页）')
    expect(articlesPagedTitle('资讯', 0)).toBe('资讯')
    expect(articlesPagedTitle('资讯', 1.5)).toBe('资讯')
  })

  it('头条版式只在第 1 页且至少 3 篇时使用', () => {
    expect(hasArticleHeadline(1, 12)).toBe(true)
    expect(hasArticleHeadline(1, 3)).toBe(true)
    expect(hasArticleHeadline(1, 2)).toBe(false)
    expect(hasArticleHeadline(2, 12)).toBe(false)
  })

  it('分类导航：“全部”在前（文章总数），其后按传入顺序，当前项只有一个', () => {
    expect(buildArticleCategoryNav(categories, 16, null)).toEqual([
      { key: 'all', label: '全部', href: '/articles', count: 16, current: true },
      { key: 'news', label: '学院新闻', href: '/articles/category/news', count: 6, current: false },
      {
        key: 'learning',
        label: '学习干货',
        href: '/articles/category/learning',
        count: 10,
        current: false,
      },
    ])
    const nav = buildArticleCategoryNav(categories, 16, 'learning')
    expect(nav.filter((item) => item.current).map((item) => item.key)).toEqual(['learning'])
  })

  it('面包屑：资讯 › 分类 › 标题；没有分类时省略分类一级', () => {
    expect(articleBreadcrumbs(article(), '资讯')).toEqual([
      { label: '资讯', href: '/articles' },
      { label: '学院新闻', href: '/articles/category/news' },
      { label: '北京海淀校区秋季开放日活动回顾', href: '/articles/open-day' },
    ])
    expect(articleBreadcrumbs(article({ category: null }), '资讯')).toEqual([
      { label: '资讯', href: '/articles' },
      { label: '北京海淀校区秋季开放日活动回顾', href: '/articles/open-day' },
    ])
  })
})

describe('分类导航当前项滚动', () => {
  /** 横向溢出的列表：宽 300，可滚动 600；当前项在 [left, left + width] */
  function scrollList(left: number, width = 90) {
    const list = document.createElement('ul')
    const item = document.createElement('a')
    item.setAttribute('aria-current', 'page')
    list.append(item)
    Object.defineProperty(list, 'scrollWidth', { value: 600 })
    Object.defineProperty(list, 'clientWidth', { value: 300 })
    list.getBoundingClientRect = () => ({ left: 0, right: 300 }) as DOMRect
    item.getBoundingClientRect = () => ({ left, right: left + width, width }) as DOMRect
    return list
  }

  it('当前项不完整可见时滚到居中；完整可见时不动', () => {
    const hidden = scrollList(450)
    revealCurrentItem(hidden)
    expect(hidden.scrollLeft).toBe(450 - (300 - 90) / 2)

    const visible = scrollList(100)
    revealCurrentItem(visible)
    expect(visible.scrollLeft).toBe(0)
  })

  it('首次挂载时访客已滑动过导航则不跳回；切换分类后总是检查', () => {
    expect(shouldRevealCurrent(false, 0)).toBe(true)
    expect(shouldRevealCurrent(false, 120)).toBe(false)
    expect(shouldRevealCurrent(true, 120)).toBe(true)
  })
})

describe('ArticleCategoryNav', () => {
  it('链接到第 1 页（不加 nofollow），当前项 aria-current="page"，数量有读屏补充', () => {
    render(<ArticleCategoryNav items={buildArticleCategoryNav(categories, 16, 'news')} />)
    const nav = screen.getByRole('navigation', { name: '资讯分类' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/articles',
      '/articles/category/news',
      '/articles/category/learning',
    ])
    expect(links.map((link) => link.getAttribute('aria-current'))).toEqual([null, 'page', null])
    expect(links.every((link) => link.getAttribute('rel') === null)).toBe(true)
    expect(links[1]!.textContent).toBe('学院新闻6（6 篇）')
  })
})

describe('ArticleGrid', () => {
  it('头条版式：第一篇是头条大卡（占两列、≥ lg 两行，封面立即加载），其余是普通卡片；标题都是 h2', () => {
    const { container } = render(<ArticleGrid articles={articles(4)} headline />)
    const items = container.querySelectorAll('ul > li')
    expect(items).toHaveLength(4)
    expect(items[0]!.className).toContain('sm:col-span-2')
    expect(items[0]!.className).toContain('lg:row-span-2')
    expect(items[1]!.className).toBe('')
    const headline = within(items[0] as HTMLElement).getByRole('link', { name: '文章 1' })
    expect(headline.textContent).toContain('头条')
    const img = headline.querySelector('img')!
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('fetchpriority')).toBe('high')
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      '文章 1',
      '文章 2',
      '文章 3',
      '文章 4',
    ])
    // 其余卡片懒加载
    expect(items[1]!.querySelector('img')!.getAttribute('loading')).toBe('lazy')
  })

  it('头条封面用 hero 尺寸的大图（headlineCover，约 850px 宽的版位不放大 800px 的卡片图），普通卡片仍用 card 尺寸', () => {
    const [first, ...rest] = articles(4)
    const hero = {
      src: '/api/media/file/open-day-1400x788.webp',
      alt: '开放日现场',
      width: 1400,
      height: 788,
    }
    const { container } = render(
      <ArticleGrid articles={[{ ...first!, headlineCover: hero }, ...rest]} headline />,
    )
    const [headlineImg, cardImg] = [...container.querySelectorAll('img')]
    expect(headlineImg!.getAttribute('srcset')).toContain(encodeURIComponent(hero.src))
    expect(headlineImg!.getAttribute('srcset')).not.toContain('800x450')
    expect(headlineImg!.getAttribute('alt')).toBe('开放日现场')
    expect(headlineImg!.getAttribute('width')).toBe('1400')
    expect(headlineImg!.getAttribute('sizes')).toMatch(/^\(min-width: 1360px\) \d+px, /)
    expect(cardImg!.getAttribute('srcset')).toContain('800x450')
  })

  it('没有头条时（第 2 页起）全部是普通卡片，没有“头条”字样', () => {
    const { container } = render(<ArticleGrid articles={articles(3)} headline={false} />)
    expect(container.textContent).not.toContain('头条')
    expect(container.querySelector('.lg\\:row-span-2')).toBeNull()
  })
})

describe('ArticlesListView', () => {
  const nav = buildArticleCategoryNav(categories, 16, 'learning')

  it('分类页：h1 与简介、分类导航、分页链接保持在分类内（第 1 页不带 page 参数）', () => {
    render(
      <ArticlesListView
        title="学习干货"
        description="软件、作品集与学习方法"
        breadcrumbs={[
          { label: '资讯', href: '/articles' },
          { label: '学习干货', href: '/articles/category/learning' },
        ]}
        nav={nav}
        slice={paginate(articles(16), 2, 12)}
        categorySlug="learning"
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: '学习干货' })).toBeTruthy()
    expect(screen.getByText('软件、作品集与学习方法')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: '资讯分类' })).toBeTruthy()
    // 第 2 页：4 篇，没有头条
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4)
    const pagination = screen.getByRole('navigation', { name: '分页' })
    expect(within(pagination).getByRole('link', { name: '上一页' }).getAttribute('href')).toBe(
      '/articles/category/learning',
    )
    expect(
      within(pagination).getByRole('link', { name: '第 2 页' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('还没有任何文章：显示空状态与专业课程入口，不显示分类导航与分页', () => {
    render(
      <ArticlesListView
        title="资讯"
        description={null}
        breadcrumbs={[{ label: '资讯', href: '/articles' }]}
        nav={[]}
        slice={paginate([], 1, 12)}
        categorySlug={null}
      />,
    )
    const empty = screen.getByRole('region', { name: '资讯正在整理中' })
    expect(within(empty).getByRole('link', { name: '查看专业课程' }).getAttribute('href')).toBe(
      '/courses',
    )
    expect(screen.queryByRole('navigation', { name: '资讯分类' })).toBeNull()
    expect(screen.queryByRole('navigation', { name: '分页' })).toBeNull()
  })
})

describe('ArticleDetailView', () => {
  const NOW = new Date('2026-11-23T02:00:00.000Z')

  function renderDetail(overrides: Partial<ArticleDetail> = {}, hot = [courseCard({ id: 9 })]) {
    return render(
      <LeadDialogProvider config={leadConfig}>
        <ArticleDetailView
          article={detail(overrides)}
          settings={settings}
          hotCourses={hot}
          leadConfig={leadConfig}
          now={NOW}
        />
      </LeadDialogProvider>,
    )
  }

  it('首屏：h1、分类链接、作者、北京时间发布日期、阅读量；面包屑 4 级', () => {
    renderDetail()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('北京海淀校区秋季开放日活动回顾')
    const header = h1.closest('header')!
    expect(
      within(header)
        .getByRole('link', { name: /学院新闻/ })
        .getAttribute('href'),
    ).toBe('/articles/category/news')
    expect(header.textContent).toContain('作者：北京海淀校区')
    const time = header.querySelector('time')!
    expect(time.textContent).toBe('发布于2026年10月30日')
    expect(time.getAttribute('datetime')).toBe('2026-10-30')
    expect(header.textContent).toContain('1.2万 次阅读')
    const breadcrumbs = screen.getByRole('navigation', { name: '面包屑' })
    expect(within(breadcrumbs).getAllByRole('listitem')).toHaveLength(4)
  })

  it('正文标题接在 h1 下：后台从 h1 写起时整体降一级，页面只有一个 h1', () => {
    const { container } = renderDetail({ content: content(['h1', 'h2']) })
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    const prose = container.querySelector('.prose-zh')!
    expect([...prose.querySelectorAll('h2, h3, h4')].map((h) => h.tagName)).toEqual(['H2', 'H3'])
  })

  it('封面立即加载；相关课程与相关文章（链接到分类页的“更多”）', () => {
    renderDetail()
    const cover = screen.getByRole('img', { name: '开放日现场' })
    expect(cover.getAttribute('loading')).toBe('eager')
    expect(cover.getAttribute('fetchpriority')).toBe('high')

    const courses = screen.getByRole('region', { name: '相关课程' })
    expect(within(courses).getByRole('heading', { level: 3 }).textContent).toBe(
      '三维动画设计长期就业班',
    )
    const related = screen.getByRole('region', { name: '相关文章' })
    expect(
      within(related)
        .getByRole('link', { name: '校内 48 小时游戏创作营结营' })
        .getAttribute('href'),
    ).toBe('/articles/game-jam')
    expect(
      within(related)
        .getByRole('link', { name: /更多学院新闻/ })
        .getAttribute('href'),
    ).toBe('/articles/category/news')
  })

  it('没有相关课程 / 相关文章 / 分类时不渲染对应区块', () => {
    renderDetail({ relatedCourses: [], relatedArticles: [], category: null })
    expect(screen.queryByRole('region', { name: '相关课程' })).toBeNull()
    expect(screen.queryByRole('region', { name: '相关文章' })).toBeNull()
    expect(screen.getAllByRole('navigation', { name: '面包屑' })).toHaveLength(1)
    expect(
      within(screen.getByRole('navigation', { name: '面包屑' })).getAllByRole('listitem'),
    ).toHaveLength(3)
  })

  it('侧栏：热门课程链接到课程详情；唯一的留资表单位置 article_sidebar、意向试听，不带课程', () => {
    const { container } = renderDetail({}, [
      courseCard({
        id: 9,
        slug: 'game-art',
        title: '游戏美术长期就业班',
        discipline: disciplineRef({ shortName: '游戏美术' }),
      }),
    ])
    const aside = screen.getByRole('complementary', { name: '推荐课程与咨询' })
    const hot = within(aside).getByRole('region', { name: '热门课程' })
    const link = within(hot).getByRole('link', { name: '游戏美术长期就业班' })
    expect(link.getAttribute('href')).toBe('/courses/game-art')
    expect(link.textContent).toContain('游戏美术 · 长期就业班')

    const card = within(aside).getByRole('region', { name: '预约免费试听' })
    expect(card.textContent).toContain('读完还有疑问？')
    expect(container.querySelectorAll('form')).toHaveLength(1)
    expect(card.querySelector<HTMLInputElement>('input[name="position"]')!.value).toBe(
      'article_sidebar',
    )
    expect(card.querySelector<HTMLInputElement>('input[name="intent"]')!.value).toBe('trial')
    expect(card.querySelector('input[name="course"]')).toBeNull()
  })

  it('没有热门课程时只显示留资卡片', () => {
    renderDetail({}, [])
    const aside = screen.getByRole('complementary', { name: '推荐课程与咨询' })
    expect(within(aside).queryByRole('region', { name: '热门课程' })).toBeNull()
    expect(within(aside).getByRole('region', { name: '预约免费试听' })).toBeTruthy()
  })
})

describe('Article 结构化数据', () => {
  const SITE = 'https://example.com/EduVerse'

  it('机构 / 部门署名按 Organization，个人姓名按 Person', () => {
    expect(authorJsonLdType('教研中心')).toBe('Organization')
    expect(authorJsonLdType('就业服务部')).toBe('Organization')
    expect(authorJsonLdType('北京海淀校区')).toBe('Organization')
    expect(authorJsonLdType('林雨晴')).toBe('Person')
  })

  it('标题、图片绝对地址（子路径不重复）、发布 / 修改时间、作者、发布机构（Logo）、所属页面', () => {
    const data = articleJsonLd(
      detail({
        heroImage: {
          src: '/EduVerse/api/media/file/a-1400.webp',
          alt: '',
          width: 1400,
          height: 788,
        },
        shareImage: {
          src: '/EduVerse/api/media/file/a-og.webp',
          alt: '',
          width: 1200,
          height: 630,
        },
        authorName: '林雨晴',
      }),
      {
        siteUrl: SITE,
        brandName: 'EduVerse 数艺学院',
        logoSrc: '/EduVerse/api/media/file/logo.png',
      },
    )
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: '北京海淀校区秋季开放日活动回顾',
      description: '访客参观了机房与作品展厅，旁听了两场公开课。',
      image: [
        'https://example.com/EduVerse/api/media/file/a-1400.webp',
        'https://example.com/EduVerse/api/media/file/a-og.webp',
      ],
      datePublished: '2026-10-30T15:35:15.652Z',
      dateModified: '2026-11-01T02:00:00.000Z',
      author: { '@type': 'Person', name: '林雨晴' },
      publisher: {
        '@type': 'Organization',
        '@id': 'https://example.com/EduVerse/#organization',
        name: 'EduVerse 数艺学院',
        url: 'https://example.com/EduVerse',
        logo: {
          '@type': 'ImageObject',
          url: 'https://example.com/EduVerse/api/media/file/logo.png',
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://example.com/EduVerse/articles/open-day',
      },
      articleSection: '学院新闻',
      inLanguage: 'zh-CN',
    })
    // 阅读量是缓存值，不输出
    expect(JSON.stringify(data)).not.toContain('12345')
  })

  it('没有署名时作者为发布机构；没有 Logo、图片、分类时不输出对应字段', () => {
    const data = articleJsonLd(
      detail({ authorName: null, heroImage: null, shareImage: null, cover: null, category: null }),
      { siteUrl: SITE, brandName: 'EduVerse 数艺学院', logoSrc: null },
    )
    expect(data.author).toEqual(data.publisher)
    expect(data.publisher).not.toHaveProperty('logo')
    expect(data).not.toHaveProperty('image')
    expect(data).not.toHaveProperty('articleSection')
  })
})
