// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  cardDesktopLayout,
  logoWallColumns,
  scrollerLayoutProps,
  WORKS_VISIBLE,
  worksItemVisibility,
} from '@/components/home/bottom/layout'
import { HOME_CONTAINER_CLASS } from '@/components/home/rhythm'
import type { LeadFormConfig } from '@/components/lead/types'
import type {
  HomeCampus,
  HomeListSection,
  HomePartner,
  HomeSectionHeading,
  HomeStory,
} from '@/lib/home/types'
import type { WorkCardData } from '@/lib/works/types'

import { teacherListItem, workCard } from '../helpers/work-fixtures'

/**
 * 首页区块 5–11（src/components/home/bottom）：版式规则（纯函数）与各区块的输出（jsdom）。
 * 横滑、断点显示与整页节奏由首页 e2e 覆盖。
 */
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction: vi.fn() }))
vi.mock('@/lib/data/lead-form', () => ({ getLeadFormConfig: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const { getLeadFormConfig } = await import('@/lib/data/lead-form')
const { WorksSection } = await import('@/components/home/bottom/works-section')
const { StoriesSection, storyRoleLine } = await import('@/components/home/bottom/stories-section')
const { PartnersSection } = await import('@/components/home/bottom/partners-section')
const { TeachersSection } = await import('@/components/home/bottom/teachers-section')
const { CampusesSection } = await import('@/components/home/bottom/campuses-section')
const { ArticlesSection } = await import('@/components/home/bottom/articles-section')
const { LeadSection } = await import('@/components/home/bottom/lead-section')
const { WorkCard } = await import('@/components/works/work-card')

afterEach(cleanup)

// 留资表单里的 Radix 组件（复选框）挂载时用到 ResizeObserver，jsdom 没有
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeAll(() => vi.stubGlobal('ResizeObserver', NoopResizeObserver))
afterAll(() => vi.unstubAllGlobals())

const heading = (overrides: Partial<HomeSectionHeading> = {}): HomeSectionHeading => ({
  eyebrow: 'Eyebrow',
  title: '区块标题',
  description: '区块描述',
  ...overrides,
})

const list = <T,>(items: T[], title = '区块标题'): HomeListSection<T> => ({
  heading: heading({ title }),
  items,
})

const story = (overrides: Partial<HomeStory> = {}): HomeStory => ({
  id: 1,
  displayName: '小鹿',
  background: '财务专员转行',
  avatar: { src: '/api/media/file/s-400x400.webp', alt: '', width: 400, height: 400 },
  currentRole: 'UI 设计师',
  companyName: '星槎网络科技',
  quote: '先把逻辑理清楚，再动手画。',
  course: { title: 'UI/UX 设计长期就业班', slug: 'ui-ux-career' },
  ...overrides,
})

const partner = (id: number, name: string): HomePartner => ({
  id,
  name,
  industry: '游戏研发',
  logo: { src: `/api/media/file/p-${id}-400x200.webp`, alt: name, width: 400, height: 200 },
})

const campus = (overrides: Partial<HomeCampus> = {}): HomeCampus => ({
  id: 1,
  name: '北京海淀校区',
  slug: 'beijing-haidian',
  city: '北京',
  address: '北京市海淀区示例路 1 号',
  phone: '010-0000-0001',
  phoneHref: 'tel:01000000001',
  openingHours: '周一至周日 9:00–21:00',
  cover: null,
  mapUrl: 'https://uri.amap.com/marker?position=116.31,39.98&name=%E5%8C%97',
  ...overrides,
})

const leadConfig: LeadFormConfig = {
  disciplines: [{ id: 1, name: '三维动画' }],
  cities: ['北京'],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: '400-000-0000',
}

const SALARY = /月薪|年薪|薪资|工资|收入|\d+\s*[kK万]/

/** 区块的版心（<section> 的第一个子元素，即 <Container>） */
const containerOf = (region: HTMLElement) => region.firstElementChild as HTMLElement

describe('版式规则', () => {
  it('卡片区块：不超过 maxColumns × maxRows 张用网格（列数 = 张数，至少 2 列），更多时横滑', () => {
    const opts = { maxColumns: 4, maxRows: 1 } as const
    expect(cardDesktopLayout(1, opts)).toEqual({ desktop: 'grid', columns: 2, from: 'lg' })
    expect(cardDesktopLayout(3, opts)).toEqual({ desktop: 'grid', columns: 3, from: 'lg' })
    expect(cardDesktopLayout(4, opts)).toEqual({ desktop: 'grid', columns: 4, from: 'lg' })
    expect(cardDesktopLayout(5, opts)).toEqual({ desktop: 'scroll' })
    expect(cardDesktopLayout(6, { maxColumns: 3, maxRows: 2 })).toEqual({
      desktop: 'grid',
      columns: 3,
      from: 'lg',
    })
    expect(cardDesktopLayout(7, { maxColumns: 3, maxRows: 2 })).toEqual({ desktop: 'scroll' })
  })

  it('lgMaxColumns：网格列数超过它时 1024–1279px 继续横滑，xl 起才改为网格', () => {
    const opts = { maxColumns: 4, maxRows: 1, lgMaxColumns: 3 } as const
    expect(cardDesktopLayout(4, opts)).toEqual({ desktop: 'grid', columns: 4, from: 'xl' })
    expect(cardDesktopLayout(3, opts)).toEqual({ desktop: 'grid', columns: 3, from: 'lg' })
    expect(cardDesktopLayout(2, opts)).toEqual({ desktop: 'grid', columns: 2, from: 'lg' })
    expect(cardDesktopLayout(5, opts)).toEqual({ desktop: 'scroll' })
  })

  it('桌面端版式转为 HorizontalScroller 的 props', () => {
    expect(scrollerLayoutProps({ desktop: 'grid', columns: 4, from: 'xl' })).toEqual({
      desktop: 'grid',
      columns: 4,
      gridFrom: 'xl',
    })
    expect(scrollerLayoutProps({ desktop: 'scroll' })).toEqual({ desktop: 'scroll' })
  })

  it('Logo 墙列数：整除优先，否则选最后一行更满的；同样满时 6 列', () => {
    expect(logoWallColumns(20)).toBe(5)
    expect(logoWallColumns(24)).toBe(6)
    expect(logoWallColumns(18)).toBe(6)
    expect(logoWallColumns(15)).toBe(5)
    // 16：6 列余 4（2/3 行）比 5 列余 1（1/5 行）更满
    expect(logoWallColumns(16)).toBe(6)
    expect(logoWallColumns(30)).toBe(6)
    expect(logoWallColumns(3)).toBe(6)
  })

  it('作品按断点显示：移动端前 6 件、md 前 9 件、≥ lg 全部', () => {
    expect(WORKS_VISIBLE).toEqual({ mobile: 6, tablet: 9 })
    expect(worksItemVisibility(0)).toBeUndefined()
    expect(worksItemVisibility(5)).toBeUndefined()
    expect(worksItemVisibility(6)).toBe('max-md:hidden')
    expect(worksItemVisibility(8)).toBe('max-md:hidden')
    expect(worksItemVisibility(9)).toBe('max-lg:hidden')
    expect(worksItemVisibility(11)).toBe('max-lg:hidden')
  })
})

describe('WorksSection', () => {
  const works: WorkCardData[] = Array.from({ length: 10 }, (_, index) =>
    workCard({ id: index + 1, title: `作品 ${index + 1}`, featured: true }),
  )

  it('深色区块，标题 h2 关联区块；作品卡片统一裁切、不逐张标“精选”；注明授权与化名', () => {
    render(<WorksSection section={list(works, '学员作品')} />)
    const region = screen.getByRole('region', { name: '学员作品' })
    expect(region.className).toContain('surface-dark')
    expect(within(region).getAllByRole('heading', { level: 3 })).toHaveLength(10)
    expect(within(region).queryByText('精选')).toBeNull()
    expect(within(region).getByText('作品均已获得学员授权，署名为学员化名。')).toBeTruthy()
    const cardLink = within(region).getByRole('link', { name: '作品 1' })
    expect(cardLink.getAttribute('href')).toBe('/works/1')
    expect(cardLink.querySelector('img')?.className).toContain('object-cover')
  })

  it('超出移动端 / 平板件数的作品按断点隐藏；“查看更多作品”链接到 /works（桌面与移动端各一份，按断点显示）', () => {
    render(<WorksSection section={list(works, '学员作品')} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.className)).toEqual([
      '',
      '',
      '',
      '',
      '',
      '',
      'max-md:hidden',
      'max-md:hidden',
      'max-md:hidden',
      'max-lg:hidden',
    ])
    const more = screen.getAllByRole('link', { name: '查看更多作品' })
    expect(more.map((link) => link.getAttribute('href'))).toEqual(['/works', '/works'])
    expect(more[0].className).toContain('md:inline-flex')
    expect(more[1].className).toContain('md:hidden')
  })
})

describe('WorkCard（首页新增选项）', () => {
  it('cover="uniform"：封面容器 4:3、图片 object-cover；默认仍按原图宽高比', () => {
    const { rerender } = render(<WorkCard work={workCard()} cover="uniform" />)
    const img = screen.getByRole('img')
    expect(img.className).toContain('object-cover')
    expect(img.parentElement?.className).toContain('aspect-[4/3]')
    rerender(<WorkCard work={workCard()} />)
    expect(screen.getByRole('img').className).toContain('h-auto')
    expect(screen.getByRole('img').className).not.toContain('object-cover')
  })

  it('showFeatured={false}：不显示“精选”徽标，也不加入链接描述', () => {
    render(<WorkCard work={workCard({ featured: true })} showFeatured={false} />)
    expect(screen.queryByText('精选')).toBeNull()
    const link = screen.getByRole('link')
    const described = (link.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '')
    expect(described.join('')).not.toContain('精选')
  })
})

describe('StoriesSection', () => {
  const stories = [
    story(),
    story({ id: 2, displayName: '沐沐', companyName: null, course: null }),
    story({ id: 3, displayName: 'Leo', currentRole: null, background: null, quote: null }),
  ]

  it('横滑列表：化名（h3）、现任岗位 · 公司、引言、学习前与所学课程；注明“学员姓名为化名”', () => {
    render(<StoriesSection section={list(stories, '学员故事')} />)
    const region = screen.getByRole('region', { name: '学员故事' })
    const listEl = within(region).getByRole('list', { name: '学员故事' })
    expect(within(listEl).getAllByRole('listitem')).toHaveLength(3)
    expect(
      within(region)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['小鹿', '沐沐', 'Leo'])
    expect(region.textContent).toContain('UI 设计师\u00a0· 星槎网络科技')
    expect(region.textContent).toContain('先把逻辑理清楚，再动手画。')
    expect(region.textContent).toContain('财务专员转行')
    expect(within(region).getByText('学员姓名为化名，经历均已取得本人授权后展示。')).toBeTruthy()
  })

  it('不展示薪资；卡片不是链接，只有所学课程链接到课程详情（不链接合作企业）', () => {
    render(<StoriesSection section={list(stories, '学员故事')} />)
    const region = screen.getByRole('region', { name: '学员故事' })
    expect(region.textContent).not.toMatch(SALARY)
    const links = within(region).getAllByRole('link')
    // 第 1、3 个故事有可公开访问的课程，第 2 个没有
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['UI/UX 设计长期就业班', '/courses/ui-ux-career'],
      ['UI/UX 设计长期就业班', '/courses/ui-ux-career'],
    ])
  })

  it('现任岗位与公司：任一为空时只显示另一个，都为空时为 null', () => {
    expect(storyRoleLine({ currentRole: 'UI 设计师', companyName: '星槎' })).toBe(
      'UI 设计师\u00a0· 星槎',
    )
    expect(storyRoleLine({ currentRole: 'UI 设计师', companyName: null })).toBe('UI 设计师')
    expect(storyRoleLine({ currentRole: ' ', companyName: '星槎' })).toBe('星槎')
    expect(storyRoleLine({ currentRole: ' UI 设计师 ', companyName: ' 星槎 ' })).toBe(
      'UI 设计师\u00a0· 星槎',
    )
    expect(storyRoleLine({ currentRole: null, companyName: null })).toBeNull()
  })

  it('岗位 · 公司换行只发生在“·”之后：“·”与岗位之间是不换行空格，整行不在中文词内断开', () => {
    render(
      <StoriesSection
        section={list(
          [story({ currentRole: '3D 硬表面建模师', companyName: '砺石游戏' })],
          '学员故事',
        )}
      />,
    )
    const region = screen.getByRole('region', { name: '学员故事' })
    const role = within(region).getByText((_, element) =>
      Boolean(element?.tagName === 'P' && element.textContent?.endsWith('砺石游戏')),
    )
    // “·”前不能断行（不换行空格），“·”后可以断行（普通空格）
    expect(role.textContent).toContain('3D 硬表面建模师\u00a0· 砺石游戏')
    expect(role.className).toContain('break-keep')
    expect(role.className).toContain('wrap-break-word')
  })

  it('4 个故事：1024–1279px 继续横滑（每屏 3 张），xl 起一行 4 列网格；不超过 3 个时 lg 起即为网格', () => {
    const four = [1, 2, 3, 4].map((id) => story({ id, displayName: `学员 ${id}` }))
    render(<StoriesSection section={list(four, '学员故事')} />)
    const listEl = screen.getByRole('list', { name: '学员故事' })
    expect(listEl.className).toContain('xl:grid')
    expect(listEl.className).toContain('xl:grid-cols-4')
    expect(listEl.className).not.toMatch(/(^|\s)lg:grid(\s|$)/)
    expect(listEl.className).not.toContain('lg:grid-cols-')
    cleanup()

    render(<StoriesSection section={list(four.slice(0, 3), '学员故事')} />)
    const three = screen.getByRole('list', { name: '学员故事' })
    expect(three.className).toMatch(/(^|\s)lg:grid(\s|$)/)
    expect(three.className).toContain('lg:grid-cols-3')
    expect(three.className).not.toContain('xl:grid')
  })
})

