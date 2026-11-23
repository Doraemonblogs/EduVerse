// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ArticleCardData } from '@/lib/articles/types'
import type { CampusCardData, CampusPhoto } from '@/lib/campuses/types'

/**
 * M6 通用组件（jsdom）：资讯卡片（row / card 两种变体）、校区卡片（首页与校区列表共用）、
 * 通用灯箱（作品图集之外的用法：校区环境照片）。首页上的行为由 home-bottom-sections / home e2e 覆盖。
 */
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

const { ArticleCard } = await import('@/components/articles/article-card')
const { CampusCard } = await import('@/components/campuses/campus-card')
const { StoryCard } = await import('@/components/careers/story-card')
const { PartnerWall } = await import('@/components/careers/partner-wall')
const { Lightbox, LightboxTrigger } = await import('@/components/common/lightbox')

afterEach(cleanup)

const article = (overrides: Partial<ArticleCardData> = {}): ArticleCardData => ({
  id: 12,
  slug: 'maya-basics',
  title: 'Maya 入门：从界面到第一个模型',
  excerpt: '零基础也能跟上的建模入门。',
  cover: { src: '/api/media/file/a-800.webp', alt: '', width: 800, height: 500 },
  category: { id: 1, name: '学习干货', slug: 'guide' },
  publishedAt: '2026-11-20T17:00:00.000Z', // 北京时间 11 月 21 日 1:00
  views: 12_345,
  authorName: '教研中心',
  ...overrides,
})

describe('ArticleCard', () => {
  it('card：整张卡片链接到详情，名称为标题，说明含分类、北京时间日期、作者与阅读量', () => {
    render(
      <ul>
        <li>
          <ArticleCard article={article()} />
        </li>
      </ul>,
    )
    const link = screen.getByRole('link', { name: 'Maya 入门：从界面到第一个模型' })
    expect(link.getAttribute('href')).toBe('/articles/maya-basics')
    expect(within(link).getByRole('heading', { level: 3 }).textContent).toBe(
      'Maya 入门：从界面到第一个模型',
    )
    const describedBy = link.getAttribute('aria-describedby')!.split(' ')
    const description = describedBy.map((id) => document.getElementById(id)?.textContent).join(' ')
    expect(description).toContain('学习干货')
    expect(description).toContain('2026年11月21日')
    expect(description).toContain('1.2万 次阅读')
    expect(description).toContain('教研中心')
    expect(link.querySelector('time')?.getAttribute('dateTime')).toBe('2026-11-21')
    // 封面没有替代文字时用标题；默认懒加载
    const image = link.querySelector('img')!
    expect(image.getAttribute('alt')).toBe('Maya 入门：从界面到第一个模型')
    expect(image.getAttribute('loading')).toBe('lazy')
  })

  it('card：可指定标题层级与首屏预加载；没有阅读量与作者时不输出统计行', () => {
    render(
      <ArticleCard
        article={{ ...article(), views: undefined, authorName: null }}
        headingLevel="h2"
        preload
      />,
    )
    const link = screen.getByRole('link')
    expect(within(link).getByRole('heading', { level: 2 })).toBeTruthy()
    expect(link.getAttribute('aria-describedby')?.split(' ')).toHaveLength(1)
    expect(link.textContent).not.toContain('次阅读')
    expect(link.querySelector('img')?.getAttribute('loading')).not.toBe('lazy')
  })

  it('card：阅读量为 0 时不显示“0 次阅读”，只保留作者；没有作者时整行不输出', () => {
    const { unmount } = render(<ArticleCard article={article({ views: 0 })} />)
    const link = screen.getByRole('link')
    const describedBy = link.getAttribute('aria-describedby')!.split(' ')
    expect(describedBy).toHaveLength(2)
    expect(document.getElementById(describedBy[1]!)?.textContent).toBe('作者：教研中心')
    expect(link.textContent).not.toContain('次阅读')
    unmount()

    render(<ArticleCard article={article({ views: 0, authorName: null })} />)
    expect(screen.getByRole('link').getAttribute('aria-describedby')?.split(' ')).toHaveLength(1)
    expect(screen.getByRole('link').textContent).not.toContain('次阅读')
  })

  it('row：首页资讯列表行（缩略图 96 / 160px、分类 · 日期、标题），没有分类时只显示日期', () => {
    render(<ArticleCard article={article({ category: null })} variant="row" />)
    const link = screen.getByRole('link', { name: 'Maya 入门：从界面到第一个模型' })
    expect(link.getAttribute('aria-describedby')?.split(' ')).toHaveLength(1)
    expect(link.querySelector('img')?.getAttribute('sizes')).toBe('(min-width: 640px) 160px, 96px')
    expect(link.textContent).not.toContain('学习干货')
    expect(link.textContent).not.toContain('次阅读')
  })
})

const campus = (overrides: Partial<CampusCardData> = {}): CampusCardData => ({
  id: 3,
  name: '北京海淀校区',
  slug: 'beijing-haidian',
  city: '北京',
  address: '北京市海淀区示例路 1 号（示例地址）',
  phone: '010-0000 0000',
  phoneHref: 'tel:01000000000',
  openingHours: '周一至周日 9:00–21:00',
  cover: { src: '/api/media/file/c-800.webp', alt: '', width: 800, height: 450 },
  mapUrl: 'https://uri.amap.com/marker?position=116.31,39.99&name=x',
  ...overrides,
})

