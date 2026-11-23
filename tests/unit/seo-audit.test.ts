import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

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
  robotsVerdicts,
  splitDocument,
  validateJsonLd,
} from '../helpers/seo-audit'

/** SEO 审计工具（tests/helpers/seo-audit.ts，供 tests/e2e/seo.e2e.spec.ts 使用）的纯函数 */

const html = [
  '<!DOCTYPE html><html><head><meta charSet="utf-8"/>',
  '<title>课程 &amp; 作品｜品牌</title>',
  '<meta name="description" content="描述 &quot;引号&quot;"/>',
  '<meta name="robots" content="noindex, follow"/>',
  '<link rel="canonical" href="https://www.example.cn/courses"/>',
  '<meta property="og:image" content="https://www.example.cn/a.webp"/>',
  '<meta property="og:image:width" content="1200"/>',
  '<meta name="twitter:card" content="summary_large_image"/>',
  '</head><body><svg><title>图标</title></svg>',
  '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"林"}</script>',
  '</body></html>',
].join('')

describe('parseHeadMeta / splitDocument / metadataInBody', () => {
  it('解析标题、描述、robots、canonical 与 Open Graph / Twitter（解码实体）', () => {
    const { head, body } = splitDocument(html)
    expect(parseHeadMeta(head)).toEqual({
      titles: ['课程 & 作品｜品牌'],
      descriptions: ['描述 "引号"'],
      canonicals: ['https://www.example.cn/courses'],
      robots: ['noindex, follow'],
      social: {
        'og:image': ['https://www.example.cn/a.webp'],
        'og:image:width': ['1200'],
        'twitter:card': ['summary_large_image'],
      },
    })
    // SVG 里的 <title> 不算
    expect(metadataInBody(body)).toEqual([])
  })

  it('body 里出现的标题、描述、canonical（流式元数据）会被找出', () => {
    const body =
      '<div hidden=""><title>x</title><meta name="description" content="d"/><link rel="canonical" href="/x"/></div>'
    expect(metadataInBody(body)).toEqual(['<title>', 'meta description', 'link canonical'])
  })
})

describe('validateJsonLd', () => {
  it('合法的面包屑与课程通过', () => {
    const breadcrumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: 'https://www.example.cn' },
        { '@type': 'ListItem', position: 2, name: '课程' },
      ],
    }
    const course = {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: '三维动画',
      description: '描述',
      provider: { '@type': 'Organization', name: '品牌', url: 'https://www.example.cn' },
      hasCourseInstance: [{ '@type': 'CourseInstance', courseMode: 'Onsite' }],
    }
    expect(validateJsonLd(JSON.stringify(breadcrumbs))).toEqual([])
    expect(validateJsonLd(JSON.stringify([course]))).toEqual([])
    expect(jsonLdTypes(JSON.stringify([course]))).toEqual([
      'Course',
      'Organization',
      'CourseInstance',
    ])
  })

  it('无法解析、缺少 @context / @type、必需字段、相对地址、无效日期、position 不连续都会报告', () => {
    expect(validateJsonLd('{bad')[0]).toMatch(/^JSON 无法解析/)
    expect(validateJsonLd('{"name":"x"}')).toEqual([
      '$ 的 @context 应为 https://schema.org',
      '$ 缺少 @type',
    ])
    const problems = validateJsonLd(
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: '',
        datePublished: 'not-a-date',
        image: '/api/media/file/a.webp',
        publisher: { '@type': 'Organization', name: '品牌', logo: '/logo.png' },
      }),
    )
    expect(problems).toEqual([
      '$（Article）缺少 headline',
      '$.datePublished 不是有效日期：not-a-date',
      '$.image 应为绝对地址：/api/media/file/a.webp',
      '$.publisher.logo 应为绝对地址：/logo.png',
    ])
    const list = validateJsonLd(
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页' },
          { '@type': 'ListItem', position: 3, name: '课程' },
        ],
      }),
    )
    expect(list).toEqual([
      '$（BreadcrumbList）第 1 项缺少地址（item / url）',
      '$（BreadcrumbList）第 2 项 position 应为 2',
    ])
  })

  it('从整页提取 JSON-LD 脚本', () => {
    expect(extractJsonLd(html)).toEqual([
      '{"@context":"https://schema.org","@type":"Person","name":"林"}',
    ])
  })
})

