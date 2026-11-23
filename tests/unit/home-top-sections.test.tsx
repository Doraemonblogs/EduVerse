// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HOME_CONTAINER_CLASS } from '@/components/home/rhythm'
import type { LeadFormConfig } from '@/components/lead/types'
import type {
  HomeDiscipline,
  HomeListSection,
  HomeQuickEntry,
  HomeSectionHeading,
} from '@/lib/home/types'

import { courseCard, DEFAULT_COURSE_ID } from '../helpers/course-fixtures'

/**
 * 首页区块 2–4（快速了解、热门专业、精选课程）的输出（jsdom）：链接去向、外链新窗口、留资位置与意向、
 * 标题层级与 id。版式与横滑由 e2e 覆盖。
 */
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction: vi.fn() }))
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

const { LeadDialogProvider } = await import('@/components/lead/lead-dialog')
const { QuickEntries } = await import('@/components/home/top/quick-entries')
const { HotDisciplines } = await import('@/components/home/top/hot-disciplines')
const { CoursesRail } = await import('@/components/home/top/courses-rail')

const config: LeadFormConfig = {
  disciplines: [],
  cities: [],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const withProvider = (ui: React.ReactNode) =>
  render(<LeadDialogProvider config={config}>{ui}</LeadDialogProvider>)

const heading = (title: string, overrides: Partial<HomeSectionHeading> = {}) => ({
  eyebrow: 'Eyebrow',
  title,
  description: null,
  ...overrides,
})

/** 打开的留资弹窗里表单的隐藏字段 */
function dialogField(name: string) {
  const form = screen.getByRole('dialog').querySelector('form')!
  return form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value
}

describe('QuickEntries', () => {
  const section: HomeListSection<HomeQuickEntry> = {
    heading: heading('从这里开始'),
    items: [
      {
        id: 'a',
        title: '职业方向测试',
        description: '10 道题，找到适合你的方向',
        image: null,
        action: { kind: 'link', link: { href: '/quiz', external: false } },
      },
      {
        id: 'b',
        title: '行业公开课',
        description: null,
        image: { src: '/api/media/file/icon.webp', alt: '图标', width: 400, height: 400 },
        action: { kind: 'link', link: { href: 'https://example.com/live', external: true } },
      },
      {
        id: 'c',
        title: '预约试听',
        description: '到校区或线上听一节课',
        image: null,
        action: { kind: 'lead' },
      },
    ],
  }

  it('区块标题为 h2（带 id），入口卡片按顺序编号', () => {
    const { container } = withProvider(<QuickEntries section={section} />)
    const title = screen.getByRole('heading', { level: 2, name: '从这里开始' })
    expect(title.id).toBe('home-quick-entries-title')
    expect(container.querySelector('section')?.getAttribute('aria-labelledby')).toBe(title.id)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]!.textContent).toContain('01')
    expect(items[2]!.textContent).toContain('03')
  })

  it('站内链接整张卡片可点；外链新窗口打开并提示；有配图时显示配图（装饰性）而不是序号', () => {
    withProvider(<QuickEntries section={section} />)
    const internal = screen.getByRole('link', { name: /职业方向测试/ })
    expect(internal.getAttribute('href')).toBe('/quiz')
    expect(internal.getAttribute('target')).toBeNull()

    const external = screen.getByRole('link', { name: /行业公开课/ })
    expect(external.getAttribute('href')).toBe('https://example.com/live')
    expect(external.getAttribute('target')).toBe('_blank')
    expect(external.getAttribute('rel')).toBe('noopener noreferrer')
    expect(external.textContent).toContain('（在新窗口打开）')
    expect(external.querySelector('img')?.getAttribute('alt')).toBe('')
    expect(external.textContent).not.toContain('02')
  })

  it('“打开预约弹窗”的入口：position home_quick、意向为咨询', async () => {
    withProvider(<QuickEntries section={section} />)
    const button = screen.getByRole('button', { name: /预约试听/ })
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    await act(async () => {
      fireEvent.click(button)
    })
    expect(dialogField('position')).toBe('home_quick')
    expect(dialogField('intent')).toBe('consult')
  })
})

