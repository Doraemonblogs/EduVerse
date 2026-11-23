import { describe, expect, it } from 'vitest'

import { homeJsonLd, homeJsonLdIds, organizationJsonLd, websiteJsonLd } from '@/lib/home/json-ld'
import { serializeJsonLd } from '@/lib/seo/json-ld'

const base = {
  siteUrl: 'https://www.example.com',
  brandName: 'EduVerse 数艺学院',
  contactType: '课程咨询',
}

describe('首页结构化数据', () => {
  it('Organization：名称、首页地址、Logo 绝对地址、简介与咨询热线', () => {
    expect(
      organizationJsonLd({
        ...base,
        description: '  数字艺术职业教育  ',
        logoSrc: '/api/media/file/logo.png',
        hotline: ' 400-000-0000 ',
      }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://www.example.com/#organization',
      name: 'EduVerse 数艺学院',
      url: 'https://www.example.com',
      logo: 'https://www.example.com/api/media/file/logo.png',
      description: '数字艺术职业教育',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '400-000-0000',
          contactType: '课程咨询',
          areaServed: 'CN',
          availableLanguage: 'zh-CN',
        },
      ],
    })
  })

  it('没有 Logo、简介与热线时不输出对应字段', () => {
    const data = organizationJsonLd({ ...base, logoSrc: null, hotline: '  ', description: null })
    expect(data).not.toHaveProperty('logo')
    expect(data).not.toHaveProperty('description')
    expect(data).not.toHaveProperty('contactPoint')
  })

  it('WebSite：站内搜索指向 /search?q={search_term_string}，发布机构引用 Organization', () => {
    expect(websiteJsonLd(base)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': 'https://www.example.com/#website',
      name: 'EduVerse 数艺学院',
      url: 'https://www.example.com',
      inLanguage: 'zh-CN',
      publisher: { '@id': 'https://www.example.com/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://www.example.com/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    })
  })

  it('子路径部署：首页、搜索与 Logo 地址都只带一次子路径', () => {
    const siteUrl = 'https://user.github.io/EduVerse'
    const [organization, website] = homeJsonLd({
      ...base,
      siteUrl,
      // imageSource() 给出的地址已带 basePath
      logoSrc: '/EduVerse/api/media/file/logo.png',
      hotline: '400-000-0000',
    })
    expect(organization).toMatchObject({
      '@id': `${siteUrl}/#organization`,
      url: siteUrl,
      logo: 'https://user.github.io/EduVerse/api/media/file/logo.png',
    })
    expect(website).toMatchObject({
      url: siteUrl,
      potentialAction: {
        target: { urlTemplate: `${siteUrl}/search?q={search_term_string}` },
      },
    })
    expect(homeJsonLdIds(`${siteUrl}/`).website).toBe(`${siteUrl}/#website`)
  })

  it('品牌名含特殊字符时序列化后不会提前闭合 <script>', () => {
    const json = serializeJsonLd(homeJsonLd({ ...base, brandName: '</script><b>品牌' }))
    expect(json).not.toContain('</script>')
    expect(JSON.parse(json)).toEqual(homeJsonLd({ ...base, brandName: '</script><b>品牌' }))
  })
})