describe('PartnersSection', () => {
  it('Logo 墙：alt 为企业名称，不输出任何链接（不外链第三方）', () => {
    const partners = Array.from({ length: 20 }, (_, index) =>
      partner(index + 1, `企业 ${index + 1}`),
    )
    render(<PartnersSection section={list(partners, '合作企业')} />)
    const region = screen.getByRole('region', { name: '合作企业' })
    const listEl = within(region).getByRole('list', { name: '合作企业名单' })
    expect(
      within(listEl)
        .getAllByRole('img')
        .map((img) => img.getAttribute('alt')),
    ).toEqual(partners.map((p) => p.name))
    expect(within(region).queryAllByRole('link')).toHaveLength(0)
    // 20 家 → 桌面端 5 列
    expect(listEl.className).toContain('lg:grid-cols-5')
  })
})

describe('TeachersSection', () => {
  it('讲师卡片链接到详情；“查看全部讲师”链接到 /teachers', () => {
    const teachers = [
      teacherListItem(),
      teacherListItem({ id: 2, slug: 'han-zheng', name: '韩征' }),
    ]
    render(<TeachersSection section={list(teachers, '师资团队')} />)
    const region = screen.getByRole('region', { name: '师资团队' })
    expect(within(region).getByRole('link', { name: '林雨晴' }).getAttribute('href')).toBe(
      '/teachers/lin-yu-qing',
    )
    expect(within(region).getByRole('link', { name: '韩征' }).getAttribute('href')).toBe(
      '/teachers/han-zheng',
    )
    expect(
      within(region)
        .getAllByRole('link', { name: '查看全部讲师' })
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/teachers', '/teachers'])
  })
})

describe('CampusesSection', () => {
  it('地址、电话（tel: 链接）、开放时间；“查看校区”链接到 /campuses/{slug}', () => {
    render(<CampusesSection section={list([campus()], '校区分布')} />)
    const region = screen.getByRole('region', { name: '校区分布' })
    expect(within(region).getByRole('heading', { level: 3 }).textContent).toBe('北京海淀校区')
    expect(within(region).getByRole('link', { name: '010-0000-0001' }).getAttribute('href')).toBe(
      'tel:01000000001',
    )
    expect(region.textContent).toContain('北京市海淀区示例路 1 号')
    expect(region.textContent).toContain('周一至周日 9:00–21:00')
    const detail = within(region).getByRole('link', { name: '查看校区：北京海淀校区' })
    expect(detail.getAttribute('href')).toBe('/campuses/beijing-haidian')
  })

  it('有坐标时“在地图中打开”外链到高德（新窗口、noopener noreferrer，名称以可见文字开头）', () => {
    render(<CampusesSection section={list([campus()], '校区分布')} />)
    const map = screen.getByRole('link', { name: /^在地图中打开：北京海淀校区/ })
    expect(map.getAttribute('href')).toMatch(/^https:\/\/uri\.amap\.com\/marker\?/)
    expect(map.getAttribute('target')).toBe('_blank')
    expect(map.getAttribute('rel')).toBe('noopener noreferrer')
    expect(map.textContent).toBe('在地图中打开')
  })

  it('没有坐标时不显示地图链接；没有电话时不显示电话', () => {
    render(
      <CampusesSection
        section={list([campus({ mapUrl: null, phone: null, phoneHref: null })], '校区分布')}
      />,
    )
    expect(screen.queryByRole('link', { name: /在地图中打开/ })).toBeNull()
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    expect(screen.getByRole('link', { name: '查看校区：北京海淀校区' })).toBeTruthy()
  })
})

describe('ArticlesSection', () => {
  it('标题与分类 Tab；“查看全部资讯”链接到 /articles', () => {
    render(
      <ArticlesSection
        section={{
          heading: heading({ title: '最新资讯', description: null }),
          items: [
            {
              id: 1,
              slug: 'a',
              title: '资讯 A',
              excerpt: '',
              publishedAt: '2026-11-22T04:00:00.000Z',
              category: { id: 1, name: '学院新闻', slug: 'news' },
              cover: null,
            },
            {
              id: 2,
              slug: 'b',
              title: '资讯 B',
              excerpt: '',
              publishedAt: '2026-11-20T04:00:00.000Z',
              category: { id: 2, name: '学习干货', slug: 'learning' },
              cover: null,
            },
          ],
          categories: [
            { id: 1, name: '学院新闻', slug: 'news' },
            { id: 2, name: '学习干货', slug: 'learning' },
          ],
        }}
      />,
    )
    const region = screen.getByRole('region', { name: '最新资讯' })
    expect(within(region).getByRole('tablist', { name: '资讯分类' })).toBeTruthy()
    expect(
      within(region)
        .getAllByRole('link', { name: '查看全部资讯' })
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/articles', '/articles'])
  })
})

describe('桌面端悬浮操作栏让位', () => {
  it('区块 5–11 的版心都给悬浮栏让位（lg:avoid-floating-actions），右缘与其它区块对齐', async () => {
    const teachers = [teacherListItem()]
    const sections: [string, React.ReactElement][] = [
      ['学员作品', <WorksSection key="w" section={list([workCard()], '学员作品')} />],
      ['学员故事', <StoriesSection key="s" section={list([story()], '学员故事')} />],
      ['合作企业', <PartnersSection key="p" section={list([partner(1, '企业 1')], '合作企业')} />],
      ['师资团队', <TeachersSection key="t" section={list(teachers, '师资团队')} />],
      ['校区分布', <CampusesSection key="c" section={list([campus()], '校区分布')} />],
      [
        '最新资讯',
        <ArticlesSection
          key="a"
          section={{ heading: heading({ title: '最新资讯' }), items: [], categories: [] }}
        />,
      ],
      [
        '预约试听',
        await LeadSection({
          section: { heading: heading({ title: '预约试听' }), submitLabel: '提交' },
          config: leadConfig,
        }),
      ],
    ]
    for (const [name, element] of sections) {
      render(element)
      const region = screen.getByRole('region', { name })
      expect(containerOf(region).className, name).toContain(HOME_CONTAINER_CLASS)
      expect(containerOf(region).className, name).toContain('container-site')
      cleanup()
    }
  })
})

describe('LeadSection', () => {
  const section = {
    heading: heading({ title: '预约一节免费试听课' }),
    submitLabel: '马上预约',
  }

  it('深色区块，带 data-page-end-cta；页内表单 position=home_form、intent=trial，按钮文字来自后台', async () => {
    render(await LeadSection({ section, config: leadConfig }))
    const region = screen.getByRole('region', { name: '预约一节免费试听课' })
    expect(region.className).toContain('surface-dark')
    expect(region.hasAttribute('data-page-end-cta')).toBe(true)
    const form = region.querySelector('form')
    expect(form?.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe('home_form')
    expect(form?.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('trial')
    expect(within(region).getByRole('button', { name: '马上预约' })).toBeTruthy()
    expect(
      within(region)
        .getByRole('link', { name: /400-000-0000/ })
        .getAttribute('href'),
    ).toBe('tel:4000000000')
  })

  it('不传 config 时自己读取留资表单配置；没有热线时不显示热线', async () => {
    vi.mocked(getLeadFormConfig).mockResolvedValueOnce({ ...leadConfig, hotline: null })
    render(await LeadSection({ section }))
    expect(getLeadFormConfig).toHaveBeenCalledTimes(1)
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    expect(screen.getByRole('button', { name: '马上预约' })).toBeTruthy()
  })
})
