import { type APIRequestContext, type Page, request as playwrightRequest } from '@playwright/test'

import { zh } from '../../src/i18n/zh'
import {
  extractJsonLd,
  imageSize,
  isPaginationOnly,
  jsonLdTypes,
  metadataInBody,
  parseHeadMeta,
  parseRobotsRules,
  querySampleKey,
  robotsAllows,
  robotsBlocks,
  splitDocument,
  validateJsonLd,
} from '../helpers/seo-audit'
import { expect, test } from './fixtures'

/**
 * SEO（M8）：robots.txt、sitemap.xml、全站元数据审计（爬虫视角）、客户端导航后的 <head>、404 页标题。
 *
 * 全站审计以百度爬虫的 User-Agent 请求页面：Next 对搜索引擎爬虫输出阻塞式元数据（全部在 <head> 里），
 * 这正是搜索引擎看到的内容。从首页与 sitemap 出发顺着站内链接抓取，带查询串的地址按“路径 + 参数名”抽样。
 * 开发服务器与生产构建都能跑；只适用于生产构建的检查单独标明并在开发服务器上跳过。
 */

const BOT_UA = 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)'

/** 抓取上限（防止链接异常时无限抓取）与每组查询串的抽样数 */
const MAX_PAGES = 600
const SAMPLES_PER_QUERY_SHAPE = 2
const SAMPLES_PER_PAGINATION = 3

/** robots.txt 禁止抓取的路径（不进 sitemap；/search 无关键词时本身可收录，但不抓取） */
const ROBOTS_BLOCKED = ['/search', '/styleguide']

/** 结构化数据覆盖：种子数据下全站至少应出现这些类型 */
const EXPECTED_JSON_LD_TYPES = [
  'Organization',
  'WebSite',
  'BreadcrumbList',
  'ItemList',
  'Course',
  'FAQPage',
  'Article',
  'Person',
  'CreativeWork',
  'EducationalOrganization',
]

const OG_WIDTH = '1200'
const OG_HEIGHT = '630'

async function botRequest(baseURL: string | undefined): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: { 'User-Agent': BOT_UA },
  })
}

/** 被测服务的站点地址（NEXT_PUBLIC_SITE_URL）：取自 robots.txt 的 Sitemap 行 */
async function discoverSiteUrl(api: APIRequestContext): Promise<string> {
  const robots = await (await api.get('/robots.txt')).text()
  const sitemap = /^Sitemap:\s*(\S+)\s*$/im.exec(robots)?.[1]
  expect(sitemap, 'robots.txt 应声明 Sitemap').toMatch(/^https?:\/\/.+\/sitemap\.xml$/)
  return sitemap!.replace(/\/sitemap\.xml$/, '')
}

/** sitemap.xml 里的条目 */
async function readSitemap(api: APIRequestContext) {
  const res = await api.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toMatch(/xml/)
  const xml = await res.text()
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: /<loc>([^<]*)<\/loc>/.exec(m[1] ?? '')?.[1] ?? '',
    lastmod: /<lastmod>([^<]*)<\/lastmod>/.exec(m[1] ?? '')?.[1] ?? null,
  }))
}

/** 站点绝对地址 → 被测服务上的请求路径（站点地址以外的返回 null） */
function toRequestPath(url: string, siteUrl: string): string | null {
  if (url === siteUrl) return '/'
  if (!url.startsWith(`${siteUrl}/`)) return null
  return url.slice(siteUrl.length)
}

/** 页面的规范地址：站点地址 + 路径（首页不带斜杠），分页保留 ?page=N */
function expectedCanonical(siteUrl: string, url: URL): string {
  const path = url.pathname === '/' ? '' : url.pathname
  const page = url.searchParams.get('page')
  return isPaginationOnly(url) && page !== '1'
    ? `${siteUrl}${path}?page=${page}`
    : `${siteUrl}${path}`
}

