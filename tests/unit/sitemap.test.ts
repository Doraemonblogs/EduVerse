import { describe, expect, it } from 'vitest'

import { buildSitemap, latestDate, type SitemapItem } from '@/lib/seo/sitemap'

/** sitemap 的纯函数（src/lib/seo/sitemap.ts）；数据层见 sitemap-data.test.ts，robots 见 sitemap-robots.test.ts */

const item = (path: string, lastModified: string | null = null): SitemapItem => ({
  path,
  lastModified,
  changeFrequency: 'weekly',
  priority: 0.7,
})

describe('latestDate', () => {
  it('取最新的时间，忽略空值与无法解析的值', () => {
    expect(
      latestDate([
        '2026-11-20T08:00:00.000Z',
        null,
        undefined,
        'not-a-date',
        '2026-11-23T01:02:03.000Z',
        '2026-11-21T00:00:00.000Z',
      ]),
    ).toBe('2026-11-23T01:02:03.000Z')
  })

  it('全部无效时返回 null', () => {
    expect(latestDate([])).toBeNull()
    expect(latestDate([null, '', 'x'])).toBeNull()
  })
})

describe('buildSitemap', () => {
  it('站内路径转为绝对地址：站点地址含子路径时带上子路径，首页不带末尾斜杠（与 canonical 一致）', () => {
    const { entries } = buildSitemap(
      [item('/'), item('/courses/3d-animation-career')],
      'https://user.github.io/EduVerse',
    )
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://user.github.io/EduVerse',
      'https://user.github.io/EduVerse/courses/3d-animation-career',
    ])
  })

  it('lastModified 用文档修改时间（统一为 ISO），无效时不输出；保留更新频率与优先级', () => {
    const { entries } = buildSitemap(
      [item('/a', '2026-11-23T08:00:00+08:00'), item('/b', null), item('/c', 'bad')],
      'https://www.example.cn',
    )
    expect(entries).toEqual([
      {
        url: 'https://www.example.cn/a',
        lastModified: '2026-11-23T00:00:00.000Z',
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      { url: 'https://www.example.cn/b', changeFrequency: 'weekly', priority: 0.7 },
      { url: 'https://www.example.cn/c', changeFrequency: 'weekly', priority: 0.7 },
    ])
  })

  it('同一地址只保留第一次出现的条目；带查询串、锚点或不以 / 开头的路径不列入', () => {
    const { entries } = buildSitemap(
      [
        item('/works/1', '2026-11-01T00:00:00.000Z'),
        item('/works/1', '2026-11-02T00:00:00.000Z'),
        item('/works?page=2'),
        item('/courses#faq'),
        item('courses'),
      ],
      'https://www.example.cn/',
    )
    expect(entries).toEqual([
      {
        url: 'https://www.example.cn/works/1',
        lastModified: '2026-11-01T00:00:00.000Z',
        changeFrequency: 'weekly',
        priority: 0.7,
      },
    ])
  })

  it('超过单文件上限时截断并返回省略的条数（分片扩展点）', () => {
    const items = Array.from({ length: 5 }, (_, i) => item(`/works/${i + 1}`))
    const { entries, truncated } = buildSitemap(items, 'https://www.example.cn', 3)
    expect(entries).toHaveLength(3)
    expect(truncated).toBe(2)
    expect(buildSitemap(items, 'https://www.example.cn').truncated).toBe(0)
  })
})
