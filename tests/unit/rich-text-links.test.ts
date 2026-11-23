import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { docHref, LINKABLE_COLLECTIONS, safeHref } from '@/components/common/rich-text'
import { RESERVED_ROUTE_SEGMENTS } from '@/lib/reserved-slugs'

describe('docHref', () => {
  it('已填充的已发布文档按集合前缀 + slug 生成站内路径', () => {
    expect(docHref('courses', { id: 1, slug: '3d-animation', _status: 'published' })).toBe(
      '/courses/3d-animation',
    )
    expect(docHref('disciplines', { id: 2, slug: 'game-art' })).toBe('/majors/game-art')
    expect(docHref('article-categories', { id: 3, slug: 'news' })).toBe('/articles/category/news')
    expect(docHref('pages', { id: 4, slug: 'about', _status: 'published' })).toBe('/about')
  })

  it('作品详情按 ID 生成路径', () => {
    expect(docHref('works', { id: 12, _status: 'published', consentConfirmed: true })).toBe(
      '/works/12',
    )
    expect(docHref('works', { slug: 'no-id', consentConfirmed: true })).toBeNull()
  })

  it('未确认学员授权的作品（详情页 404）不输出链接', () => {
    expect(docHref('works', { id: 12, _status: 'published', consentConfirmed: false })).toBeNull()
    // 字段缺失（填充时没有选取）也按未授权处理，宁可只渲染文字
    expect(docHref('works', { id: 12, _status: 'published' })).toBeNull()
  })

  it('草稿文档不输出链接，避免指向 404', () => {
    expect(docHref('courses', { id: 1, slug: 'draft-course', _status: 'draft' })).toBeNull()
    expect(docHref('works', { id: 12, _status: 'draft' })).toBeNull()
    expect(docHref('pages', { id: 4, slug: 'about', _status: 'draft' })).toBeNull()
  })

  it('关联未填充（只有 ID）或缺少 slug 时不输出链接', () => {
    expect(docHref('courses', 1)).toBeNull()
    expect(docHref('courses', null)).toBeNull()
    expect(docHref('courses', { id: 1 })).toBeNull()
    expect(docHref('courses', { id: 1, slug: '' })).toBeNull()
  })

  it('没有前台页面的集合不输出链接', () => {
    expect(docHref('software', { id: 1, slug: 'blender' })).toBeNull()
    expect(docHref('media', { id: 1, slug: 'x' })).toBeNull()
    // 不会命中对象原型上的属性
    expect(docHref('constructor', { id: 1, slug: 'x' })).toBeNull()
  })

  it('slug 被固定路由占用的通用页面不输出链接（/[pageSlug] 访问不到）', () => {
    expect(docHref('pages', { id: 5, slug: 'careers', _status: 'published' })).toBeNull()
    expect(docHref('pages', { id: 6, slug: 'search' })).toBeNull()
    // 其它集合的同名 slug 不受影响
    expect(docHref('articles', { id: 7, slug: 'careers' })).toBe('/articles/careers')
  })
})

describe('LINKABLE_COLLECTIONS', () => {
  /** 各集合都能输出链接的样例文档（作品还要求已确认授权） */
  const sample = { id: 1, slug: 'sample', _status: 'published', consentConfirmed: true }

  it('覆盖富文本所有会输出链接的集合（含通用页面与作品）', () => {
    for (const collection of LINKABLE_COLLECTIONS) {
      const href = docHref(collection, sample)
      expect(href, collection).toMatch(/^\//)
    }
    expect(LINKABLE_COLLECTIONS).toEqual(expect.arrayContaining(['pages', 'courses', 'works']))
    expect(new Set(LINKABLE_COLLECTIONS).size).toBe(LINKABLE_COLLECTIONS.length)
  })

  it('除通用页面外，各集合的一级路径都已登记为固定路由，不会被同名页面占用', () => {
    for (const collection of LINKABLE_COLLECTIONS) {
      if (collection === 'pages') continue
      const href = docHref(collection, sample)
      const segment = href?.split('/')[1]
      expect(segment && RESERVED_ROUTE_SEGMENTS.has(segment), collection).toBe(true)
    }
  })
})

describe('safeHref', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.example.cn')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('允许站内路径、页内锚点、http(s)、mailto 与 tel', () => {
    expect(safeHref('/about')).toBe('/about')
    expect(safeHref('#contact')).toBe('#contact')
    expect(safeHref('https://other.example.com/a?b=1')).toBe('https://other.example.com/a?b=1')
    expect(safeHref('HTTP://other.example.com')).toBe('HTTP://other.example.com')
    expect(safeHref('mailto:hi@example.cn')).toBe('mailto:hi@example.cn')
    expect(safeHref('tel:400-000-0000')).toBe('tel:400-000-0000')
  })

  it('其它协议一律不输出链接（含大小写与首尾空白变体）', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('  JavaScript:alert(1)')).toBeNull()
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(safeHref('vbscript:msgbox(1)')).toBeNull()
    expect(safeHref('ftp://example.cn/file')).toBeNull()
  })

  it('含控制字符或以 /\\ 开头、浏览器会解析到别处的地址不输出链接', () => {
    expect(safeHref('java\tscript:alert(1)')).toBeNull()
    expect(safeHref('/\t/evil.example.com')).toBeNull()
    expect(safeHref('/\n/evil.example.com')).toBeNull()
    expect(safeHref('/\\evil.example.com')).toBeNull()
    expect(safeHref('\\\\evil.example.com')).toBeNull()
  })

  it('相对路径、空值与非字符串不输出链接', () => {
    expect(safeHref('about')).toBeNull()
    expect(safeHref('')).toBeNull()
    expect(safeHref('   ')).toBeNull()
    expect(safeHref(undefined)).toBeNull()
    expect(safeHref(42)).toBeNull()
  })

  it('指向本站的完整地址转为站内路径', () => {
    expect(safeHref('https://www.example.cn')).toBe('/')
    expect(safeHref('https://www.example.cn/privacy')).toBe('/privacy')
    expect(safeHref('https://www.example.cn#faq')).toBe('#faq')
    // 只是前缀相同的其它域名仍按外链处理
    expect(safeHref('https://www.example.cn.evil.com/a')).toBe('https://www.example.cn.evil.com/a')
  })

  it('本站地址后接 // 或 /\\ 时保留完整地址，不截成会指向其它域名的路径', () => {
    // 截成 /\evil.example.com 或 //evil.example.com 后，浏览器会跳到 evil.example.com
    expect(safeHref('https://www.example.cn/\\evil.example.com')).toBe(
      'https://www.example.cn/\\evil.example.com',
    )
    expect(safeHref('https://www.example.cn//evil.example.com')).toBe(
      'https://www.example.cn//evil.example.com',
    )
  })

  it('子路径部署时去掉站点地址（含子路径），交给 next/link 重新补 basePath', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://user.github.io/EduVerse/')
    expect(safeHref('https://user.github.io/EduVerse/about')).toBe('/about')
    expect(safeHref('https://user.github.io/EduVerse')).toBe('/')
  })
})