/** 是否为开发服务器（HTML 里引用了热更新客户端脚本，生产构建没有） */
async function isDevServer(api: APIRequestContext): Promise<boolean> {
  const html = await (await api.get('/')).text()
  return /_next\/static\/[^"']*(?:hmr-client|webpack-hmr)/i.test(html)
}

test.describe('SEO：robots.txt 与 sitemap.xml', () => {
  test('robots.txt：禁止后台、接口（媒体文件除外）、站内搜索与设计规范，声明 sitemap 与 Host', async ({
    baseURL,
  }) => {
    const api = await botRequest(baseURL)
    const res = await api.get('/robots.txt')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/text\/plain/)
    const text = await res.text()
    const lines = text.split('\n').map((line) => line.trim())
    expect(lines).toContain('User-Agent: *')
    // 按百度（第一条匹配）与 Google / 必应（最长匹配）两种规则判断（tests/helpers/seo-audit.ts）
    const rules = parseRobotsRules(text)
    for (const path of ['/', '/courses', '/courses?discipline=3d-animation', '/search-guide']) {
      expect(robotsAllows(rules, path), `应允许抓取：${path}`).toBe(true)
    }
    // 媒体文件（页面图片、分享图）在 /api/ 下，单独允许
    expect(robotsAllows(rules, '/api/media/file/a-1200x630.webp')).toBe(true)
    for (const path of [
      '/admin',
      '/admin/collections/leads',
      '/api/leads',
      '/api/graphql',
      '/search',
      '/search?q=%E5%8A%A8%E7%94%BB',
      '/styleguide',
    ]) {
      expect(robotsBlocks(rules, path), `应禁止抓取：${path}`).toBe(true)
    }
    const siteUrl = await discoverSiteUrl(api)
    expect(lines).toContain(`Host: ${new URL(siteUrl).origin}`)
    await api.dispose()
  })

  test('sitemap.xml：绝对地址、无查询串、不重复、修改时间有效；不含搜索与设计规范', async ({
    baseURL,
  }) => {
    const api = await botRequest(baseURL)
    const siteUrl = await discoverSiteUrl(api)
    const entries = await readSitemap(api)
    const robots = parseRobotsRules(await (await api.get('/robots.txt')).text())
    expect(entries.length).toBeGreaterThan(10)

    const locs = entries.map((entry) => entry.loc)
    expect(new Set(locs).size, 'sitemap 中的地址不应重复').toBe(locs.length)
    expect(locs[0], '第一条是首页').toBe(siteUrl)
    for (const { loc, lastmod } of entries) {
      expect(loc.startsWith(siteUrl), `应为站点绝对地址：${loc}`).toBe(true)
      expect(loc, `不应带查询串或锚点：${loc}`).not.toMatch(/[?#]/)
      const path = toRequestPath(loc, siteUrl) ?? ''
      expect(ROBOTS_BLOCKED.some((p) => path === p || path.startsWith(`${p}/`))).toBe(false)
      expect(robotsAllows(robots, path), `sitemap 中的地址被 robots.txt 禁止抓取：${loc}`).toBe(
        true,
      )
      expect(path.startsWith('/admin') || path.startsWith('/api/')).toBe(false)
      if (lastmod !== null) {
        expect(Number.isNaN(Date.parse(lastmod)), `lastmod 无效：${loc}`).toBe(false)
      }
    }
    // 列表页与各类详情页都在
    for (const section of ['/courses', '/works', '/teachers', '/articles', '/campuses']) {
      expect(locs).toContain(`${siteUrl}${section}`)
      expect(locs.some((loc) => loc.startsWith(`${siteUrl}${section}/`))).toBe(true)
    }
    expect(locs.some((loc) => loc.startsWith(`${siteUrl}/majors/`))).toBe(true)
    expect(locs.some((loc) => loc.startsWith(`${siteUrl}/articles/category/`))).toBe(true)
    await api.dispose()
  })
})

test.describe('SEO：全站元数据审计（爬虫视角）', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, '全站抓取只在桌面端跑一次（爬虫请求与视口无关）')
  })

  test('每个页面 TDK 唯一、canonical 与分享图为绝对地址、收录规则正确、结构化数据有效，并与 sitemap 一致', async ({
    baseURL,
  }) => {
    test.setTimeout(15 * 60_000)
    const api = await botRequest(baseURL)
    const siteUrl = await discoverSiteUrl(api)
    const robots = parseRobotsRules(await (await api.get('/robots.txt')).text())
    const sitemap = await readSitemap(api)
    const sitemapPaths = new Set(
      sitemap.map(({ loc }) => toRequestPath(loc, siteUrl)).filter((p): p is string => !!p),
    )

    const problems: string[] = []
    const report = (where: string, message: string) => problems.push(`${where}：${message}`)

    type PageFacts = {
      title: string
      description: string
      canonical: string | null
      noindex: boolean
      ogImage: string | null
    }
    const facts = new Map<string, PageFacts>()
    const jsonLdTypesSeen = new Set<string>()
    const queue = ['/', ...sitemapPaths]
    const seen = new Set(queue)
    const samples = new Map<string, number>()

    const enqueue = (href: string, from: string) => {
      let url: URL
      try {
        url = new URL(href, `${siteUrl}${from}`)
      } catch {
        return
      }
      if (url.origin !== new URL(siteUrl).origin && url.origin !== new URL(baseURL!).origin) return
      const { pathname } = url
      if (/^\/(admin|api|_next)(\/|$)/.test(pathname) || /\.[a-z0-9]+$/i.test(pathname)) return
      url.hash = ''
      const key = `${pathname}${url.search}`
      if (seen.has(key) || seen.size >= MAX_PAGES) return
      const shape = querySampleKey(url)
      if (shape) {
        const limit = isPaginationOnly(url) ? SAMPLES_PER_PAGINATION : SAMPLES_PER_QUERY_SHAPE
        const count = samples.get(shape) ?? 0
        if (count >= limit) return
        samples.set(shape, count + 1)
      }
      seen.add(key)
      queue.push(key)
    }

    while (queue.length > 0) {
      const path = queue.shift()!
      const res = await api.get(path, { maxRedirects: 0 })
      if (res.status() !== 200) {
        // /majors 永久重定向到 /courses（不是断链）
        if (!(res.status() === 308 && path === '/majors')) {
          report(path, `状态码 ${res.status()}（站内链接或 sitemap 指向的页面应可访问）`)
        }
        continue
      }
      const html = await res.text()
      const { head, body } = splitDocument(html)
      const meta = parseHeadMeta(head)
      const url = new URL(path, siteUrl)

      for (const found of metadataInBody(body)) report(path, `<body> 里出现了 ${found}`)
      if (meta.titles.length !== 1 || !meta.titles[0]) {
        report(path, `<title> 应恰好一个且非空：${JSON.stringify(meta.titles)}`)
      }
      if (meta.descriptions.length !== 1 || !meta.descriptions[0]) {
        report(path, `description 应恰好一个且非空：${JSON.stringify(meta.descriptions)}`)
      }
      if (meta.robots.length > 1) report(path, `robots 标签重复：${JSON.stringify(meta.robots)}`)
      if (meta.canonicals.length > 1) report(path, `canonical 重复：${meta.canonicals.join(' ')}`)
      const canonical = meta.canonicals[0] ?? null
      if (canonical && !canonical.startsWith(siteUrl)) {
        report(path, `canonical 应为站点绝对地址：${canonical}`)
      }

      const noindex = meta.robots.some((value) => /noindex/i.test(value))
      const filtered = url.search !== '' && !isPaginationOnly(url)
      const isStyleguide = url.pathname === '/styleguide'
      if (filtered || isStyleguide) {
        // 筛选组合、搜索结果、教程播放深链接：noindex，canonical 指向不带筛选参数的列表页
        if (!noindex) report(path, '带筛选 / 搜索参数的页面应 noindex')
        if (canonical && new URL(canonical).search !== '') {
          report(path, `noindex 页面的 canonical 不应带查询串：${canonical}`)
        }
      } else {
        if (noindex) report(path, '不带筛选参数的页面不应 noindex')
        const expected = expectedCanonical(siteUrl, url)
        if (canonical !== expected) report(path, `canonical 应为 ${expected}，实际 ${canonical}`)
        const og = (key: string) => meta.social[key]?.[0] ?? null
        if (og('og:url') !== expected) report(path, `og:url 应与 canonical 一致：${og('og:url')}`)
        for (const key of ['og:title', 'og:description', 'og:type', 'og:site_name']) {
          if (!og(key)) report(path, `缺少 ${key}`)
        }
        const ogImage = og('og:image')
        if (!ogImage || !/^https?:\/\//.test(ogImage)) {
          report(path, `og:image 应为绝对地址：${ogImage}`)
        }
        if (og('og:image:width') !== OG_WIDTH || og('og:image:height') !== OG_HEIGHT) {
          report(
            path,
            `og:image 尺寸应为 1200×630：${og('og:image:width')}×${og('og:image:height')}`,
          )
        }
        if (og('twitter:card') !== 'summary_large_image') {
          report(path, `twitter:card 应为 summary_large_image：${og('twitter:card')}`)
        }
        facts.set(path, {
          title: meta.titles[0] ?? '',
          description: meta.descriptions[0] ?? '',
          canonical,
          noindex,
          ogImage,
        })
      }

      for (const raw of extractJsonLd(html)) {
        for (const problem of validateJsonLd(raw)) report(path, `JSON-LD ${problem}`)
        for (const type of jsonLdTypes(raw)) jsonLdTypesSeen.add(type)
      }

      for (const [, href] of html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/gi)) {
        const decoded = (href ?? '').replace(/&amp;/g, '&')
        if (decoded.startsWith('/') && !decoded.startsWith('//')) enqueue(decoded, path)
      }
    }

    // 可收录页面之间：标题、描述、canonical 都不重复
    for (const field of ['title', 'description', 'canonical'] as const) {
      const groups = new Map<string, string[]>()
      for (const [path, fact] of facts) {
        const value = fact[field]
        if (value) groups.set(value, [...(groups.get(value) ?? []), path])
      }
      for (const [value, paths] of groups) {
        if (paths.length > 1) problems.push(`${field} 重复（${value}）：${paths.join('、')}`)
      }
    }

    // sitemap 与可收录页面一致：sitemap 中的每个地址都可收录、canonical 指向自己；
    // 每个可收录的非分页页面（robots 禁止抓取的除外）都在 sitemap 中
    for (const path of sitemapPaths) {
      const fact = facts.get(path)
      if (!fact) problems.push(`sitemap 中的 ${path} 不可访问或不可收录`)
      else if (fact.canonical !== `${siteUrl}${path === '/' ? '' : path}`) {
        problems.push(`sitemap 中的 ${path} canonical 指向别处：${fact.canonical}`)
      }
    }
    for (const path of facts.keys()) {
      const url = new URL(path, siteUrl)
      if (url.search || ROBOTS_BLOCKED.includes(url.pathname)) continue
      if (!sitemapPaths.has(path)) problems.push(`可收录页面 ${path} 不在 sitemap 中`)
    }

    // 分享图真实可访问，且确实是 1200×630 的图片
    const ogImages = new Set([...facts.values()].map((fact) => fact.ogImage).filter(Boolean))
    for (const image of ogImages) {
      const requestPath = toRequestPath(image!, siteUrl)
      if (!requestPath) continue
      // 分享图被 robots.txt 禁止时，搜索引擎与部分分享卡片（遵守 robots 的抓取器）取不到图
      if (!robotsAllows(robots, requestPath))
        problems.push(`分享图被 robots.txt 禁止抓取：${image}`)
      const res = await api.get(requestPath)
      if (res.status() !== 200 || !/^image\//.test(res.headers()['content-type'] ?? '')) {
        problems.push(`分享图无法访问：${image}（${res.status()}）`)
        continue
      }
      const size = imageSize(await res.body())
      if (size?.width !== 1200 || size.height !== 630) {
        problems.push(`分享图实际尺寸不是 1200×630：${image}（${JSON.stringify(size)}）`)
      }
    }

    expect(problems, problems.join('\n')).toEqual([])
    // 覆盖面：抓到了足够多的页面、带筛选参数的页面与各类结构化数据
    expect(facts.size).toBeGreaterThan(100)
    expect([...seen].some((path) => path.includes('?discipline='))).toBe(true)
    expect([...jsonLdTypesSeen]).toEqual(expect.arrayContaining(EXPECTED_JSON_LD_TYPES))
    await api.dispose()
  })
})

