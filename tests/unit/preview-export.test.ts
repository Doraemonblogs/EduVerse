import { describe, expect, it } from 'vitest'

import {
  applyNoindex,
  assetOutputFile,
  extractCssUrls,
  extractMediaRefs,
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

describe('extractMediaRefs', () => {
  /**
   * 按预览构建（basePath /EduVerse、图片不经优化接口）的作品详情页结构整理的样例：
   * - 灯箱大图（1050x1400）只在 RSC 数据里：React key（"2-/EduVerse/…"）与 items 的 props；
   * - 缩略图同时在 srcSet 属性与 RSC 数据里；
   * - 分享图只在 <meta content>（站点正式地址，域名与抓取地址不同）与 RSC 的 metadata 里；
   * - JSON-LD 图片是完整地址。
   */
  const html = [
    '<!DOCTYPE html><html lang="zh-CN"><head>',
    '<meta property="og:image" content="https://doraemonblogs.github.io/EduVerse/api/media/file/seed-work-05-1200x630.webp"/>',
    '<meta name="twitter:image" content="https://doraemonblogs.github.io/EduVerse/api/media/file/seed-work-05-1200x630.webp"/>',
    '</head><body>',
    '<script type="application/ld+json">{"@type":"CreativeWork","image":"https://doraemonblogs.github.io/EduVerse/api/media/file/seed-work-05-1200x1600.webp"}</script>',
    '<img alt="" srcSet="/EduVerse/api/media/file/seed-work-05-detail-0-400x533.webp 1x" src="/EduVerse/api/media/file/seed-work-05-detail-0-400x533.webp"/>',
    String.raw`<script>self.__next_f.push([1,"212:[\"$\",\"$L218\",null,{\"items\":[{\"image\":{\"src\":\"/EduVerse/api/media/file/seed-work-05-detail-0-1050x1400.webp\",\"alt\":\"高模雕刻（占位图）\",\"width\":1050,\"height\":1400},\"thumb\":{\"src\":\"/EduVerse/api/media/file/seed-work-05-detail-0-400x533.webp\",\"alt\":\"\",\"width\":400,\"height\":533},\"caption\":\"高模雕刻\"}]}]\n"])</script>`,
    String.raw`<script>self.__next_f.push([1,"[\"$\",\"li\",\"2-/EduVerse/api/media/file/seed-work-05-detail-1-1050x1400.webp\",{\"className\":\"shrink-0\"}],[\"$\",\"meta\",\"11\",{\"property\":\"og:image\",\"content\":\"https://doraemonblogs.github.io/EduVerse/api/media/file/seed-work-05-1200x630.webp\"}]\n"])</script>`,
    '</body></html>',
  ].join('')

  it('从 RSC 数据、<meta content> 与 JSON-LD 中提取媒体文件（去重，去掉域名与 basePath）', () => {
    const { paths, missingBasePath } = extractMediaRefs(html, '/EduVerse')
    expect(paths.sort()).toEqual(
      [
        '/api/media/file/seed-work-05-1200x630.webp',
        '/api/media/file/seed-work-05-1200x1600.webp',
        '/api/media/file/seed-work-05-detail-0-400x533.webp',
        '/api/media/file/seed-work-05-detail-0-1050x1400.webp',
        '/api/media/file/seed-work-05-detail-1-1050x1400.webp',
      ].sort(),
    )
    expect(missingBasePath).toEqual([])
  })

  it('补上 extractRefs 看不到的引用：灯箱大图与分享图不在任何属性里', () => {
    const fromUrl = 'http://localhost:3000/EduVerse/works/736'
    const inAttributes = extractRefs(html).assets.map((ref) => toSitePath(ref, fromUrl, withBase))
    expect(inAttributes).not.toContain('/api/media/file/seed-work-05-detail-1-1050x1400.webp')
    expect(inAttributes).not.toContain('/api/media/file/seed-work-05-1200x630.webp')
    expect(extractMediaRefs(html, '/EduVerse').paths).toEqual(
      expect.arrayContaining([
        '/api/media/file/seed-work-05-detail-1-1050x1400.webp',
        '/api/media/file/seed-work-05-1200x630.webp',
      ]),
    )
  })

  it('缺少 basePath 的媒体引用（含 RSC 数据里的）单独列出，不当作可导出的资源', () => {
    const broken = String.raw`<script>self.__next_f.push([1,"{\"src\":\"/api/media/file/a-1050x1400.webp\"}"])</script><img src="/EduVerse/api/media/file/b.webp"/>`
    expect(extractMediaRefs(broken, '/EduVerse')).toEqual({
      paths: ['/api/media/file/b.webp'],
      missingBasePath: ['/api/media/file/a-1050x1400.webp'],
    })
    // 只有前缀相似的子路径不算
    expect(
      extractMediaRefs('<img src="/EduVersePlus/api/media/file/c.webp"/>', '/EduVerse')
        .missingBasePath,
    ).toEqual(['/api/media/file/c.webp'])
  })

  it('根路径部署时不检查 basePath', () => {
    expect(extractMediaRefs(String.raw`{\"src\":\"/api/media/file/a.webp\"}`, '')).toEqual({
      paths: ['/api/media/file/a.webp'],
      missingBasePath: [],
    })
  })

  it('文件名按 encodeURIComponent 的字符集识别：保留 %XX 与成对括号，去掉 url() 的引号与右括号', () => {
    const css = [
      `<div style="background-image:url('/EduVerse/api/media/file/bg.webp')"></div>`,
      '<div style="background-image:url(/EduVerse/api/media/file/bg2.webp)"></div>',
      '<img src="/EduVerse/api/media/file/%E5%B0%81%E9%9D%A2(1).webp"/>',
      '<img srcset="/EduVerse/api/media/file/x-400.webp 400w,/EduVerse/api/media/file/x-800.webp 800w"/>',
      '<a href="/EduVerse/api/media/file/doc.pdf?download=1#p2">附件</a>',
    ].join('')
    expect(extractMediaRefs(css, '/EduVerse').paths).toEqual([
      '/api/media/file/bg.webp',
      '/api/media/file/bg2.webp',
      '/api/media/file/%E5%B0%81%E9%9D%A2(1).webp',
      '/api/media/file/x-400.webp',
      '/api/media/file/x-800.webp',
      '/api/media/file/doc.pdf',
    ])
  })

  it("属性里经 HTML 转义的文件名（' 写成 &#x27;）与 RSC 数据里的原样文件名识别为同一个文件", () => {
    // sanitize-filename 与 encodeURIComponent 都保留 '；React 输出属性时把它转义为 &#x27;
    const name = "director's-cut-1200x630.webp"
    const escaped = [
      `<meta property="og:image" content="https://doraemonblogs.github.io/EduVerse/api/media/file/director&#x27;s-cut-1200x630.webp"/>`,
      `<div style="background-image:url(&#x27;/EduVerse/api/media/file/bg&#39;s.webp&#x27;)"></div>`,
      String.raw`<script>self.__next_f.push([1,"{\"src\":\"/EduVerse/api/media/file/${name}\"}"])</script>`,
    ].join('')
    expect(extractMediaRefs(escaped, '/EduVerse')).toEqual({
      paths: [`/api/media/file/${name}`, "/api/media/file/bg's.webp"],
      missingBasePath: [],
    })
  })

  it('经优化接口的图片地址（url 参数已编码）不算媒体文件引用', () => {
    expect(
      extractMediaRefs(
        '<img src="/EduVerse/_next/image?url=%2FEduVerse%2Fapi%2Fmedia%2Ffile%2Fa.webp&amp;w=640&amp;q=75"/>',
        '/EduVerse',
      ),
    ).toEqual({ paths: [], missingBasePath: [] })
  })
})
