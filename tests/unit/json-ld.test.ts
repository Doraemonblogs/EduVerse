import { describe, expect, it } from 'vitest'

import { absoluteUrl, breadcrumbListJsonLd, serializeJsonLd } from '@/lib/seo/json-ld'

describe('serializeJsonLd', () => {
  it('转义 < > &，内容里的 </script> 无法提前闭合标签', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script> & 更多' })
    expect(json).not.toContain('<')
    expect(json).not.toContain('>')
    expect(json).not.toContain('&')
    expect(json).not.toMatch(/<\/script/i)
    expect(json).toContain('\\u003c/script\\u003e')
    expect(json).toContain('\\u0026')
  })

  it('转义 U+2028 / U+2029 行分隔符', () => {
    const json = serializeJsonLd({ text: '第一行\u2028第二行\u2029第三段' })
    expect(json).not.toMatch(/[\u2028\u2029]/)
    expect(json).toContain('\\u2028')
    expect(json).toContain('\\u2029')
  })

  it('转义后仍是等价的 JSON，中文原样保留', () => {
    const data = {
      '@type': 'Thing',
      name: '隐私政策 <草稿> & "示例"',
      nested: [{ a: 1, b: null, c: true }],
    }
    const json = serializeJsonLd(data)
    expect(json).toContain('隐私政策')
    expect(JSON.parse(json)).toEqual(data)
  })

  it('支持数组形式的多段结构化数据', () => {
    const data = [{ '@type': 'A' }, { '@type': 'B' }]
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data)
  })
})

describe('absoluteUrl', () => {
  it('站内路径拼接站点地址，首页不带末尾斜杠（与 canonical 一致）', () => {
    expect(absoluteUrl('/', 'https://www.example.cn')).toBe('https://www.example.cn')
    expect(absoluteUrl('/privacy', 'https://www.example.cn')).toBe('https://www.example.cn/privacy')
  })

  it('子路径部署时保留站点地址中的子路径，并去掉多余的斜杠', () => {
    expect(absoluteUrl('/terms', 'https://user.github.io/EduVerse/')).toBe(
      'https://user.github.io/EduVerse/terms',
    )
  })

  it('已是完整地址时原样返回', () => {
    expect(absoluteUrl('https://other.example.cn/a', 'https://www.example.cn')).toBe(
      'https://other.example.cn/a',
    )
  })
})

describe('breadcrumbListJsonLd', () => {
  const siteUrl = 'https://www.example.cn'
  const data = breadcrumbListJsonLd(
    [
      { label: '首页', href: '/' },
      { label: '资讯', href: '/articles' },
      { label: '隐私政策', href: '/privacy' },
    ],
    siteUrl,
  )

  it('输出 schema.org BreadcrumbList', () => {
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('BreadcrumbList')
  })

  it('每一级为 ListItem，position 从 1 递增，item 为绝对地址', () => {
    expect(data.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: '首页', item: 'https://www.example.cn' },
      { '@type': 'ListItem', position: 2, name: '资讯', item: 'https://www.example.cn/articles' },
      {
        '@type': 'ListItem',
        position: 3,
        name: '隐私政策',
        item: 'https://www.example.cn/privacy',
      },
    ])
  })

  it('名称中的特殊字符经 serializeJsonLd 输出后可安全嵌入并还原', () => {
    const tricky = breadcrumbListJsonLd([{ label: '</script>注入', href: '/x' }], siteUrl)
    const json = serializeJsonLd(tricky)
    expect(json).not.toContain('</script>')
    expect(JSON.parse(json)).toEqual(tricky)
  })

  it('未传站点地址时使用部署配置（NEXT_PUBLIC_SITE_URL）', () => {
    const fallback = breadcrumbListJsonLd([{ label: '关于我们', href: '/about' }])
    const [first] = fallback.itemListElement as { item: string }[]
    expect(first?.item).toMatch(/^https?:\/\/[^/]+.*\/about$/)
  })
})