/** 当前文档里的元数据（浏览器视角，水合与客户端导航之后） */
async function documentHead(page: Page) {
  return page.evaluate(() => {
    const all = (selector: string) => [...document.querySelectorAll(selector)]
    return {
      title: document.title,
      titles: all('title').filter((el) => !el.closest('svg')).length,
      canonicals: all('link[rel="canonical"]').map((el) => el.getAttribute('href')),
      descriptions: all('meta[name="description"]').map((el) => el.getAttribute('content')),
      robots: all('meta[name="robots"]').map((el) => el.getAttribute('content')),
      ogUrls: all('meta[property="og:url"]').map((el) => el.getAttribute('content')),
    }
  })
}

test.describe('SEO：客户端导航后的 <head>', () => {
  /** 客户端导航后：标题、canonical、描述各只有一个，且与服务端为该地址输出的一致 */
  async function expectHeadMatchesServer(page: Page, api: APIRequestContext) {
    const path = new URL(page.url()).pathname + new URL(page.url()).search
    const server = parseHeadMeta(splitDocument(await (await api.get(path)).text()).head)
    await expect.poll(async () => (await documentHead(page)).title).toBe(server.titles[0])
    const head = await documentHead(page)
    expect(head.titles, `${path}：<title> 只有一个`).toBe(1)
    expect(head.canonicals, `${path}：canonical`).toEqual(server.canonicals)
    expect(head.descriptions, `${path}：description`).toEqual(server.descriptions)
    expect(head.robots.length, `${path}：robots 不重复`).toBeLessThanOrEqual(1)
    expect(head.ogUrls.length, `${path}：og:url 不重复`).toBeLessThanOrEqual(1)
  }

  test('在列表、详情、面包屑之间点击跳转后，标题 / canonical / 描述不重复且随页面更新', async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000)
    const api = await botRequest(baseURL)
    const crumbs = () => page.getByRole('navigation', { name: zh.breadcrumbs.label })

    await page.goto('/works')
    await expectHeadMatchesServer(page, api)

    await page.locator('main a[href^="/works/"]').first().click()
    await page.waitForURL(/\/works\/\d+$/)
    await expectHeadMatchesServer(page, api)

    await crumbs().getByRole('link', { name: '首页' }).click()
    await page.waitForURL((url) => url.pathname === '/')
    await expectHeadMatchesServer(page, api)

    await page.locator('main a[href^="/courses/"]').first().click()
    await page.waitForURL(/\/courses\/[^/]+$/)
    await expectHeadMatchesServer(page, api)

    // 带筛选参数（noindex）的列表页与普通详情页来回切换：robots 标签随页面出现 / 消失
    await page.goto('/courses?discipline=3d-animation')
    await expectHeadMatchesServer(page, api)
    expect((await documentHead(page)).robots).toEqual(['noindex, follow'])
    await page.locator('main a[href^="/courses/"]').first().click()
    await page.waitForURL(/\/courses\/[^/?]+$/)
    await expectHeadMatchesServer(page, api)
    expect((await documentHead(page)).robots).toEqual([])

    await page.goBack()
    await page.waitForURL(/\/courses\?discipline=/)
    await expectHeadMatchesServer(page, api)
    await api.dispose()
  })
})

