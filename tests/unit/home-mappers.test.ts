import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  toHomeArticle,
  toHomeBanner,
  toHomeCampus,
  toHomeDiscipline,
  toHomeLink,
  toHomePartner,
  toHomeStory,
  toQuickEntry,
  type BannerSource,
  type HomeStorySource,
} from '@/lib/home/mappers'
import type { Media } from '@/payload-types'

/**
 * 首页：Payload 文档 → 视图模型（链接校验、图片尺寸、学员故事的隐私与课程可达性、合作企业不外链）。
 */

const media = (name: string, overrides: Partial<Media> = {}): Media => ({
  id: 1,
  alt: `${name}（占位图）`,
  url: `/api/media/file/${name}.png`,
  mimeType: 'image/png',
  width: 1920,
  height: 800,
  sizes: {
    card: { url: `/api/media/file/${name}-800.webp`, width: 800, height: 333 },
    thumbnail: { url: `/api/media/file/${name}-400.webp`, width: 400, height: 167 },
    hero: { url: `/api/media/file/${name}-1920.webp`, width: 1920, height: 800 },
    og: { url: `/api/media/file/${name}-og.webp`, width: 1200, height: 630 },
  },
  updatedAt: '',
  createdAt: '',
  ...overrides,
})

describe('链接 toHomeLink', () => {
  it('站内路径、页内锚点、tel: 为站内链接；http(s) 为外链', () => {
    expect(toHomeLink('/courses')).toEqual({ href: '/courses', external: false })
    expect(toHomeLink('#trial')).toEqual({ href: '#trial', external: false })
    expect(toHomeLink('tel:4000000000')).toEqual({ href: 'tel:4000000000', external: false })
    expect(toHomeLink(' https://example.com/a ')).toEqual({
      href: 'https://example.com/a',
      external: true,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('指向本站的完整地址转为站内路径', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.eduverse.example')
    expect(toHomeLink('https://www.eduverse.example/works?featured=1')).toEqual({
      href: '/works?featured=1',
      external: false,
    })
  })

  it('空值与不安全的地址返回 null', () => {
    expect(toHomeLink(null)).toBeNull()
    expect(toHomeLink('  ')).toBeNull()
    expect(toHomeLink('javascript:alert(1)')).toBeNull()
    expect(toHomeLink('//evil.example.com')).toBeNull()
    expect(toHomeLink('courses')).toBeNull()
  })
})

describe('轮播图 toHomeBanner', () => {
  const banner = (overrides: Partial<BannerSource> = {}): BannerSource => ({
    id: 5,
    title: ' 新学期课程开放报名 ',
    subtitle: '  ',
    ctaLabel: '查看课程',
    href: '/courses',
    image: media('banner'),
    mobileImage: media('banner-mobile'),
    startAt: '2026-11-01T00:00:00.000Z',
    endAt: null,
    ...overrides,
  })

  it('桌面图与移动端图都用 hero 尺寸（首屏 LCP 图不能被 800 宽封顶）；文字去空白，空副标题为 null', () => {
    const result = toHomeBanner(
      banner({
        mobileImage: media('banner-mobile', {
          width: 1500,
          height: 2000,
          sizes: {
            card: { url: '/api/media/file/banner-mobile-800.webp', width: 800, height: 1067 },
            hero: { url: '/api/media/file/banner-mobile-1500.webp', width: 1500, height: 2000 },
          },
        }),
      }),
    )
    expect(result).toMatchObject({
      id: 5,
      title: '新学期课程开放报名',
      subtitle: null,
      ctaLabel: '查看课程',
      link: { href: '/courses', external: false },
      startAt: '2026-11-01T00:00:00.000Z',
      endAt: null,
    })
    expect(result?.image).toMatchObject({
      src: '/api/media/file/banner-1920.webp',
      width: 1920,
      height: 800,
    })
    expect(result?.mobileImage).toMatchObject({
      src: '/api/media/file/banner-mobile-1500.webp',
      width: 1500,
      height: 2000,
    })
  })

  it('没有移动端图时直接用桌面图的 hero 尺寸（保留横幅宽高比，组件据此放大 sizes）', () => {
    const result = toHomeBanner(banner({ mobileImage: null }))
    expect(result?.mobileImage).toEqual(result?.image)
    expect(result?.mobileImage).toMatchObject({
      src: '/api/media/file/banner-1920.webp',
      width: 1920,
      height: 800,
    })
  })

  it('移动端图未填充（只有 ID）时同样回退到桌面图', () => {
    expect(toHomeBanner(banner({ mobileImage: 7 }))?.mobileImage.src).toBe(
      '/api/media/file/banner-1920.webp',
    )
  })

  it('没有链接地址时 link 为 null（按钮打开留资弹窗）；没有按钮文字时 ctaLabel 为 null', () => {
    const result = toHomeBanner(banner({ href: null, ctaLabel: ' ' }))
    expect(result?.link).toBeNull()
    expect(result?.ctaLabel).toBeNull()
  })

  it('桌面图未填充（只有 ID）时不展示', () => {
    expect(toHomeBanner(banner({ image: 3 }))).toBeNull()
  })
})

describe('快速了解 toQuickEntry', () => {
  it('跳转链接：地址经过校验，配图用 thumbnail 尺寸', () => {
    expect(
      toQuickEntry(
        {
          id: 'row-1',
          title: ' 学员作品 ',
          description: '',
          action: 'link',
          href: '/works',
          image: media('entry'),
        },
        0,
      ),
    ).toEqual({
      id: 'row-1',
      title: '学员作品',
      description: null,
      image: {
        src: '/api/media/file/entry-400.webp',
        alt: 'entry（占位图）',
        width: 400,
        height: 167,
      },
      action: { kind: 'link', link: { href: '/works', external: false } },
    })
  })

  it('打开预约弹窗：忽略地址；没有行 ID 时按序号生成', () => {
    expect(
      toQuickEntry({ title: '预约试听', action: 'lead', href: '/should-ignore' }, 3),
    ).toMatchObject({ id: 'entry-3', action: { kind: 'lead' }, image: null })
  })

  it('跳转链接但地址缺失或不安全、或标题为空时不展示', () => {
    expect(toQuickEntry({ title: '测试', action: 'link', href: null }, 0)).toBeNull()
    expect(
      toQuickEntry({ title: '测试', action: 'link', href: 'javascript:void(0)' }, 0),
    ).toBeNull()
    expect(toQuickEntry({ title: ' ', action: 'lead' }, 0)).toBeNull()
  })
})

describe('热门专业 toHomeDiscipline', () => {
  it('简称兜底为全称，封面用 card 尺寸，带课程数', () => {
    expect(
      toHomeDiscipline(
        {
          id: 7,
          name: '三维动画',
          shortName: null,
          slug: '3d-animation',
          tagline: ' 从建模到动画 ',
          cover: media('d'),
        },
        3,
      ),
    ).toEqual({
      id: 7,
      name: '三维动画',
      shortName: '三维动画',
      slug: '3d-animation',
      tagline: '从建模到动画',
      cover: { src: '/api/media/file/d-800.webp', alt: 'd（占位图）', width: 800, height: 333 },
      courseCount: 3,
    })
  })
})

describe('学员故事 toHomeStory', () => {
  const reachable = new Map([[21, { title: 'UI/UX 设计长期就业班', slug: 'ui-ux-career' }]])
  const story = (overrides: Partial<HomeStorySource> = {}): HomeStorySource => ({
    id: 4,
    displayName: ' 小鹿 ',
    background: '财务专员转行',
    avatar: media('avatar'),
    currentRole: 'UI 设计师',
    companyName: '',
    quote: ' 先把逻辑理清楚，再动手画。 ',
    course: { id: 21 },
    partner: { name: '星槎网络科技' },
    ...overrides,
  })

  it('化名、背景、头像（thumbnail）、岗位；就职公司为空时取合作企业名称', () => {
    expect(toHomeStory(story(), reachable)).toEqual({
      id: 4,
      displayName: '小鹿',
      background: '财务专员转行',
      avatar: {
        src: '/api/media/file/avatar-400.webp',
        alt: 'avatar（占位图）',
        width: 400,
        height: 167,
      },
      currentRole: 'UI 设计师',
      companyName: '星槎网络科技',
      quote: '先把逻辑理清楚，再动手画。',
      course: { title: 'UI/UX 设计长期就业班', slug: 'ui-ux-career' },
    })
  })

  it('填写了就职公司时用它；所属课程不可访问（不在可访问课程里）时不给出课程', () => {
    const result = toHomeStory(
      story({ companyName: '某工作室', course: 99, partner: null }),
      reachable,
    )
    expect(result.companyName).toBe('某工作室')
    expect(result.course).toBeNull()
  })

  it('只输出卡片字段：不含正文、作品、薪资等其它字段', () => {
    const result = toHomeStory(
      { ...story(), story: { root: {} }, salary: '20k' } as HomeStorySource,
      reachable,
    )
    expect(Object.keys(result).sort()).toEqual(
      [
        'avatar',
        'background',
        'companyName',
        'course',
        'currentRole',
        'displayName',
        'id',
        'quote',
      ].sort(),
    )
  })
})

describe('合作企业 toHomePartner', () => {
  it('Logo 用 thumbnail 尺寸，替代文字统一为企业名；不输出官网地址', () => {
    const result = toHomePartner({
      id: 8,
      name: ' 星槎网络科技 ',
      industry: '游戏研发',
      logo: media('logo'),
      website: 'https://example.com',
    } as Parameters<typeof toHomePartner>[0])
    expect(result).toEqual({
      id: 8,
      name: '星槎网络科技',
      industry: '游戏研发',
      logo: { src: '/api/media/file/logo-400.webp', alt: '星槎网络科技', width: 400, height: 167 },
    })
  })

  it('Logo 未填充时不展示', () => {
    expect(toHomePartner({ id: 8, name: 'A', industry: null, logo: 2 })).toBeNull()
  })
})

describe('校区 toHomeCampus', () => {
  it('电话生成 tel: 链接，有坐标时生成高德地图链接', () => {
    expect(
      toHomeCampus({
        id: 1,
        name: '北京海淀校区',
        slug: 'beijing-haidian',
        city: '北京',
        address: '北京市海淀区（示例地址）',
        phone: '010-6000 0000',
        openingHours: ' ',
        cover: media('campus'),
        location: { lng: 116.31, lat: 39.98 },
      }),
    ).toMatchObject({
      phone: '010-6000 0000',
      phoneHref: 'tel:01060000000',
      openingHours: null,
      cover: { src: '/api/media/file/campus-800.webp' },
      mapUrl: expect.stringMatching(/^https:\/\/uri\.amap\.com\/marker\?position=116\.31,39\.98&/),
    })
  })

  it('没有电话与坐标时对应链接为 null', () => {
    const result = toHomeCampus({
      id: 1,
      name: '校区',
      slug: 'x',
      city: '某市',
      address: '地址',
      phone: null,
      openingHours: null,
      cover: 3,
      location: {},
    })
    expect(result.phoneHref).toBeNull()
    expect(result.mapUrl).toBeNull()
    expect(result.cover).toBeNull()
  })
})

describe('资讯 toHomeArticle', () => {
  it('分类已填充时给出 id / name / slug；只有 ID 时为 null', () => {
    const base = {
      id: 30,
      slug: 'portfolio-tips',
      title: ' 作品集怎么排 ',
      excerpt: ' 摘要 ',
      publishedAt: '2026-11-20T02:00:00.000Z',
      cover: media('article'),
    }
    expect(
      toHomeArticle({ ...base, category: { id: 2, name: '学习指南', slug: 'guide', order: 1 } }),
    ).toEqual({
      id: 30,
      slug: 'portfolio-tips',
      title: '作品集怎么排',
      excerpt: '摘要',
      publishedAt: '2026-11-20T02:00:00.000Z',
      category: { id: 2, name: '学习指南', slug: 'guide' },
      cover: {
        src: '/api/media/file/article-800.webp',
        alt: 'article（占位图）',
        width: 800,
        height: 333,
      },
    })
    expect(toHomeArticle({ ...base, category: 2 }).category).toBeNull()
  })
})
