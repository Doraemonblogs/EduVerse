import { describe, expect, it } from 'vitest'

import { workJsonLd } from '@/components/works/detail/work-json-ld'

import { workDetail } from '../helpers/work-fixtures'

/**
 * 作品详情的 CreativeWork 结构化数据（纯函数）。页面上的输出与 BreadcrumbList 由 e2e 覆盖。
 */
const SITE = 'https://www.example.com'

describe('workJsonLd', () => {
  it('输出名称、说明、详情页地址、大图绝对地址、化名作者、专业方向与北京日期', () => {
    const data = workJsonLd(
      workDetail({
        id: 42,
        // 2026-11-20 20:00 UTC = 北京时间 11 月 21 日凌晨
        publishedAt: '2026-11-20T20:00:00.000Z',
      }),
      SITE,
    )
    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: '《灯塔守望者》角色动画短片',
      description: '毕业短片。',
      url: 'https://www.example.com/works/42',
      image: 'https://www.example.com/api/media/file/work-1920x1080.webp',
      creator: { '@type': 'Person', name: '林同学' },
      genre: '三维动画',
      about: '三维动画',
      dateCreated: '2026-11-21',
      inLanguage: 'zh-CN',
    })
  })

  it('子路径部署：媒体地址已带 basePath，不重复拼接子路径', () => {
    const data = workJsonLd(
      workDetail({
        id: 7,
        heroImage: {
          src: '/EduVerse/api/media/file/w-1920.webp',
          alt: '',
          width: 1920,
          height: 1080,
        },
      }),
      'https://example.github.io/EduVerse',
    )
    expect(data.url).toBe('https://example.github.io/EduVerse/works/7')
    expect(data.image).toBe('https://example.github.io/EduVerse/api/media/file/w-1920.webp')
  })

  it('没有大图时用卡片封面；缺少署名、专业方向、说明、发布时间时省略对应字段', () => {
    const withCover = workJsonLd(workDetail({ heroImage: null }), SITE)
    expect(withCover.image).toBe('https://www.example.com/api/media/file/work-800x450.webp')

    const bare = workJsonLd(
      workDetail({
        heroImage: null,
        cover: null,
        authorName: null,
        discipline: null,
        description: null,
        publishedAt: null,
      }),
      SITE,
    )
    for (const key of ['image', 'creator', 'genre', 'about', 'description', 'dateCreated']) {
      expect(bare).not.toHaveProperty(key)
    }
    expect(bare).toMatchObject({ '@type': 'CreativeWork', name: '《灯塔守望者》角色动画短片' })
  })
})
