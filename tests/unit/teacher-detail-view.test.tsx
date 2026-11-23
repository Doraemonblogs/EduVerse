// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import type { TeacherDetail, TeacherPagesSettings } from '@/lib/teachers/types'

import { courseCard } from '../helpers/course-fixtures'
import { ANIMATION, GAME, workCard } from '../helpers/work-fixtures'

/**
 * 讲师详情页主体与讲师列表空状态的输出（jsdom）：首屏概况与链接、区块按内容取舍、标题层级、
 * 从业经历时间线、作品链接、结尾表单的来源与专业。真实数据、响应式与线索入库由
 * e2e（tests/e2e/teachers.e2e.spec.ts）覆盖。
 */
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    scroll: _scroll,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const { LeadDialogProvider } = await import('@/components/lead/lead-dialog')
const { TeacherDetailView } = await import('@/components/teachers/teacher-detail-view')
const { TeacherListEmpty } = await import('@/components/teachers/teacher-list-empty')

const leadConfig: LeadFormConfig = {
  disciplines: [
    { id: 7, name: '三维动画' },
    { id: 2, name: '游戏美术' },
  ],
  cities: ['北京'],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const settings: TeacherPagesSettings = {
  list: { title: '师资团队', description: null, seo: null },
  detail: { ctaTitle: '想听这位讲师的课？', ctaDescription: '先预约一节试听课。' },
}

const NOW = new Date('2026-11-23T02:00:00.000Z')

const bio = {
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'heading',
        tag: 'h2',
        version: 1,
        children: [{ type: 'text', text: '教学理念', version: 1, format: 0 }],
      },
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: '先理解表演，再追求技巧。', version: 1, format: 0 }],
      },
    ],
  },
} satisfies TeacherDetail['bio']

