import type { Locator, Page } from '@playwright/test'
import { getPayload, type Where } from 'payload'

import { articleCategoryDescription } from '../../src/lib/articles/format'
import { formatCohortDate, toBeijingIsoDate } from '../../src/lib/course/format'
import config from '../../src/payload.config.js'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 资讯：资讯列表 /articles（分类导航、头条大卡、分页与收录规则）、分类页 /articles/category/[slug]、
 * 资讯详情 /articles/[slug]（首屏信息、正文、相关课程 / 文章、侧栏热门课程与留资、阅读量上报、结构化数据）。
 * 期望值从数据库读取（与页面同一个开发库），排序与过滤条件与数据层一致，不在测试里写死种子内容。
 * 阅读量上报用 page.route 拦截（不改动数据库），断言同一会话同一文章只上报一次。
 * 提交线索的用例用 leadNamespace('articles', …) 取本文件专属的手机号与模拟 IP，结束后清理。
 */

/** 种子文章：学院新闻分类（同分类另有 5 篇），关联两门课程 */
const SLUG = 'beijing-campus-autumn-open-day'
const PER_PAGE = 12

// 开发服务器首次访问某个路由时要现编译，留足时间
test.describe.configure({ timeout: 120_000 })

const published = { _status: { equals: 'published' } } as const satisfies Where

type ArticleFact = {
  id: number
  slug: string
  title: string
  publishedAt: string
  authorName: string | null
  category: { name: string; slug: string } | null
  relatedCourseIds: number[]
}

type ArticleFacts = {
  /** 已发布文章：发布时间降序、ID 降序（与数据层一致） */
  articles: ArticleFact[]
  /** 有已发布文章的分类（后台排序）；description 为分类页的简介（未填写时为模板，与数据层一致） */
  categories: { name: string; slug: string; count: number; description: string }[]
  listTitle: string
  sidebarTitle: string
}

async function readArticles(): Promise<ArticleFacts> {
  const payload = await getPayload({ config })
  const [articles, categories, settings] = await Promise.all([
    payload.find({
      collection: 'articles',
      where: published,
      depth: 1,
      pagination: false,
      populate: { 'article-categories': { name: true, slug: true } },
      select: {
        title: true,
        slug: true,
        publishedAt: true,
        authorName: true,
        category: true,
        relatedCourses: true,
      },
    }),
    payload.find({
      collection: 'article-categories',
      depth: 0,
      pagination: false,
      sort: ['order', 'id'],
    }),
    payload.findGlobal({ slug: 'article-pages', depth: 0 }),
  ])
  const facts: ArticleFact[] = articles.docs
    .map((doc) => ({
      id: doc.id,
      slug: doc.slug,
      title: doc.title.trim(),
      publishedAt: doc.publishedAt,
      authorName: doc.authorName?.trim() || null,
      category:
        doc.category && typeof doc.category === 'object'
          ? { name: doc.category.name.trim(), slug: doc.category.slug }
          : null,
      relatedCourseIds: (doc.relatedCourses ?? []).map((course) =>
        typeof course === 'object' ? course.id : course,
      ),
    }))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || b.id - a.id)
  return {
    articles: facts,
    categories: categories.docs
      .map((category) => {
        const name = category.name.trim()
        const count = facts.filter((article) => article.category?.slug === category.slug).length
        return {
          name,
          slug: category.slug,
          count,
          description: articleCategoryDescription({
            name,
            description: category.description ?? null,
            count,
          }),
        }
      })
      .filter((category) => category.count > 0),
    listTitle: settings.list?.title?.trim() || '资讯',
    sidebarTitle: settings.detail?.sidebarTitle?.trim() || '预约免费试听',
  }
}

