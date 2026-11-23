// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import type { CoursePagesSettings, DisciplineDetail } from '@/lib/course/types'

import { BEIJING, courseCard, disciplineRef, SHANGHAI } from '../helpers/course-fixtures'

/**
 * 专业方向页主体的输出（jsdom）：首屏、区块按内容取舍、标题层级、结尾表单的来源与专业。
 * 响应式、真实数据与线索入库由 e2e（tests/e2e/majors.e2e.spec.ts）覆盖。
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
const { MajorView } = await import('@/components/course/major/major-view')

const leadConfig: LeadFormConfig = {
  disciplines: [
    { id: 1, name: '三维动画' },
    { id: 2, name: '游戏美术' },
  ],
  cities: ['北京'],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const settings: CoursePagesSettings = {
  list: { title: '专业课程', description: null, seo: null },
  detail: { sidebarTitle: '预约免费试听', sidebarDescription: null },
  major: { ctaTitle: '不确定这个方向适不适合你？', ctaDescription: '先听一节课再决定。' },
}

const NOW = new Date('2026-11-23T02:00:00.000Z')

const intro = {
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
        children: [{ type: 'text', text: '三维动画是什么', version: 1, format: 0 }],
      },
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: '在虚拟空间里搭建角色与场景。', version: 1, format: 0 }],
      },
    ],
  },
} satisfies DisciplineDetail['intro']

function discipline(overrides: Partial<DisciplineDetail> = {}): DisciplineDetail {
  return {
    ...disciplineRef({ id: 2, name: '游戏美术', shortName: '游戏美术', slug: 'game-art' }),
    tagline: '为游戏世界塑造角色与场景',
    heroImage: { src: '/api/media/file/hero.webp', alt: '', width: 1600, height: 900 },
    shareImage: null,
    intro,
    careerDirections: [{ title: '游戏角色模型师', description: '负责角色模型与贴图。' }],
    salary: {
      range: '7,000–13,000 元/月',
      source: '示例数据（虚构）',
      statDate: '2026 年 9 月',
      note: null,
      disclaimer: '以上薪资数据仅供参考，不作为培训效果承诺。',
    },
    courses: [
      courseCard({
        id: 11,
        slug: 'game-art-career',
        title: '游戏美术长期就业班',
        classType: 'long_term',
        deliveryModes: ['offline', 'dual'],
        campuses: [SHANGHAI, BEIJING],
      }),
      courseCard({
        id: 12,
        slug: 'game-props',
        title: '游戏道具提升班',
        classType: 'short_term',
        deliveryModes: ['online'],
        campuses: [],
      }),
    ],
    works: [
      { id: 1, title: '《山间驿站》场景', cover: null, authorName: '小林', cohortLabel: '2026 届' },
    ],
    teachers: [
      {
        id: 1,
        slug: 'lin',
        name: '林老师',
        title: '游戏美术讲师',
        avatar: null,
        yearsOfExperience: 10,
        specialties: ['角色建模'],
      },
    ],
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

function renderView(data: DisciplineDetail) {
  return render(
    <LeadDialogProvider config={leadConfig}>
      <MajorView discipline={data} settings={settings} leadConfig={leadConfig} now={NOW} />
    </LeadDialogProvider>,
  )
}

function section(id: string): HTMLElement | null {
  return document.getElementById(id)
}

describe('MajorView', () => {
  it('首屏：面包屑经课程列表到当前专业，h1 为专业名，显示定位与汇总概况', () => {
    renderView(discipline())
    expect(screen.getByRole('heading', { level: 1, name: '游戏美术' })).toBeTruthy()
    expect(screen.getByText('为游戏世界塑造角色与场景')).toBeTruthy()

    const breadcrumbs = screen.getByRole('navigation', { name: '面包屑' })
    expect(within(breadcrumbs).getByRole('link', { name: '专业课程' }).getAttribute('href')).toBe(
      '/courses',
    )
    expect(within(breadcrumbs).getByText('游戏美术').getAttribute('aria-current')).toBe('page')

    const facts = section('major-title')!.closest('section')!.querySelector('dl')!
    // 取值之间的“/”前是不换行空格（换行时“/”不落到行首），比较时按普通空格处理
    expect(facts.textContent).toContain('长期就业班\u00a0/ 短期提升班')
    const text = facts.textContent!.replace(/\u00a0/g, ' ')
    expect(text).toContain('2 门')
    expect(text).toContain('长期就业班 / 短期提升班')
    expect(text).toContain('线下面授 / 线上直播 / 双师课堂')
    expect(text).toContain('北京 / 上海')
  })

  it('首屏开课城市：没有已发布校区时，全部课程纯线上显示“线上”，否则显示“待定”', () => {
    const cityFact = () =>
      within(section('major-title')!.closest('section')!.querySelector('dl')!).getByText(
        '开课城市',
        { selector: 'dt' },
      ).nextElementSibling!.textContent

    renderView(
      discipline({
        courses: [
          courseCard({ id: 21, deliveryModes: ['offline'], campuses: [] }),
          courseCard({ id: 22, slug: 'b', deliveryModes: ['online'], campuses: [] }),
        ],
      }),
    )
    expect(cityFact()).toBe('待定')
    cleanup()

    renderView(
      discipline({ courses: [courseCard({ id: 23, deliveryModes: ['online'], campuses: [] })] }),
    )
    expect(cityFact()).toBe('线上')
  })

  it('首屏两个按钮：预约试听与领取学习资料，弹窗带专业方向与 major_hero 位置', async () => {
    renderView(discipline())
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '领取学习资料' }))
    })
    const dialog = screen.getByRole('dialog', { name: '领取学习资料' })
    const form = dialog.querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('materials')
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe('major_hero')
    expect(form.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe('2')
    expect(within(dialog).getByText(/游戏美术方向的学习资料/)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: '领取资料' })).toBeTruthy()
  })

  it('专业介绍：区块标题 h2，正文小标题降为 h3', () => {
    renderView(discipline())
    const intro = section('major-intro')!
    expect(within(intro).getByRole('heading', { level: 2, name: '专业介绍' })).toBeTruthy()
    expect(within(intro).getByRole('heading', { level: 3, name: '三维动画是什么' })).toBeTruthy()
  })

  it('发展方向与薪资参考：薪资卡显示来源、统计时间与免责声明', () => {
    renderView(discipline())
    const careers = section('major-careers')!
    expect(within(careers).getByRole('heading', { level: 2, name: '发展方向' })).toBeTruthy()
    expect(within(careers).getByRole('heading', { level: 3, name: '游戏角色模型师' })).toBeTruthy()
    expect(within(careers).getByText('7,000–13,000 元/月')).toBeTruthy()
    expect(within(careers).getByText('数据来源：示例数据（虚构）')).toBeTruthy()
    expect(within(careers).getByText('统计时间：2026 年 9 月')).toBeTruthy()
    expect(within(careers).getByText('以上薪资数据仅供参考，不作为培训效果承诺。')).toBeTruthy()
  })

  it('没有薪资数据时不显示薪资卡；发展方向与薪资都没有时整块不渲染', () => {
    renderView(discipline({ salary: null }))
    expect(within(section('major-careers')!).queryByText('薪资参考')).toBeNull()
    cleanup()
    renderView(discipline({ salary: null, careerDirections: [] }))
    expect(section('major-careers')).toBeNull()
  })

  it('开设课程：课程卡片标题 h3 链接到课程详情，标题下显示课程数', () => {
    renderView(discipline())
    const courses = section('major-courses')!
    expect(within(courses).getByText('共 2 门课程')).toBeTruthy()
    const title = within(courses).getByRole('heading', { level: 3, name: '游戏美术长期就业班' })
    expect(within(title).getByRole('link').getAttribute('href')).toBe('/courses/game-art-career')
    expect(
      within(courses)
        .getByRole('link', { name: /全部专业课程/ })
        .getAttribute('href'),
    ).toBe('/courses')
  })

  it('没有课程时显示说明，不显示首屏概况', () => {
    renderView(discipline({ courses: [] }))
    expect(within(section('major-courses')!).getByText(/课程正在更新中/)).toBeTruthy()
    expect(section('major-title')!.closest('section')!.querySelector('dl')).toBeNull()
  })

  it('作品（深色区块）与讲师有内容时显示，空时整块不渲染', () => {
    renderView(discipline())
    expect(section('major-works')!.className).toContain('surface-dark')
    expect(within(section('major-works')!).getByText('《山间驿站》场景')).toBeTruthy()
    expect(within(section('major-teachers')!).getByRole('heading', { name: '林老师' })).toBeTruthy()
    cleanup()
    renderView(discipline({ works: [], teachers: [] }))
    expect(section('major-works')).toBeNull()
    expect(section('major-teachers')).toBeNull()
  })

  it('专业介绍为空编辑器时不渲染介绍区块', () => {
    const empty = {
      root: {
        ...intro.root,
        children: [{ type: 'paragraph', version: 1, children: [] }],
      },
    }
    renderView(discipline({ intro: empty }))
    expect(section('major-intro')).toBeNull()
    cleanup()
    renderView(discipline({ intro: null }))
    expect(section('major-intro')).toBeNull()
  })

  it('结尾行动号召：标题来自后台设置，表单 position=major_cta 并预选本专业，标记页面以表单收尾', () => {
    renderView(discipline())
    const cta = section('major-cta')!
    expect(cta.hasAttribute('data-page-end-cta')).toBe(true)
    expect(
      within(cta).getByRole('heading', { level: 2, name: '不确定这个方向适不适合你？' }),
    ).toBeTruthy()
    expect(within(cta).getByText('先听一节课再决定。')).toBeTruthy()
    const form = cta.querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe('major_cta')
    expect(form.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe('2')
    expect(form.querySelector('input[name="course"]')).toBeNull()
  })

  it('紧挨深色作品区块时，结尾行动号召上方加分隔线', () => {
    renderView(discipline({ teachers: [] }))
    expect(section('major-cta')!.className).toContain('border-t')
    cleanup()
    renderView(discipline())
    expect(section('major-cta')!.className).not.toContain('border-t')
  })

  it('标题层级不跳级：h1 之后只有 h2 / h3', () => {
    const { container } = renderView(discipline())
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
