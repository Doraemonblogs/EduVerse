import { describe, expect, it } from 'vitest'

import {
  applyNoindex,
  assetOutputFile,
  extractCssUrls,
  extractRefs,
  hasQuery,
  isMissingBasePath,
  isPagePath,
  isQueryDependentPath,
  pageOutputFiles,
  pageUrl,
  toSitePath,
} from '../../scripts/preview/lib'

const withBase = { origin: 'http://localhost:3000', basePath: '/EduVerse' }
const atRoot = { origin: 'http://localhost:3000', basePath: '' }
const from = 'http://localhost:3000/EduVerse/styleguide'

describe('pageUrl', () => {
  it('basePath 下的首页不带末尾斜杠', () => {
    expect(pageUrl(withBase, '/')).toBe('http://localhost:3000/EduVerse')
    expect(pageUrl(withBase, '/styleguide')).toBe('http://localhost:3000/EduVerse/styleguide')
  })

  it('根路径部署时首页为 /', () => {
    expect(pageUrl(atRoot, '/')).toBe('http://localhost:3000/')
  })
})

describe('toSitePath', () => {
  it('去掉 basePath、查询串与锚点', () => {
    expect(toSitePath('/EduVerse/courses?x=1#top', from, withBase)).toBe('/courses')
    expect(toSitePath('/EduVerse', from, withBase)).toBe('/')
    expect(toSitePath('/EduVerse/', from, withBase)).toBe('/')
  })

  it('解析 HTML 实体与相对路径', () => {
    expect(toSitePath('/EduVerse/a?b=1&amp;c=2', from, withBase)).toBe('/a')
    expect(toSitePath('works', 'http://localhost:3000/EduVerse/', withBase)).toBe('/works')
  })

  it('外站、basePath 之外、特殊协议与纯锚点返回 null', () => {
    expect(toSitePath('https://example.com/EduVerse/x', from, withBase)).toBeNull()
    expect(toSitePath('/admin', from, withBase)).toBeNull()
    expect(toSitePath('/EduVersePlus/x', from, withBase)).toBeNull()
    expect(toSitePath('tel:4000000000', from, withBase)).toBeNull()
    expect(toSitePath('#main', from, withBase)).toBeNull()
    expect(toSitePath('data:image/png;base64,xx', from, withBase)).toBeNull()
  })

  it('根路径部署时原样返回路径', () => {
    expect(toSitePath('/courses/3d?x=1', 'http://localhost:3000/', atRoot)).toBe('/courses/3d')
  })
})

describe('hasQuery', () => {
  it('识别带查询串的资源', () => {
    expect(hasQuery('/EduVerse/_next/image?url=%2Fa.png&amp;w=640', from)).toBe(true)
    expect(hasQuery('/EduVerse/_next/static/chunks/a.js', from)).toBe(false)
  })
})

describe('isPagePath', () => {
  it('页面路径', () => {
    expect(isPagePath('/')).toBe(true)
    expect(isPagePath('/courses/3d-animation')).toBe(true)
  })

  it('后台、接口、构建产物与带扩展名的文件不是页面', () => {
    expect(isPagePath('/admin')).toBe(false)
    expect(isPagePath('/admin/collections/users')).toBe(false)
    expect(isPagePath('/api/media/file/a.png')).toBe(false)
    expect(isPagePath('/_next/static/chunks/a.js')).toBe(false)
    expect(isPagePath('/favicon.ico')).toBe(false)
  })

  it('仅前缀相同的页面不会被误判', () => {
    expect(isPagePath('/administration')).toBe(true)
    expect(isPagePath('/apis')).toBe(true)
  })
})

describe('输出文件映射', () => {
  it('首页输出 index.html，其它页面同时输出 x.html 与 x/index.html', () => {
    expect(pageOutputFiles('/')).toEqual(['index.html'])
    expect(pageOutputFiles('/courses/3d')).toEqual(['courses/3d.html', 'courses/3d/index.html'])
  })

  it('解码中文路径', () => {
    expect(pageOutputFiles('/tags/%E5%8A%A8%E7%94%BB')).toEqual([
      'tags/动画.html',
      'tags/动画/index.html',
    ])
    expect(assetOutputFile('/api/media/file/%E5%B0%81%E9%9D%A2.webp')).toBe(
      'api/media/file/封面.webp',
    )
  })
})

