// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import type { CourseDetail, CoursePagesSettings } from '@/lib/course/types'

import {
  cohortItem,
  courseCard,
  courseDetail,
  DEFAULT_COURSE_ID,
  DEFAULT_DISCIPLINE_ID,
  disciplineRef,
} from '../helpers/course-fixtures'

/**
 * 课程详情页主体的输出（jsdom）：区块按内容取舍、页内导航锚点、唯一的侧栏表单、开班按日期过滤。
 * 吸顶、响应式与真实数据由 e2e（tests/e2e/course-detail.e2e.spec.ts）覆盖。
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
const { CourseDetailView } = await import('@/components/course/detail/course-detail-view')

const leadConfig: LeadFormConfig = {
  // 与课程 ID 相同的选项也存在：课程与专业的 ID 被传反时，意向专业会选中它而不是落空
  disciplines: [
    { id: DEFAULT_COURSE_ID, name: '游戏美术' },
    { id: DEFAULT_DISCIPLINE_ID, name: '三维动画' },
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
  detail: { sidebarTitle: '预约免费试听', sidebarDescription: '侧栏说明' },
  major: { ctaTitle: '不确定适不适合？', ctaDescription: null },
}

/** 渲染时刻：2026-12-01 10:00（北京时间） */
const NOW = new Date('2026-12-01T02:00:00.000Z')

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

function renderView(course: CourseDetail) {
  return render(
    <LeadDialogProvider config={leadConfig}>
      <CourseDetailView course={course} settings={settings} leadConfig={leadConfig} now={NOW} />
    </LeadDialogProvider>,
  )
}