test.describe('SEO：404 页面', () => {
  // 浏览器会把 404 响应本身记录为一条控制台错误，这里放行
  test.use({ allowedConsoleErrors: [/status of 404/] })

  const MISSING = [
    '/courses/__missing__',
    '/majors/__missing__',
    '/works/999999999',
    '/teachers/__missing__',
    '/articles/__missing__',
    '/campuses/__missing__',
    '/missing-page',
    '/articles/category/__missing__',
    '/a/b/c',
  ]

  test('详情不存在时：水合后标题仍是“页面不存在”，只有一个 noindex，没有 canonical', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    for (const path of MISSING) {
      const res = await page.goto(path)
      expect(res?.status(), path).toBe(404)
      await page.waitForLoadState('networkidle')
      const head = await documentHead(page)
      expect(head.title, path).toContain(zh.notFound.title)
      expect(head.titles, path).toBe(1)
      expect(head.robots, path).toHaveLength(1)
      expect(head.robots[0], path).toMatch(/noindex/)
      expect(head.canonicals, path).toEqual([])
    }
  })
})

test.describe('SEO：百度专项', () => {
  test('前台页面声明禁止转码（meta）与 PC / 移动同一地址适配', async ({ page }) => {
    await page.goto('/courses')
    const cacheControl = page.locator('meta[http-equiv="Cache-Control"]')
    await expect(cacheControl.first()).toHaveAttribute('content', 'no-transform')
    await expect(page.locator('meta[name="applicable-device"]')).toHaveAttribute(
      'content',
      'pc,mobile',
    )
  })

  test('前台页面的响应头 Cache-Control 含 no-transform（仅生产构建）', async ({ baseURL }) => {
    const api = await botRequest(baseURL)
    test.skip(await isDevServer(api), '开发服务器的页面响应头固定为 no-store，只在生产构建上检查')
    for (const path of ['/', '/courses', '/courses?discipline=3d-animation', '/search?q=动画']) {
      const res = await api.get(path)
      expect(res.headers()['cache-control'] ?? '', path).toContain('no-transform')
    }
    await api.dispose()
  })
})