describe('imageSize', () => {
  const make = (format: 'png' | 'webp' | 'jpeg', width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: '#808080' } })
      .toFormat(format)
      .toBuffer()

  it('读取 PNG、WebP（有损 / 无损）、JPEG 的像素尺寸', async () => {
    expect(imageSize(await make('png', 1200, 630))).toEqual({ width: 1200, height: 630 })
    expect(imageSize(await make('webp', 1200, 630))).toEqual({ width: 1200, height: 630 })
    expect(imageSize(await make('jpeg', 600, 600))).toEqual({ width: 600, height: 600 })
    const lossless = await sharp({
      create: { width: 321, height: 123, channels: 4, background: '#00000000' },
    })
      .webp({ lossless: true })
      .toBuffer()
    expect(imageSize(lossless)).toEqual({ width: 321, height: 123 })
  })

  it('无法识别的内容返回 null', () => {
    expect(imageSize(new TextEncoder().encode('<html></html>'))).toBeNull()
  })
})

describe('抓取范围', () => {
  it('带查询串的地址按路径与参数名分组（参数顺序与取值无关）', () => {
    expect(querySampleKey(new URL('https://x.cn/courses'))).toBeNull()
    expect(querySampleKey(new URL('https://x.cn/courses?type=a&discipline=b'))).toBe(
      '/courses?discipline&type',
    )
    expect(querySampleKey(new URL('https://x.cn/courses?discipline=c&type=d'))).toBe(
      '/courses?discipline&type',
    )
  })

  it('只有分页参数的地址可收录', () => {
    expect(isPaginationOnly(new URL('https://x.cn/works?page=2'))).toBe(true)
    expect(isPaginationOnly(new URL('https://x.cn/works?page=2&discipline=a'))).toBe(false)
    expect(isPaginationOnly(new URL('https://x.cn/works'))).toBe(false)
  })
})

describe('robots.txt 判断', () => {
  it('只取 User-agent: * 组（含与它相邻的 User-agent 行）的规则，忽略注释、空 Disallow 与其它字段', () => {
    const rules = parseRobotsRules(
      [
        'User-agent: Googlebot',
        'Disallow: /only-google/',
        '',
        'User-agent: Baiduspider',
        'User-agent: *',
        'Allow: /api/media/file/ # 媒体',
        'Disallow: /api/',
        'Disallow:',
        'Crawl-delay: 5',
        'Sitemap: https://x.cn/sitemap.xml',
      ].join('\n'),
    )
    expect(rules).toEqual([
      { allow: true, pattern: '/api/media/file/' },
      { allow: false, pattern: '/api/' },
    ])
  })

  it('前缀匹配，支持 * 通配与行尾 $；没有匹配的规则时允许', () => {
    const rules = parseRobotsRules(
      'User-agent: *\nDisallow: /search$\nDisallow: /search?\nDisallow: /*.pdf$\n',
    )
    expect(robotsAllows(rules, '/search')).toBe(false)
    expect(robotsAllows(rules, '/search?q=1')).toBe(false)
    expect(robotsAllows(rules, '/search-guide')).toBe(true)
    expect(robotsAllows(rules, '/files/a.pdf')).toBe(false)
    expect(robotsAllows(rules, '/files/a.pdf?x=1')).toBe(true)
    expect(robotsAllows(rules, '/courses')).toBe(true)
  })

  it('百度（第一条匹配）与 Google（最长匹配）分别判断：排在最前的 Allow: / 会让百度忽略后面的 Disallow', () => {
    const allowFirst = parseRobotsRules('User-agent: *\nAllow: /\nDisallow: /admin/\n')
    expect(robotsVerdicts(allowFirst, '/admin/x')).toEqual({
      firstMatch: true,
      longestMatch: false,
    })
    expect(robotsAllows(allowFirst, '/admin/x')).toBe(false)
    expect(robotsBlocks(allowFirst, '/admin/x')).toBe(false)
    // 更具体的 Allow 写在前面：两种规则结论一致
    const specificFirst = parseRobotsRules(
      'User-agent: *\nAllow: /api/media/file/\nDisallow: /api/\n',
    )
    expect(robotsAllows(specificFirst, '/api/media/file/a.webp')).toBe(true)
    expect(robotsBlocks(specificFirst, '/api/leads')).toBe(true)
    // 更具体的 Allow 写在后面：百度先匹配到 Disallow: /api/
    const specificLast = parseRobotsRules(
      'User-agent: *\nDisallow: /api/\nAllow: /api/media/file/\n',
    )
    expect(robotsVerdicts(specificLast, '/api/media/file/a.webp')).toEqual({
      firstMatch: false,
      longestMatch: true,
    })
  })
})