describe('CampusCard', () => {
  it('地址、电话（tel:）、开放时间；“查看校区”进入详情，“在地图中打开”新窗口打开高德地图', () => {
    render(<CampusCard campus={campus()} imageSizes="400px" />)
    const card = screen.getByRole('article')
    expect(within(card).getByRole('heading', { level: 3, name: '北京海淀校区' })).toBeTruthy()
    expect(within(card).getByRole('link', { name: '010-0000 0000' }).getAttribute('href')).toBe(
      'tel:01000000000',
    )
    expect(
      within(card).getByRole('link', { name: '查看校区：北京海淀校区' }).getAttribute('href'),
    ).toBe('/campuses/beijing-haidian')
    const map = within(card).getByRole('link', { name: /^在地图中打开：北京海淀校区/ })
    expect(map.getAttribute('target')).toBe('_blank')
    expect(map.getAttribute('rel')).toBe('noopener noreferrer')
    const image = card.querySelector('img')!
    expect(image.getAttribute('sizes')).toBe('400px')
    expect(image.getAttribute('loading')).toBe('lazy')
  })

  it('标题层级可改为 h2；首屏卡片预加载封面；没有坐标、电话时不显示对应内容', () => {
    render(
      <CampusCard
        campus={campus({ mapUrl: null, phone: null, phoneHref: null })}
        imageSizes="100vw"
        headingLevel="h2"
        preload
      />,
    )
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /在地图中打开/ })).toBeNull()
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    expect(document.querySelector('img')?.getAttribute('loading')).not.toBe('lazy')
  })
})

describe('StoryCard / PartnerWall（首页与就业服务页共用）', () => {
  it('学员故事卡片：化名为标题，岗位 · 公司，课程链接；可在底部追加内容（如展开正文）', () => {
    render(
      <StoryCard
        story={{
          id: 1,
          displayName: '小鹿',
          background: '会计转行',
          avatar: null,
          currentRole: 'UI 设计师',
          companyName: '星槎网络科技',
          quote: '从零开始学设计',
          course: { title: 'UI/UX 设计长期班', slug: 'ui-career' },
        }}
        headingLevel="h4"
      >
        <button type="button">阅读完整故事</button>
      </StoryCard>,
    )
    const card = screen.getByRole('article')
    expect(within(card).getByRole('heading', { level: 4, name: '小鹿' })).toBeTruthy()
    expect(card.textContent).toContain('UI 设计师\u00a0· 星槎网络科技')
    expect(within(card).getByRole('link', { name: 'UI/UX 设计长期班' }).getAttribute('href')).toBe(
      '/courses/ui-career',
    )
    // 追加内容在卡片最后
    expect(card.lastElementChild?.textContent).toBe('阅读完整故事')
    expect(card.textContent).not.toMatch(/薪|元\/月/)
  })

  it('Logo 墙：列表有名称，Logo 的 alt 为企业名，不链接外站', () => {
    render(
      <PartnerWall
        partners={[
          {
            id: 1,
            name: '星槎网络科技',
            industry: '游戏',
            logo: { src: '/api/media/file/l.webp', alt: '星槎网络科技', width: 400, height: 200 },
          },
        ]}
      />,
    )
    const list = screen.getByRole('list', { name: '合作企业名单' })
    expect(within(list).getByRole('img', { name: '星槎网络科技' })).toBeTruthy()
    expect(document.querySelector('a')).toBeNull()
  })
})

const photo = (n: number, caption: string | null = `环境 ${n}`): CampusPhoto => ({
  image: { src: `/api/media/file/p${n}-1920.webp`, alt: '', width: 1920, height: 1080 },
  thumb: { src: `/api/media/file/p${n}-400.webp`, alt: '', width: 400, height: 225 },
  caption,
})

describe('Lightbox（通用）', () => {
  it('标题由使用方传入；图片没有替代文字时用标题；占位缩略图用传入的 sizes；关闭后焦点回到触发按钮', async () => {
    render(
      <Lightbox items={[photo(1), photo(2, null)]} title="北京海淀校区" thumbSizes="160px">
        <LightboxTrigger index={1} label="查看第 2 张环境照片">
          <span>缩略图</span>
        </LightboxTrigger>
      </Lightbox>,
    )
    const opener = await screen.findByRole('button', { name: '查看第 2 张环境照片' })
    await waitFor(() => expect(opener.hasAttribute('disabled')).toBe(false))
    opener.focus()
    fireEvent.click(opener)

    const dialog = await screen.findByRole('dialog', { name: '北京海淀校区' })
    expect(dialog.getAttribute('data-slot')).toBe('lightbox')
    expect(dialog.textContent).toContain('2 / 2')
    expect(within(dialog).getByRole('img', { name: '北京海淀校区' })).toBeTruthy()
    const placeholder = dialog.querySelector('img[aria-hidden="true"]')
    expect(placeholder?.getAttribute('sizes')).toBe('160px')

    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(dialog.textContent).toContain('1 / 2')
    expect(within(dialog).getByText('环境 1')).toBeTruthy()

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: '关闭大图' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })
})