function teacher(overrides: Partial<TeacherDetail> = {}): TeacherDetail {
  return {
    id: 5,
    slug: 'lin-yuqing',
    name: '林雨晴',
    title: '三维动画教研负责人',
    avatar: { src: '/api/media/file/t-600x600.webp', alt: '林老师头像', width: 600, height: 600 },
    shareImage: null,
    yearsOfExperience: 12,
    campus: { name: '中关村校区', city: '北京' },
    disciplines: [ANIMATION, GAME],
    specialties: ['角色表演动画', '镜头语言与分镜'],
    bio,
    experience: [
      { period: '2014–2018', org: '长风动画工作室', role: '角色动画师' },
      { period: null, org: '蓝桉影业动画部', role: '动画组长' },
    ],
    courses: [courseCard({ id: 11, slug: '3d-animation-career', title: '三维动画设计长期就业班' })],
    works: [workCard({ id: 41, title: '《灯塔守望者》角色动画短片' })],
    seo: {},
    ...overrides,
  }
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

function renderView(data: TeacherDetail) {
  return render(
    <LeadDialogProvider config={leadConfig}>
      <TeacherDetailView teacher={data} settings={settings} leadConfig={leadConfig} now={NOW} />
    </LeadDialogProvider>,
  )
}

const byId = (id: string) => document.getElementById(id)
const hero = () => byId('teacher-title')!.closest('section')!

describe('TeacherDetailView', () => {
  it('首屏：面包屑经讲师列表到当前讲师，h1 为姓名，显示头衔与头像', () => {
    renderView(teacher())
    expect(screen.getByRole('heading', { level: 1, name: '林雨晴' })).toBeTruthy()
    expect(within(hero()).getByText('三维动画教研负责人')).toBeTruthy()
    expect(within(hero()).getByRole('img', { name: '林老师头像' })).toBeTruthy()

    const breadcrumbs = screen.getByRole('navigation', { name: '面包屑' })
    expect(within(breadcrumbs).getByRole('link', { name: '师资团队' }).getAttribute('href')).toBe(
      '/teachers',
    )
    expect(within(breadcrumbs).getByText('林雨晴').getAttribute('aria-current')).toBe('page')
  })

  it('首屏概况：从业年限、校区（不链接）、专业方向（链接到专业页）与擅长领域标签', () => {
    renderView(teacher())
    const facts = hero().querySelector('dl')!
    const value = (label: string) =>
      within(facts).getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement

    expect(value('从业年限').textContent).toBe('12 年')
    // 校区名不以城市开头时补上城市；校区详情 M6 才上线，不链接
    expect(value('所在校区').textContent).toBe('北京·中关村校区')
    expect(within(value('所在校区')).queryByRole('link')).toBeNull()

    const links = within(value('专业方向')).getAllByRole('link')
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['三维动画', '/majors/3d-animation'],
      ['游戏美术', '/majors/game-art'],
    ])

    const tags = within(value('擅长领域')).getAllByRole('listitem')
    expect(tags.map((tag) => tag.textContent)).toEqual(['角色表演动画', '镜头语言与分镜'])
    expect(within(value('擅长领域')).queryByRole('link')).toBeNull()
  })

  it('没有校区、从业年限、专业方向、擅长领域时对应项不显示', () => {
    renderView(teacher({ campus: null, yearsOfExperience: null, disciplines: [], specialties: [] }))
    expect(hero().querySelector('dl')).toBeNull()
    expect(within(hero()).getByRole('button', { name: '预约试听' })).toBeTruthy()
  })

  it('首屏“预约试听”：弹窗 position=teacher_hero，预选讲师的第一个专业方向', async () => {
    renderView(teacher())
    await act(async () => {
      fireEvent.click(within(hero()).getByRole('button', { name: '预约试听' }))
    })
    const form = screen.getByRole('dialog').querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('trial')
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'teacher_hero',
    )
    expect(form.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe(
      String(ANIMATION.id),
    )
    expect(form.querySelector('input[name="course"]')).toBeNull()
  })

  it('个人简介：区块标题 h2，正文小标题降为 h3', () => {
    renderView(teacher())
    const section = byId('teacher-bio')!
    expect(within(section).getByRole('heading', { level: 2, name: '个人简介' })).toBeTruthy()
    expect(within(section).getByRole('heading', { level: 3, name: '教学理念' })).toBeTruthy()
    expect(within(section).getByText('先理解表演，再追求技巧。')).toBeTruthy()
  })

  it('从业经历：有序列表按录入顺序列出时间、职位与机构，时间可为空', () => {
    renderView(teacher())
    const section = byId('teacher-experience')!
    expect(within(section).getByRole('heading', { level: 2, name: '从业经历' })).toBeTruthy()
    const list = section.querySelector('ol')!
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]!.textContent).toBe('2014–2018角色动画师长风动画工作室')
    expect(items[1]!.textContent).toBe('动画组长蓝桉影业动画部')
  })

  it('简介为空编辑器、经历为空时整块不渲染；只有其一时只渲染那一块', () => {
    const empty = {
      root: { ...bio.root, children: [{ type: 'paragraph', version: 1, children: [] }] },
    }
    renderView(teacher({ bio: empty }))
    expect(byId('teacher-bio')).toBeNull()
    expect(byId('teacher-experience')).not.toBeNull()
    cleanup()
    renderView(teacher({ bio: null, experience: [] }))
    expect(byId('teacher-bio')).toBeNull()
    expect(byId('teacher-experience')).toBeNull()
  })

  it('授课课程：课程卡片标题 h3 链接到课程详情，标题下显示课程数', () => {
    renderView(teacher())
    const section = byId('teacher-courses')!
    expect(within(section).getByText('共 1 门课程')).toBeTruthy()
    const title = within(section).getByRole('heading', { level: 3, name: '三维动画设计长期就业班' })
    expect(within(title).getByRole('link').getAttribute('href')).toBe(
      '/courses/3d-animation-career',
    )
  })

  it('学员作品（深色区块）：每件作品链接到作品详情，最多 8 件，另有“查看全部作品”', () => {
    const works = Array.from({ length: 10 }, (_, i) =>
      workCard({ id: 100 + i, title: `作品 ${i + 1}` }),
    )
    renderView(teacher({ works }))
    const section = byId('teacher-works')!
    expect(section.className).toContain('surface-dark')
    const workLinks = within(section)
      .getAllByRole('link')
      .filter((link) => /\/works\/\d+$/.test(link.getAttribute('href') ?? ''))
    expect(workLinks).toHaveLength(8)
    expect(workLinks[0]!.getAttribute('href')).toBe('/works/100')
    expect(
      within(section)
        .getByRole('link', { name: /查看全部作品/ })
        .getAttribute('href'),
    ).toBe('/works')
  })

  it('没有授课课程与作品时两个区块都不渲染', () => {
    renderView(teacher({ courses: [], works: [] }))
    expect(byId('teacher-courses')).toBeNull()
    expect(byId('teacher-works')).toBeNull()
  })

  it('结尾行动号召：标题来自后台设置，表单 position=teacher_cta 并预选第一个专业方向，标记页面以表单收尾', () => {
    renderView(teacher())
    const cta = byId('teacher-cta')!
    expect(cta.hasAttribute('data-page-end-cta')).toBe(true)
    expect(within(cta).getByRole('heading', { level: 2, name: '想听这位讲师的课？' })).toBeTruthy()
    expect(within(cta).getByText('先预约一节试听课。')).toBeTruthy()
    const form = cta.querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'teacher_cta',
    )
    expect(form.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe(
      String(ANIMATION.id),
    )
  })

  it('紧挨深色作品区块时，结尾行动号召上方加分隔线', () => {
    renderView(teacher())
    expect(byId('teacher-cta')!.className).toContain('border-t')
    cleanup()
    renderView(teacher({ works: [] }))
    expect(byId('teacher-cta')!.className).not.toContain('border-t')
  })

  it('标题层级不跳级：h1 之后只有 h2 / h3', () => {
    const { container } = renderView(teacher())
    const levels = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) =>
      Number(el.tagName.slice(1)),
    )
    expect(levels[0]).toBe(1)
    levels.reduce((prev, level) => {
      expect(level - prev).toBeLessThanOrEqual(1)
      return level
    })
  })
})

describe('TeacherListEmpty', () => {
  it('筛选无结果：说明 + 清除筛选（nofollow，回到 /teachers）+ 专业课程', () => {
    render(<TeacherListEmpty filtered />)
    expect(screen.getByRole('heading', { level: 2, name: '没有符合条件的讲师' })).toBeTruthy()
    const clear = screen.getByRole('link', { name: '清除筛选' })
    expect(clear.getAttribute('href')).toBe('/teachers')
    expect(clear.getAttribute('rel')).toBe('nofollow')
    expect(screen.getByRole('link', { name: '查看专业课程' }).getAttribute('href')).toBe('/courses')
  })

  it('还没有任何讲师：不显示清除筛选', () => {
    render(<TeacherListEmpty filtered={false} />)
    expect(screen.getByRole('heading', { level: 2, name: '讲师介绍正在整理中' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: '清除筛选' })).toBeNull()
    expect(screen.getByRole('link', { name: '查看专业课程' })).toBeTruthy()
  })
})