describe('HotDisciplines', () => {
  const discipline = (overrides: Partial<HomeDiscipline>): HomeDiscipline => ({
    id: 1,
    name: '三维动画',
    shortName: '三维动画',
    slug: '3d-animation',
    tagline: '从建模到表演，让角色在镜头里活起来',
    cover: { src: '/api/media/file/d.webp', alt: '三维动画封面', width: 800, height: 450 },
    courseCount: 3,
    ...overrides,
  })
  const section: HomeListSection<HomeDiscipline> = {
    heading: heading('热门专业', { description: '每个方向都从基础讲起' }),
    items: [
      discipline({}),
      discipline({
        id: 2,
        name: '游戏美术',
        slug: 'game-art',
        tagline: null,
        cover: null,
        courseCount: 0,
      }),
    ],
  }

  it('卡片链接到专业方向页，名称为 h3 与链接名称，卖点与课程数作为描述', () => {
    withProvider(<HotDisciplines section={section} />)
    expect(screen.getByRole('heading', { level: 2, name: '热门专业' }).id).toBe(
      'home-hot-disciplines-title',
    )
    const card = screen.getByRole('link', { name: '三维动画' })
    expect(card.getAttribute('href')).toBe('/majors/3d-animation')
    expect(within(card).getByRole('heading', { level: 3, name: '三维动画' })).toBeTruthy()
    const description = card
      .getAttribute('aria-describedby')!
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
    expect(description).toEqual(['从建模到表演，让角色在镜头里活起来', '3 门课程'])
  })

  it('没有卖点 / 封面 / 可公开课程时不显示对应内容', () => {
    withProvider(<HotDisciplines section={section} />)
    const card = screen.getByRole('link', { name: '游戏美术' })
    expect(card.getAttribute('aria-describedby')).toBeNull()
    expect(card.querySelector('img')).toBeNull()
    expect(card.textContent).not.toContain('门课程')
  })

  it('“查看全部课程”链接到课程列表（桌面在标题旁、移动端在区块末尾）', () => {
    withProvider(<HotDisciplines section={section} />)
    const links = screen.getAllByRole('link', { name: /查看全部课程/ })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link.getAttribute('href')).toBe('/courses')
  })
})

describe('CoursesRail', () => {
  const section = {
    heading: heading('长期就业班'),
    items: [
      courseCard(),
      courseCard({ id: 11, slug: 'game-art-career', title: '游戏美术长期就业班' }),
    ],
  }
  const now = new Date('2026-11-23T00:30:00.000Z')

  it('课程卡片放进带名称的横滑列表，课程名为 h3', () => {
    withProvider(<CoursesRail section={section} now={now} />)
    expect(screen.getByRole('heading', { level: 2, name: '长期就业班' }).id).toBe(
      'home-courses-title',
    )
    const rail = screen.getByRole('list', { name: '长期就业班' })
    expect(rail.tagName).toBe('UL')
    expect(
      within(rail)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['三维动画设计长期就业班', '游戏美术长期就业班'])
    for (const link of screen.getAllByRole('link', { name: /查看全部课程/ })) {
      expect(link.getAttribute('href')).toBe('/courses')
    }
  })

  it('“预约试听”的留资位置为 home_course，带课程', async () => {
    withProvider(<CoursesRail section={section} now={now} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '预约试听：三维动画设计长期就业班' }))
    })
    expect(dialogField('position')).toBe('home_course')
    expect(dialogField('intent')).toBe('trial')
    expect(dialogField('course')).toBe(String(DEFAULT_COURSE_ID))
  })
})

describe('桌面端悬浮操作栏让位', () => {
  it('区块 2–4 的版心都给悬浮栏让位（lg:avoid-floating-actions），与其它区块右缘对齐', () => {
    const quick: HomeListSection<HomeQuickEntry> = {
      heading: heading('从这里开始'),
      items: [
        { id: 'a', title: '预约试听', description: null, image: null, action: { kind: 'lead' } },
      ],
    }
    const disciplines: HomeListSection<HomeDiscipline> = {
      heading: heading('热门专业'),
      items: [
        {
          id: 1,
          name: '三维动画',
          shortName: '三维动画',
          slug: '3d-animation',
          tagline: null,
          cover: null,
          courseCount: 0,
        },
      ],
    }
    const sections: [string, React.ReactElement][] = [
      ['从这里开始', <QuickEntries key="q" section={quick} />],
      ['热门专业', <HotDisciplines key="d" section={disciplines} />],
      [
        '长期就业班',
        <CoursesRail key="c" section={{ heading: heading('长期就业班'), items: [courseCard()] }} />,
      ],
    ]
    for (const [name, element] of sections) {
      withProvider(element)
      const container = screen.getByRole('region', { name }).firstElementChild as HTMLElement
      expect(container.className, name).toContain(HOME_CONTAINER_CLASS)
      expect(container.className, name).toContain('container-site')
      cleanup()
    }
  })
})
