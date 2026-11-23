import { describe, expect, it } from 'vitest'

import { resolveRobots } from 'next/dist/build/webpack/loaders/metadata/resolve-route-data'

import { buildRobots, routeDisallowRules } from '@/lib/seo/robots'

import { parseRobotsRules, robotsAllows, robotsBlocks } from '../helpers/seo-audit'

/** robots.txt 规则（src/lib/seo/robots.ts） */

describe('buildRobots', () => {
  it('正式站：禁止后台、接口（媒体文件除外）、站内搜索与设计规范；sitemap 为绝对地址；Host 为站点域名', () => {
    const robots = buildRobots({
      siteUrl: 'https://www.example.cn',
      basePath: '',
      preview: false,
    })
    expect(robots).toEqual({
      rules: {
        userAgent: '*',
        allow: ['/api/media/file/'],
        disallow: [
          '/admin$',
          '/admin/',
          '/admin?',
          '/search$',
          '/search/',
          '/search?',
          '/styleguide$',
          '/styleguide/',
          '/styleguide?',
          '/api/',
        ],
      },
      sitemap: 'https://www.example.cn/sitemap.xml',
      host: 'https://www.example.cn',
    })
  })

  it('子路径部署：规则与 sitemap 都带子路径，Host 只取域名', () => {
    const robots = buildRobots({
      siteUrl: 'https://user.github.io/EduVerse/',
      basePath: '/EduVerse',
      preview: false,
    })
    expect(robots.sitemap).toBe('https://user.github.io/EduVerse/sitemap.xml')
    expect(robots.host).toBe('https://user.github.io')
    const rules = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules
    expect(rules?.allow).toEqual(['/EduVerse/api/media/file/'])
    expect(rules?.disallow).toContain('/EduVerse/search?')
    expect(rules?.disallow).toContain('/EduVerse/api/')
  })

  it('Next 输出的 robots.txt 按百度（第一条匹配）与 Google / 必应（最长匹配）判断：前台与媒体文件可抓取，其余禁止', () => {
    // 用 Next 自己的序列化（Allow 行在 Disallow 行之前），判断的是真正输出的文本
    const txt = resolveRobots(
      buildRobots({ siteUrl: 'https://www.example.cn', basePath: '', preview: false }),
    )
    const rules = parseRobotsRules(txt)
    const allowed = [
      '/',
      '/courses',
      '/courses?discipline=3d-animation',
      '/search-guide',
      '/administration',
      '/api/media/file/seed-course-1200x630.webp',
    ]
    const blocked = [
      '/admin',
      '/admin/collections/leads',
      '/admin?redirect=1',
      '/api/leads',
      '/api/graphql',
      '/api/health',
      '/search',
      '/search?q=%E5%8A%A8%E7%94%BB',
      '/styleguide',
    ]
    for (const path of allowed) expect(robotsAllows(rules, path), path).toBe(true)
    for (const path of blocked) expect(robotsBlocks(rules, path), path).toBe(true)
  })

  it('静态预览站：禁止全部抓取，不声明 sitemap', () => {
    expect(
      buildRobots({
        siteUrl: 'https://user.github.io/EduVerse',
        basePath: '/EduVerse',
        preview: true,
      }),
    ).toEqual({ rules: { userAgent: '*', disallow: '/' } })
  })
})

describe('routeDisallowRules', () => {
  it('精确路径、子路径、带查询串三条，不用前缀匹配（/search-guide 这样的通用页面不受影响）', () => {
    const rules = routeDisallowRules('/search', '')
    expect(rules).toEqual(['/search$', '/search/', '/search?'])
    const blocks = (path: string) =>
      rules.some((rule) =>
        rule.endsWith('$') ? path === rule.slice(0, -1) : path.startsWith(rule),
      )
    expect(blocks('/search')).toBe(true)
    expect(blocks('/search?q=%E5%8A%A8%E7%94%BB')).toBe(true)
    expect(blocks('/search-guide')).toBe(false)
  })
})