/** 文章封面的 hero 尺寸（地址与宽度；原图比 hero 小、没有生成时为原图） */
async function readHeroCover(articleId: number): Promise<{ url: string; width: number }> {
  const payload = await getPayload({ config })
  const { cover } = await payload.findByID({
    collection: 'articles',
    id: articleId,
    depth: 1,
    select: { cover: true },
  })
  if (!cover || typeof cover !== 'object') throw new Error(`文章 ${articleId} 没有封面`)
  const hero = cover.sizes?.hero
  const url = hero?.url || cover.url
  const width = hero?.url ? hero.width : cover.width
  if (!url || !width) throw new Error(`文章 ${articleId} 的封面没有地址或宽度`)
  return { url, width }
}

async function readArticle(slug: string): Promise<ArticleFact & { facts: ArticleFacts }> {
  const facts = await readArticles()
  const article = facts.articles.find((item) => item.slug === slug)
  if (!article) throw new Error(`种子数据缺少已发布文章 ${slug}`)
  return { ...article, facts }
}

/** 可公开访问的课程（已发布、所属专业方向已发布）中，按给定 ID 顺序取出 */
async function readAccessibleCourses(ids: number[]) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'courses',
    where: {
      and: [published, { 'discipline._status': { equals: 'published' } }, { id: { in: ids } }],
    },
    depth: 0,
    pagination: false,
    select: { slug: true, title: true },
  })
  return ids
    .map((id) => docs.find((doc) => doc.id === id))
    .filter((doc) => doc !== undefined)
    .map((doc) => ({ slug: doc.slug, title: doc.title }))
}

/** 可公开访问的精选课程的 slug（侧栏热门课程只能从中挑选） */
async function readFeaturedCourseSlugs(): Promise<string[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'courses',
    where: {
      and: [
        published,
        { 'discipline._status': { equals: 'published' } },
        { featured: { equals: true } },
      ],
    },
    depth: 0,
    pagination: false,
    select: { slug: true },
  })
  return docs.map((doc) => doc.slug)
}

type JsonLdNode = { '@type': string; [key: string]: unknown }

async function readJsonLd(page: Page): Promise<JsonLdNode[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
  return scripts.map((text) => JSON.parse(text) as JsonLdNode)
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '页面不应出现横向滚动').toBe(0)
}

/** canonical 恰好一个，且指向 path */
async function expectCanonical(page: Page, path: RegExp) {
  const links = page.locator('link[rel="canonical"]')
  await expect(links).toHaveCount(1)
  await expect(links).toHaveAttribute('href', path)
}

function categoryNav(page: Page): Locator {
  return page.getByRole('navigation', { name: '资讯分类' })
}

/**
 * 分类导航的一项：可见文字“名称 + 数量”，无障碍名称“名称（N 篇）”
 * （链接是 inline-flex，读屏补充文字作为弹性项，计算名称时前面可能多一个空格）
 */
function categoryLink(page: Page, name: string): Locator {
  return categoryNav(page).getByRole('link', { name: new RegExp(`^${name}\\s*（\\d+ 篇）$`) })
}

/** 列表页上的文章标题（h2，按页面顺序）：页面没有区块标题，h2 只有文章标题 */
function articleTitles(page: Page): Locator {
  return page.getByRole('main').getByRole('heading', { level: 2 })
}

function pagination(page: Page): Locator {
  return page.getByRole('navigation', { name: '分页' })
}

/** 侧栏留资卡片（区块名称为后台的侧栏标题） */
function leadCard(page: Page, title: string): Locator {
  return page.getByRole('complementary', { name: '推荐课程与咨询' }).getByRole('region', {
    name: title,
  })
}

/** 侧栏表单水合后提交按钮才可用；以此确认页面已接管 */
async function waitForHydration(page: Page, sidebarTitle: string) {
  await expect(leadCard(page, sidebarTitle).getByRole('button', { name: '立即预约' })).toBeEnabled()
}