describe('extractRefs', () => {
  const html = `
    <link rel="stylesheet" href="/EduVerse/_next/static/css/a.css"/>
    <link rel="preload" as="image" imageSrcSet="/EduVerse/a-1x.webp 1x, /EduVerse/a-2x.webp 2x"/>
    <script src="/EduVerse/_next/static/chunks/main.js" async=""></script>
    <a class="x" href="/EduVerse/courses">课程</a>
    <a href="https://example.com">外链</a>
    <img alt="" src="/EduVerse/api/media/file/a.webp" srcset="/EduVerse/b.webp 640w, /EduVerse/c.webp 1280w"/>
    <div style="background-image: url('/EduVerse/bg.png')"></div>`

  it('提取页面链接', () => {
    expect(extractRefs(html).links).toEqual(['/EduVerse/courses', 'https://example.com'])
  })

  it('提取各类资源引用（含 srcset 与内联 url()）', () => {
    expect(extractRefs(html).assets).toEqual(
      expect.arrayContaining([
        '/EduVerse/_next/static/css/a.css',
        '/EduVerse/a-1x.webp',
        '/EduVerse/a-2x.webp',
        '/EduVerse/_next/static/chunks/main.js',
        '/EduVerse/api/media/file/a.webp',
        '/EduVerse/b.webp',
        '/EduVerse/c.webp',
        '/EduVerse/bg.png',
      ]),
    )
  })
})

describe('extractCssUrls', () => {
  it('提取 url()，忽略 data URI', () => {
    const css = `@font-face{src:url(/EduVerse/_next/static/media/a.woff2) format("woff2")}
      .a{background:url("data:image/svg+xml;utf8,<svg/>")} .b{background:url('/EduVerse/x.png')}`
    expect(extractCssUrls(css)).toEqual(['/EduVerse/_next/static/media/a.woff2', '/EduVerse/x.png'])
  })
})

describe('applyNoindex', () => {
  it('替换已有 robots 并注入 noindex', () => {
    const out = applyNoindex(
      '<html><head><meta name="robots" content="index, follow"/><title>x</title></head></html>',
    )
    expect(out).toContain('<head><meta name="robots" content="noindex, nofollow"/>')
    expect(out.match(/name="robots"/g)).toHaveLength(1)
  })

  it('支持带属性的 <head>', () => {
    expect(applyNoindex('<html><head data-x="1"></head></html>')).toContain(
      '<head data-x="1"><meta name="robots" content="noindex, nofollow"/>',
    )
  })

  it('缺少 <head> 时报错', () => {
    expect(() => applyNoindex('<div></div>')).toThrow()
  })
})

describe('结尾斜杠归一化', () => {
  it('/foo/ 与 /foo 视为同一页面', () => {
    expect(toSitePath('/EduVerse/styleguide/', from, withBase)).toBe('/styleguide')
    expect(toSitePath('/courses/', 'http://localhost:3000/', atRoot)).toBe('/courses')
    expect(toSitePath('/', 'http://localhost:3000/', atRoot)).toBe('/')
  })
})

describe('isMissingBasePath', () => {
  it('同源但不在 basePath 下的引用会被识别', () => {
    expect(isMissingBasePath('/logo.png', from, withBase)).toBe(true)
    expect(isMissingBasePath('/api/media/file/a.webp', from, withBase)).toBe(true)
    expect(isMissingBasePath('/EduVersePlus', from, withBase)).toBe(true)
  })

  it('basePath 内、外站、锚点与特殊协议不算', () => {
    expect(isMissingBasePath('/EduVerse/logo.png', from, withBase)).toBe(false)
    expect(isMissingBasePath('/EduVerse', from, withBase)).toBe(false)
    expect(isMissingBasePath('https://example.com/logo.png', from, withBase)).toBe(false)
    expect(isMissingBasePath('#main', from, withBase)).toBe(false)
    expect(isMissingBasePath('tel:4000000000', from, withBase)).toBe(false)
  })

  it('根路径部署时不检查', () => {
    expect(isMissingBasePath('/logo.png', 'http://localhost:3000/', atRoot)).toBe(false)
  })
})

describe('isQueryDependentPath', () => {
  it('图片优化接口、后台接口与页面依赖查询串', () => {
    expect(isQueryDependentPath('/_next/image')).toBe(true)
    expect(isQueryDependentPath('/api/media/file/a.webp')).toBe(true)
    expect(isQueryDependentPath('/courses')).toBe(true)
  })

  it('带扩展名的普通静态文件（如带缓存参数的图标）不依赖查询串', () => {
    expect(isQueryDependentPath('/icon.png')).toBe(false)
    expect(isQueryDependentPath('/favicon.ico')).toBe(false)
  })
})
