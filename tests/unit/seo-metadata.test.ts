import { resolveUrl } from 'next/dist/lib/metadata/resolvers/resolve-url'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Media } from '@/payload-types'

/** 站点设置（后台 site-settings），每个用例按需修改 */
const settings = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/data/site', () => ({
  getSiteSettings: () => Promise.resolve(settings.current),
}))

const shareImage = {
  id: 1,
  alt: '分享图',
  url: '/api/media/file/share.webp',
  width: 2400,
  height: 1260,
  sizes: { og: { url: '/api/media/file/share-1200x630.webp', width: 1200, height: 630 } },
} as unknown as Media

type Env = { basePath: string; siteUrl: string }

/** BASE_PATH 在模块加载时读取：按部署环境重新加载模块 */
async function loadBuildMetadata({ basePath, siteUrl }: Env) {
  vi.resetModules()
  vi.stubEnv('NEXT_BASE_PATH', basePath)
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl)
  const { buildMetadata } = await import('@/lib/seo/metadata')
  return buildMetadata
}

/** 取 openGraph.images 的第一张图的地址（Next 的类型是多种写法的联合） */
function firstOgImageUrl(images: unknown): string | undefined {
  const list: unknown[] = Array.isArray(images) ? images : images ? [images] : []
  const [first] = list
  if (first && typeof first === 'object' && 'url' in first) return String(first.url)
  return typeof first === 'string' ? first : undefined
}

afterEach(() => {
  vi.unstubAllEnvs()
  settings.current = {}
})

describe('buildMetadata 分享图（og:image）', () => {
  it('子路径部署时输出只带一次子路径的完整地址', async () => {
    const env = { basePath: '/EduVerse', siteUrl: 'https://user.github.io/EduVerse' }
    const buildMetadata = await loadBuildMetadata(env)
    const metadata = await buildMetadata({ seo: { image: shareImage }, path: '/about' })

    const url = firstOgImageUrl(metadata.openGraph?.images)
    expect(url).toBe('https://user.github.io/EduVerse/api/media/file/share-1200x630.webp')

    // 布局的 metadataBase 为站点地址：完整地址不会再被拼一次子路径
    expect(resolveUrl(url ?? '', new URL(env.siteUrl)).href).toBe(url)
  })

  it('根路径部署时输出站点域名下的完整地址', async () => {
    const buildMetadata = await loadBuildMetadata({
      basePath: '',
      siteUrl: 'https://www.example.cn',
    })
    const metadata = await buildMetadata({ image: shareImage, path: '/privacy' })
    expect(firstOgImageUrl(metadata.openGraph?.images)).toBe(
      'https://www.example.cn/api/media/file/share-1200x630.webp',
    )
  })

  it('保留图片尺寸与替代文字；内容没有分享图时使用站点默认分享图', async () => {
    settings.current = { brandName: '测试品牌', defaultSeo: { image: shareImage } }
    const buildMetadata = await loadBuildMetadata({
      basePath: '/EduVerse',
      siteUrl: 'https://user.github.io/EduVerse/',
    })
    const metadata = await buildMetadata({ title: '关于我们', path: '/about' })
    expect(metadata.openGraph?.images).toEqual([
      {
        url: 'https://user.github.io/EduVerse/api/media/file/share-1200x630.webp',
        width: 1200,
        height: 630,
        alt: '分享图',
      },
    ])
    expect(metadata.alternates?.canonical).toBe('https://user.github.io/EduVerse/about')
  })

  it('媒体地址已是完整地址（对象存储等）时原样输出', async () => {
    const buildMetadata = await loadBuildMetadata({
      basePath: '/EduVerse',
      siteUrl: 'https://user.github.io/EduVerse',
    })
    const remote = { ...shareImage, sizes: {}, url: 'https://static.example.cn/a.webp' }
    const metadata = await buildMetadata({ image: remote, path: '/' })
    expect(firstOgImageUrl(metadata.openGraph?.images)).toBe('https://static.example.cn/a.webp')
  })

  it('数据层已处理好的分享图（og 裁切）直接使用，子路径只出现一次', async () => {
    const buildMetadata = await loadBuildMetadata({
      basePath: '/EduVerse',
      siteUrl: 'https://user.github.io/EduVerse',
    })
    // 课程视图模型的 shareImage = imageSource(cover, 'og')：地址已补 basePath
    const shareImage = {
      src: '/EduVerse/api/media/file/course-1200x630.webp',
      alt: '课程封面',
      width: 1200,
      height: 630,
    }
    const metadata = await buildMetadata({ shareImage, path: '/courses/demo' })
    expect(metadata.openGraph?.images).toEqual([
      {
        url: 'https://user.github.io/EduVerse/api/media/file/course-1200x630.webp',
        width: 1200,
        height: 630,
        alt: '课程封面',
      },
    ])
  })

  it('SEO 字段组的分享图优先于封面兜底；都没有时用站点默认分享图', async () => {
    const fallback = {
      src: '/api/media/file/cover-1200x630.webp',
      alt: '',
      width: 1200,
      height: 630,
    }
    settings.current = {
      defaultSeo: {
        image: { ...shareImage, sizes: { og: { url: '/default.webp', width: 1200, height: 630 } } },
      },
    }
    const buildMetadata = await loadBuildMetadata({
      basePath: '',
      siteUrl: 'https://www.example.cn',
    })
    const withSeo = await buildMetadata({
      seo: { image: shareImage },
      shareImage: fallback,
      path: '/courses/demo',
    })
    expect(firstOgImageUrl(withSeo.openGraph?.images)).toBe(
      'https://www.example.cn/api/media/file/share-1200x630.webp',
    )
    const withFallback = await buildMetadata({ shareImage: fallback, path: '/courses/demo' })
    expect(firstOgImageUrl(withFallback.openGraph?.images)).toBe(
      'https://www.example.cn/api/media/file/cover-1200x630.webp',
    )
    const withDefault = await buildMetadata({ shareImage: null, path: '/courses/demo' })
    expect(firstOgImageUrl(withDefault.openGraph?.images)).toBe(
      'https://www.example.cn/default.webp',
    )
  })

  it('没有任何分享图时不输出 og:image', async () => {
    const buildMetadata = await loadBuildMetadata({
      basePath: '',
      siteUrl: 'https://www.example.cn',
    })
    const metadata = await buildMetadata({ title: '联系我们', path: '/contact' })
    expect(metadata.openGraph?.images).toBeUndefined()
  })
})

describe('buildMetadata 标题模板', () => {
  it("页面标题中的 $ 替换模式（$&、$'、$`、$$）原样放进模板，不被展开", async () => {
    const buildMetadata = await loadBuildMetadata({
      basePath: '',
      siteUrl: 'https://www.example.cn',
    })
    settings.current = { brandName: '测试学院', titleTemplate: '%s - 测试学院' }
    for (const title of ["搜索：$'", '搜索：$&', '搜索：$`', '搜索：a$$b', '搜索：$1 $<name>']) {
      const metadata = await buildMetadata({ title, path: '/search' })
      expect(metadata.title).toEqual({ absolute: `${title} - 测试学院` })
      expect(metadata.openGraph?.title).toBe(`${title} - 测试学院`)
    }
  })

  it('后台没有填写标题模板时用“页面标题 - 品牌名”', async () => {
    const buildMetadata = await loadBuildMetadata({
      basePath: '',
      siteUrl: 'https://www.example.cn',
    })
    settings.current = { brandName: '测试学院' }
    const metadata = await buildMetadata({ title: "搜索：$'", path: '/search' })
    expect(metadata.title).toEqual({ absolute: "搜索：$' - 测试学院" })
  })
})