test.describe('资讯列表', () => {
  test('第 1 页：标题与简介、分类导航（全部为当前项）、头条大卡 + 11 篇、分页；可收录', async ({
    page,
  }) => {
    const { articles, categories, listTitle } = await readArticles()
    expect(articles.length, '种子数据应多于一页').toBeGreaterThan(PER_PAGE)
    const response = await page.goto('/articles')
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(listTitle)
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByText(listTitle, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // 分类导航：全部 + 有文章的分类（后台顺序），数量正确，全部为当前项；分类链接可收录（不加 nofollow）
    const navLinks = categoryNav(page).getByRole('link')
    // 文字内容含读屏补充“（N 篇）”
    await expect(navLinks).toHaveText([
      `全部${articles.length}（${articles.length} 篇）`,
      ...categories.map((c) => `${c.name}${c.count}（${c.count} 篇）`),
    ])
    await expect(categoryLink(page, '全部')).toHaveAttribute('aria-current', 'page')
    await expect(categoryLink(page, '全部')).toHaveAttribute('href', /\/articles$/)
    for (const category of categories) {
      const link = categoryLink(page, category.name)
      await expect(link).toHaveAccessibleName(
        new RegExp(`^${category.name}\\s*（${category.count} 篇）$`),
      )
      await expect(link).toHaveAttribute('href', new RegExp(`/articles/category/${category.slug}$`))
      await expect(link).not.toHaveAttribute('rel', /nofollow/)
      await expect(link).not.toHaveAttribute('aria-current')
    }

    // 第 1 页 12 篇（发布时间降序），第一篇是头条
    await expect(articleTitles(page)).toHaveText(articles.slice(0, PER_PAGE).map((a) => a.title))
    const headline = page.getByRole('link', { name: articles[0]!.title, exact: true })
    await expect(headline).toHaveAttribute('href', new RegExp(`/articles/${articles[0]!.slug}$`))
    await expect(headline.getByText('头条', { exact: true })).toBeVisible()
    await expect(page.getByText('头条', { exact: true })).toHaveCount(1)
    // 头条封面是首屏最大的图：立即加载并提高优先级
    const cover = headline.locator('img')
    await expect(cover).toHaveAttribute('loading', 'eager')
    await expect(cover).toHaveAttribute('fetchpriority', 'high')
    // 用 hero 尺寸的大图（不是 800px 的卡片图）：按版位宽度与像素密度选出的图不小于版位（原图更小时到原图宽度为止）
    const hero = await readHeroCover(articles[0]!.id)
    await expect
      .poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true)
    const shown = await cover.evaluate((img: HTMLImageElement) => ({
      src: img.currentSrc,
      needed: Math.round(img.getBoundingClientRect().width * window.devicePixelRatio),
    }))
    const optimized = new URL(shown.src)
    expect(optimized.searchParams.get('url')).toBe(hero.url)
    const pixels = Math.min(Number(optimized.searchParams.get('w')), hero.width)
    expect(pixels).toBeGreaterThanOrEqual(Math.min(shown.needed, hero.width))

    // 分页：第 1 页没有“上一页”，“下一页”指向 ?page=2
    const nav = pagination(page)
    await expect(nav.getByRole('link', { name: '上一页' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: '下一页' })).toHaveAttribute(
      'href',
      /\/articles\?page=2$/,
    )

    // 收录：canonical /articles，没有 noindex；面包屑结构化数据 2 级
    await expectCanonical(page, /\/articles$/)
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expect(page).toHaveTitle(new RegExp(listTitle))
    const breadcrumb = (await readJsonLd(page)).find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb?.itemListElement).toHaveLength(2)
    await expectNoHorizontalOverflow(page)
  })

  test('分页：第 2 页可收录、标题带页码、canonical 带页码、没有头条；非法页码按第 1 页', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const { articles } = await readArticles()
    await page.goto('/articles')
    const firstTitle = await page.title()

    await pagination(page).getByRole('link', { name: '下一页' }).click()
    await expect(page).toHaveURL(/\/articles\?page=2$/)
    await expect(articleTitles(page)).toHaveText(
      articles.slice(PER_PAGE, PER_PAGE * 2).map((a) => a.title),
    )
    await expect(page.getByText('头条', { exact: true })).toHaveCount(0)

    // 直接打开第 2 页检查元数据（客户端导航不重新请求 head 之外的内容）
    await page.goto('/articles?page=2')
    await expectCanonical(page, /\/articles\?page=2$/)
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    const secondTitle = await page.title()
    expect(secondTitle).not.toBe(firstTitle)
    expect(secondTitle).toContain('（第 2 页）')
    await expect(pagination(page).getByRole('link', { name: '第 2 页' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(pagination(page).getByRole('link', { name: '上一页' })).toHaveAttribute(
      'href',
      /\/articles$/,
    )

    // 非法页码按第 1 页处理，canonical /articles
    const invalid = await page.goto('/articles?page=abc')
    expect(invalid?.status()).toBe(200)
    await expectCanonical(page, /\/articles$/)
    await expect(articleTitles(page).first()).toHaveText(articles[0]!.title)
  })

  test('点击分类进入分类页：h1 为分类名、只列该分类文章、当前项与面包屑；可收录', async ({
    page,
  }) => {
    const { articles, categories, listTitle } = await readArticles()
    const category = categories.at(-1)!
    const expected = articles.filter((article) => article.category?.slug === category.slug)
    await page.goto('/articles')
    await categoryLink(page, category.name).click()

    await expect(page).toHaveURL(new RegExp(`/articles/category/${category.slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(category.name)
    await expect(categoryLink(page, category.name)).toHaveAttribute('aria-current', 'page')
    await expect(categoryLink(page, '全部')).not.toHaveAttribute('aria-current')
    await expect(articleTitles(page)).toHaveText(
      expected.slice(0, PER_PAGE).map((article) => article.title),
    )

    // 面包屑：首页 › 资讯 › 分类
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByRole('link', { name: listTitle })).toHaveAttribute(
      'href',
      /\/articles$/,
    )
    await expect(breadcrumbs.getByText(category.name, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // 移动端分类导航横向滚动：排在最后的当前项自动滚进可见范围
    const box = await categoryLink(page, category.name).boundingBox()
    const viewport = page.viewportSize()!
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    await expectNoHorizontalOverflow(page)

    // 元数据：直接打开检查 canonical、标题与面包屑结构化数据（3 级）
    await page.goto(`/articles/category/${category.slug}`)
    await expectCanonical(page, new RegExp(`/articles/category/${category.slug}$`))
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expect(page).toHaveTitle(new RegExp(category.name))
    const breadcrumb = (await readJsonLd(page)).find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb?.itemListElement).toHaveLength(3)
  })

  test('每个分类页 h1 下都有简介，meta description 与之一致，各分类页互不重复', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const { categories } = await readArticles()
    expect(categories.length).toBeGreaterThan(1)
    const seen = new Set<string>()
    await page.goto('/articles')
    const listDescription = await page.locator('meta[name="description"]').getAttribute('content')
    for (const category of categories) {
      await page.goto(`/articles/category/${category.slug}`)
      const intro = page.getByRole('heading', { level: 1 }).locator('xpath=following-sibling::p')
      await expect(intro).toHaveText(category.description)
      const meta = await page.locator('meta[name="description"]').getAttribute('content')
      expect(meta, category.slug).toBe(category.description)
      expect(meta, category.slug).not.toBe(listDescription)
      seen.add(meta ?? '')
    }
    expect(seen.size).toBe(categories.length)
  })

  test('点击文章卡片进入资讯详情', async ({ page }) => {
    const { articles } = await readArticles()
    const target = articles[1]!
    await page.goto('/articles')
    await page.getByRole('link', { name: target.title, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/articles/${target.slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(target.title)
  })

  test.describe('不存在的页面', () => {
    // 浏览器会把 404 响应本身记录为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('页码超出总页数、分类不存在或分类页码超出时返回 404', async ({ page, isMobile }) => {
      test.skip(isMobile, '与视口无关，桌面端验证一次')
      const { articles, categories } = await readArticles()
      const totalPages = Math.ceil(articles.length / PER_PAGE)
      const beyond = await page.goto(`/articles?page=${totalPages + 1}`)
      expect(beyond?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面不存在或已下线')

      const missing = await page.goto('/articles/category/no-such-category')
      expect(missing?.status()).toBe(404)

      const category = categories[0]!
      const categoryPages = Math.ceil(category.count / PER_PAGE)
      const categoryBeyond = await page.goto(
        `/articles/category/${category.slug}?page=${categoryPages + 1}`,
      )
      expect(categoryBeyond?.status()).toBe(404)
    })
  })
})

test.describe('资讯详情', () => {
  test('首屏：面包屑（4 级）、分类、h1、作者、北京时间发布日期、阅读量；封面立即加载；正文标题接在 h1 下', async ({
    page,
  }) => {
    const article = await readArticle(SLUG)
    const response = await page.goto(`/articles/${SLUG}`)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title)
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByRole('link')).toHaveText([
      '首页',
      article.facts.listTitle,
      article.category!.name,
    ])
    await expect(breadcrumbs.getByRole('link', { name: article.category!.name })).toHaveAttribute(
      'href',
      new RegExp(`/articles/category/${article.category!.slug}$`),
    )
    await expect(breadcrumbs.getByText(article.title, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    const main = page.getByRole('main')
    const header = main.locator('header').filter({ has: page.getByRole('heading', { level: 1 }) })
    await expect(
      header.getByRole('link', { name: new RegExp(`^分类：\\s*${article.category!.name}$`) }),
    ).toHaveAttribute('href', new RegExp(`/articles/category/${article.category!.slug}$`))
    // 作者：可见文字只有署名，读屏前缀“作者：”
    await expect(header.getByText(`作者：${article.authorName!}`, { exact: true })).toBeVisible()
    const time = header.locator('time')
    await expect(time).toHaveText(`发布于${formatCohortDate(article.publishedAt)}`)
    await expect(time).toHaveAttribute('dateTime', toBeijingIsoDate(article.publishedAt))
    // 阅读量来自缓存数据（最迟 1 小时更新），为 0 时不显示；显示时只检查格式
    const views = header.getByText(/次阅读$/)
    if (await views.count()) await expect(views).toHaveText(/^[1-9][\d.]*万? 次阅读$/)

    // 封面：首屏最大的图，立即加载并提高优先级
    const cover = main.locator('figure img').first()
    await expect(cover).toHaveAttribute('loading', 'eager')
    await expect(cover).toHaveAttribute('fetchpriority', 'high')

    // 正文：标题从 h2 起，没有第二个 h1
    const prose = main.locator('.prose-zh')
    await expect(prose.locator('p').first()).toBeVisible()
    await expect(prose.locator('h1')).toHaveCount(0)
    await expect(prose.locator('h2').first()).toBeVisible()

    // 正文末尾返回资讯列表
    await expect(main.getByRole('link', { name: '返回资讯列表' })).toHaveAttribute(
      'href',
      /\/articles$/,
    )

    // 元数据：canonical 为本页，标题含文章标题，Open Graph 类型为文章
    await expectCanonical(page, new RegExp(`/articles/${SLUG}$`))
    await expect(page).toHaveTitle(new RegExp(article.title))
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute(
      'content',
      new Date(article.publishedAt).toISOString(),
    )
    await expectNoHorizontalOverflow(page)
  })

  test('相关课程（可访问，后台顺序）与相关文章（同分类、不含本文、最多 4 篇）', async ({
    page,
  }) => {
    const article = await readArticle(SLUG)
    const courses = await readAccessibleCourses(article.relatedCourseIds)
    expect(courses.length, '种子文章应关联可访问的课程').toBeGreaterThan(0)
    const related = article.facts.articles
      .filter((item) => item.category?.slug === article.category!.slug && item.id !== article.id)
      .slice(0, 4)
    expect(related.length).toBeGreaterThan(0)
    await page.goto(`/articles/${SLUG}`)

    const courseSection = page.getByRole('region', { name: '相关课程' })
    await expect(courseSection.getByRole('heading', { level: 3 })).toHaveText(
      courses.map((course) => course.title),
    )
    for (const course of courses) {
      await expect(
        courseSection.getByRole('heading', { level: 3, name: course.title }).getByRole('link'),
      ).toHaveAttribute('href', new RegExp(`/courses/${course.slug}$`))
      const res = await page.request.get(`/courses/${course.slug}`)
      expect(res.status(), `/courses/${course.slug}`).toBe(200)
    }

    const articleSection = page.getByRole('region', { name: '相关文章' })
    const links = articleSection.getByRole('listitem').getByRole('link')
    await expect(links).toHaveCount(related.length)
    for (const [index, item] of related.entries()) {
      await expect(links.nth(index)).toHaveAccessibleName(item.title)
      await expect(links.nth(index)).toHaveAttribute('href', new RegExp(`/articles/${item.slug}$`))
    }
    await expect(
      articleSection.getByRole('link', { name: `更多${article.category!.name}` }),
    ).toHaveAttribute('href', new RegExp(`/articles/category/${article.category!.slug}$`))
    await expectNoHorizontalOverflow(page)
  })

  test('侧栏：热门课程（精选，最多 3 门）与留资卡片；桌面端在右栏吸顶，移动端排在正文之后', async ({
    page,
    isMobile,
  }) => {
    const { facts } = await readArticle(SLUG)
    const featured = await readFeaturedCourseSlugs()
    await page.goto(`/articles/${SLUG}`)

    const aside = page.getByRole('complementary', { name: '推荐课程与咨询' })
    const hot = aside.getByRole('region', { name: '热门课程' })
    const hotLinks = hot.getByRole('listitem').getByRole('link')
    await expect(hotLinks).toHaveCount(Math.min(3, featured.length))
    const hrefs = await hotLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? ''),
    )
    for (const href of hrefs) {
      const slug = /\/courses\/([a-z0-9-]+)$/.exec(href)?.[1]
      expect(featured, href).toContain(slug)
    }
    await expect(hot.getByRole('link', { name: /查看全部课程/ })).toHaveAttribute(
      'href',
      /\/courses$/,
    )

    const card = leadCard(page, facts.sidebarTitle)
    await expect(card.getByRole('heading', { level: 2 })).toHaveText(facts.sidebarTitle)
    await expect(card.locator('input[name="position"]')).toHaveValue('article_sidebar')
    await expect(card.locator('input[name="intent"]')).toHaveValue('trial')

    const backLink = page.getByRole('main').getByRole('link', { name: '返回资讯列表' })
    const backBox = (await backLink.boundingBox())!
    const asideBox = (await aside.boundingBox())!
    const coursesBox = (await page.getByRole('region', { name: '相关课程' }).boundingBox())!
    if (isMobile) {
      expect(asideBox.y, '移动端侧栏在正文之后').toBeGreaterThan(backBox.y)
      expect(asideBox.y, '移动端侧栏在相关课程之前').toBeLessThan(coursesBox.y)
    } else {
      expect(asideBox.x, '桌面端侧栏在右栏').toBeGreaterThan(backBox.x + backBox.width)
      // 滚到相关课程：热门课程随页面滚走，留资卡片吸顶（停在头部下方）
      await page.getByRole('heading', { name: '相关课程' }).scrollIntoViewIfNeeded()
      await page.mouse.wheel(0, 400)
      await expect
        .poll(async () => (await card.boundingBox())?.y ?? -1, { message: '留资卡片吸顶' })
        .toBeGreaterThanOrEqual(64)
      const cardBox = (await card.boundingBox())!
      expect(cardBox.y).toBeLessThan(120)
    }
    await expectNoHorizontalOverflow(page)
  })

  test('侧栏提交线索：位置 article_sidebar，记录来源页面', async ({ page }, testInfo) => {
    const ns = leadNamespace('articles', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const { facts } = await readArticle(SLUG)
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto(`/articles/${SLUG}`)
    try {
      await waitForHydration(page, facts.sidebarTitle)
      const card = leadCard(page, facts.sidebarTitle)
      await card.getByLabel('姓名').fill('资讯页测试')
      await card.getByLabel('手机号').fill(phone)
      await card.getByLabel('所在城市').selectOption('上海')
      await card.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await card.getByRole('button', { name: '立即预约' }).click()
      await expect(card.getByRole('heading', { name: '提交成功' })).toBeVisible()

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '资讯页测试',
        intent: 'trial',
        city: '上海',
        source: { position: 'article_sidebar' },
        client: { ip },
      })
      expect(lead?.context?.course ?? null).toBeNull()
      expect(lead?.source?.pageUrl).toContain(`/articles/${SLUG}`)
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('阅读量上报：加载后只上报一次，刷新不重复，另一篇文章单独上报', async ({ page }) => {
    const article = await readArticle(SLUG)
    const other = article.facts.articles.find(
      (item) => item.category?.slug === article.category!.slug && item.id !== article.id,
    )!
    const reports: string[] = []
    // 拦截上报接口（不改动数据库的阅读量），记录每一次请求
    await page.route('**/api/articles/*/view', async (route) => {
      reports.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"counted":true}',
      })
    })

    await page.goto(`/articles/${SLUG}`)
    await waitForHydration(page, article.facts.sidebarTitle)
    await expect.poll(() => reports).toEqual([`POST /api/articles/${article.id}/view`])

    // 同一会话刷新：不再上报
    await page.reload()
    await waitForHydration(page, article.facts.sidebarTitle)
    await page.waitForTimeout(1000)
    expect(reports).toHaveLength(1)

    // 另一篇文章（从相关文章进入）单独上报一次
    await page
      .getByRole('region', { name: '相关文章' })
      .getByRole('link', { name: other.title, exact: true })
      .click()
    await expect(page).toHaveURL(new RegExp(`/articles/${other.slug}$`))
    await expect
      .poll(() => reports)
      .toEqual([`POST /api/articles/${article.id}/view`, `POST /api/articles/${other.id}/view`])

    // 回到第一篇：同一会话内仍不重复
    await page.goto(`/articles/${SLUG}`)
    await waitForHydration(page, article.facts.sidebarTitle)
    await page.waitForTimeout(1000)
    expect(reports).toHaveLength(2)
  })

  test('结构化数据：Article（标题、图片绝对地址、发布 / 修改时间、作者、发布机构、所属页面）与 BreadcrumbList（4 级）', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const article = await readArticle(SLUG)
    const payload = await getPayload({ config })
    const site = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    await page.goto(`/articles/${SLUG}`)
    const nodes = await readJsonLd(page)

    const data = nodes.find((node) => node['@type'] === 'Article')
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      headline: article.title,
      datePublished: new Date(article.publishedAt).toISOString(),
      author: { name: article.authorName },
      publisher: { '@type': 'Organization', name: site.brandName },
      articleSection: article.category!.name,
    })
    expect(Date.parse(String(data?.dateModified))).not.toBeNaN()
    const images = data?.image as string[]
    expect(images.length).toBeGreaterThan(0)
    for (const image of images) expect(image).toMatch(/^https?:\/\/.+\/api\/media\/file\//)
    const mainEntity = data?.mainEntityOfPage as { '@id': string }
    expect(new URL(mainEntity['@id']).pathname).toBe(`/articles/${SLUG}`)
    // 后台上传了 Logo 时，发布机构带 Logo（绝对地址）
    const logo = (data?.publisher as { logo?: { url: string } }).logo
    if (site.logo) expect(logo?.url).toMatch(/^https?:\/\//)
    else expect(logo).toBeUndefined()

    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb?.itemListElement).toHaveLength(4)
  })

  test.describe('不存在的文章', () => {
    // 浏览器会把 404 响应本身记录为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('返回 404 页面', async ({ page }) => {
      const response = await page.goto('/articles/not-a-real-article')
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面不存在或已下线')
      await expectNoHorizontalOverflow(page)
    })
  })
})