describe('课程详情页主体', () => {
  it('首屏：课程名为 h1，面包屑链接到课程列表与专业方向页，两个按钮', () => {
    renderView(courseDetail())
    expect(screen.getByRole('heading', { level: 1, name: '三维动画设计长期就业班' })).toBeTruthy()
    const breadcrumbs = screen.getByRole('navigation', { name: '面包屑' })
    expect(within(breadcrumbs).getByRole('link', { name: '专业课程' }).getAttribute('href')).toBe(
      '/courses',
    )
    expect(within(breadcrumbs).getByRole('link', { name: '三维动画' }).getAttribute('href')).toBe(
      '/majors/3d-animation',
    )
    expect(screen.getByRole('button', { name: '咨询学费' })).toBeTruthy()
  })

  /** 首屏关键信息中某一项的取值 */
  const fact = (container: HTMLElement, label: string) =>
    within(container.querySelector('dl')!).getByText(label, { selector: 'dt' }).nextElementSibling!

  it('关键信息：时长、班型、授课方式、上课时间、开设校区（校区名已含城市时不重复）、近期开班', () => {
    const { container } = renderView(courseDetail())
    const facts = container.querySelector('dl')!
    const text = facts.textContent ?? ''
    expect(text).toContain('7 个月')
    expect(text).toContain('长期就业班')
    expect(text).toContain('线下面授\u00a0/ 双师课堂')
    expect(text).toContain('全日制（周一至周五）')
    expect(fact(container, '开设校区').textContent).toBe('北京海淀校区上海徐汇校区')
    expect(fact(container, '近期开班').textContent).toBe('2026年12月14日 · 北京海淀校区')
    expect(text).not.toContain('北京·北京海淀校区')
  })

  it('纯线上课程的开设校区显示“线上”；没有近期开班时不显示该项', () => {
    const { container } = renderView(
      courseDetail({ campuses: [], deliveryModes: ['online'], cohorts: [] }),
    )
    const facts = container.querySelector('dl')!
    expect(fact(container, '开设校区').textContent).toBe('线上')
    expect(facts.textContent).not.toContain('近期开班')
  })

  it('线下 / 双师课程暂无已发布校区时，开设校区显示“待定”而不是“线上”', () => {
    const { container } = renderView(
      courseDetail({ campuses: [], deliveryModes: ['offline', 'dual'], cohorts: [] }),
    )
    expect(fact(container, '授课方式').textContent).toContain('线下面授')
    expect(fact(container, '开设校区').textContent).toBe('待定')
  })

  it('侧栏近期开班显示校区展示名（与首屏一致）；摘要取值不在词中间换行', () => {
    renderView(courseDetail())
    const sidebar = screen.getByRole('complementary', { name: '预约免费试听' })
    const value = within(sidebar).getByText('近期开班', { selector: 'dt' }).nextElementSibling!
    expect(value.textContent).toBe('2026年12月14日 · 北京海淀校区')
    expect(value.className).toContain('break-keep')
    expect(within(sidebar).getByText('三维动画设计长期就业班').className).toContain('break-keep')
  })

  it('两栏网格从 lg 起给桌面端悬浮操作栏让出右侧位置（吸顶侧栏不会停在悬浮栏下面）', () => {
    renderView(courseDetail())
    const sidebar = screen.getByRole('complementary', { name: '预约免费试听' })
    const grid = sidebar.parentElement!
    expect(grid.className).toContain('container-site')
    expect(grid.className.split(/\s+/)).toContain('lg:avoid-floating-actions')
  })

  it('页内导航只列出有内容的区块，每个锚点都指向页面上存在的区块', () => {
    const { container } = renderView(courseDetail())
    const nav = screen.getByRole('navigation', { name: '课程内容' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      '亮点与适合人群',
      '课程大纲',
      '开班计划',
      '就业方向',
      '常见问题',
    ])
    for (const link of links) {
      const id = link.getAttribute('href')!.slice(1)
      const section = container.querySelector(`section#${id}`)
      expect(section, `#${id} 应存在`).not.toBeNull()
      expect(section!.getAttribute('aria-labelledby')).toBe(`${id}-title`)
    }
    // 没有内容的区块整块不渲染
    expect(container.querySelector('#projects')).toBeNull()
    expect(container.querySelector('#works')).toBeNull()
    expect(container.querySelector('#teachers')).toBeNull()
    expect(screen.queryByRole('heading', { name: '同专业其它课程' })).toBeNull()
  })

  it('页面上只有一份留资表单（侧栏），带课程、专业与位置 course_sidebar', () => {
    const { container } = renderView(courseDetail())
    const forms = container.querySelectorAll('form')
    expect(forms).toHaveLength(1)
    const sidebar = screen.getByRole('complementary', { name: '预约免费试听' })
    const form = sidebar.querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')!.value).toBe(
      'course_sidebar',
    )
    expect(form.querySelector<HTMLInputElement>('input[name="course"]')!.value).toBe(
      String(DEFAULT_COURSE_ID),
    )
    expect(form.querySelector<HTMLSelectElement>('select[name="discipline"]')!.value).toBe(
      String(DEFAULT_DISCIPLINE_ID),
    )
    expect(within(sidebar).getByText('侧栏说明')).toBeTruthy()
    expect(within(sidebar).getByText('三维动画设计长期就业班')).toBeTruthy()
  })

  it('首屏“预约试听”与开班计划每行的按钮：弹窗带上本课程、所属专业与各自的位置', async () => {
    renderView(courseDetail())

    /** 点击按钮，返回弹窗表单中的留资上下文，然后关闭弹窗 */
    const openContext = async (button: HTMLElement) => {
      await act(async () => {
        fireEvent.click(button)
      })
      const form = screen.getByRole('dialog').querySelector('form')!
      const context = {
        intent: form.querySelector<HTMLInputElement>('input[name="intent"]')?.value,
        position: form.querySelector<HTMLInputElement>('input[name="position"]')?.value,
        course: form.querySelector<HTMLInputElement>('input[name="course"]')?.value,
        discipline: form.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value,
      }
      await act(async () => {
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      })
      expect(screen.queryByRole('dialog')).toBeNull()
      return context
    }
    const expected = {
      course: String(DEFAULT_COURSE_ID),
      discipline: String(DEFAULT_DISCIPLINE_ID),
    }

    const hero = screen.getByRole('region', { name: '三维动画设计长期就业班' })
    expect(await openContext(within(hero).getByRole('button', { name: '预约试听' }))).toEqual({
      intent: 'trial',
      position: 'course_hero',
      ...expected,
    })
    expect(await openContext(within(hero).getByRole('button', { name: '咨询学费' }))).toEqual({
      intent: 'tuition',
      position: 'course_hero',
      ...expected,
    })

    const cohorts = screen.getByRole('region', { name: '开班计划' })
    expect(await openContext(within(cohorts).getByRole('button', { name: /^预约试听：/ }))).toEqual(
      { intent: 'trial', position: 'course_cohort', ...expected },
    )
  })

  it('开班计划只显示渲染当天及以后的开班；都已过期时显示空状态', () => {
    const past = cohortItem({ id: 7, startDate: '2026-11-20T02:00:00.000Z' })
    const today = cohortItem({ id: 8, startDate: '2026-11-30T17:00:00.000Z' }) // 北京时间 12 月 1 日 1:00
    const later = cohortItem({ id: 9, startDate: '2027-01-05T02:00:00.000Z', campus: null })
    const { unmount } = renderView(courseDetail({ cohorts: [past, today, later] }))
    const section = screen.getByRole('region', { name: '开班计划' })
    const text = section.textContent ?? ''
    expect(text).not.toContain('2026年11月20日')
    expect(text).toContain('2026年12月1日')
    expect(text).toContain('2027年1月5日')
    expect(within(section).getAllByRole('button', { name: /^预约试听：/ })).toHaveLength(2)
    unmount()

    renderView(courseDetail({ cohorts: [past] }))
    expect(
      within(screen.getByRole('region', { name: '开班计划' })).getByText(/暂无近期开班计划/),
    ).toBeTruthy()
  })

  it('有薪资参考时显示区间、来源、统计时间与免责声明；没有时不显示薪资卡', () => {
    const { unmount } = renderView(
      courseDetail({
        salary: {
          range: '7,000–13,000 元/月',
          source: '示例数据',
          statDate: '2026 年 9 月',
          note: null,
          disclaimer: '以上薪资数据仅供参考，不作为培训效果承诺。',
        },
      }),
    )
    const careers = screen.getByRole('region', { name: '就业方向' })
    expect(within(careers).getByText('7,000–13,000 元/月')).toBeTruthy()
    expect(within(careers).getByText(/示例数据/)).toBeTruthy()
    expect(within(careers).getByText(/2026 年 9 月/)).toBeTruthy()
    expect(within(careers).getByText('以上薪资数据仅供参考，不作为培训效果承诺。')).toBeTruthy()
    unmount()

    renderView(courseDetail())
    expect(screen.queryByText('薪资参考')).toBeNull()
  })

  it('同专业其它课程：课程卡片 + 链接到专业方向页', () => {
    renderView(
      courseDetail({
        related: [
          courseCard({ id: 2, slug: 'blender-3d-foundation', title: 'Blender 三维入门班' }),
        ],
        discipline: disciplineRef(),
      }),
    )
    const related = screen.getByRole('region', { name: '同专业其它课程' })
    expect(
      within(related).getByRole('heading', { level: 3, name: 'Blender 三维入门班' }),
    ).toBeTruthy()
    expect(
      within(related).getByRole('link', { name: '了解三维动画专业' }).getAttribute('href'),
    ).toBe('/majors/3d-animation')
  })

  it('实训项目、学员作品、授课讲师有内容时渲染，标题层级为 h2 → h3', () => {
    renderView(
      courseDetail({
        projects: [{ title: '毕业动画短片', description: '四到五人一组', image: null }],
        works: [
          {
            id: 3,
            title: '《雪原驿站》',
            cover: null,
            authorName: '何同学',
            cohortLabel: '2025 届',
          },
        ],
        teachers: [
          {
            id: 4,
            slug: 'lin',
            name: '林雨晴',
            title: '三维动画讲师',
            avatar: null,
            yearsOfExperience: 12,
            specialties: ['角色表演动画'],
          },
        ],
      }),
    )
    const projects = screen.getByRole('region', { name: '实训项目' })
    expect(within(projects).getByRole('heading', { level: 3, name: '毕业动画短片' })).toBeTruthy()
    expect(within(projects).getByText('项目 01')).toBeTruthy()
    expect(
      within(screen.getByRole('region', { name: '学员作品' })).getByText('《雪原驿站》'),
    ).toBeTruthy()
    const teachers = screen.getByRole('region', { name: '授课讲师' })
    expect(within(teachers).getByRole('heading', { level: 3, name: '林雨晴' })).toBeTruthy()
    // 讲师卡片整体链接到讲师详情，作品链接到作品详情
    expect(within(teachers).getByRole('link', { name: '林雨晴' }).getAttribute('href')).toBe(
      '/teachers/lin',
    )
    const works = screen.getByRole('region', { name: '学员作品' })
    for (const link of within(works).getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/^\/works\/\d+$/)
    }
    // 主栏里讲师固定 3 列：通栏默认的 lg:grid-cols-4 必须被覆盖（否则主栏变窄时反而排 4 列）
    const grid = teachers.querySelector('ul')!
    expect(grid.className).toContain('md:grid-cols-3')
    expect(grid.className).toContain('lg:grid-cols-3')
    expect(grid.className).not.toContain('lg:grid-cols-4')
  })
})
