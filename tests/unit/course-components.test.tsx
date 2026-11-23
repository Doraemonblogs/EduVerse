// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'

import {
  cohortItem,
  courseCard,
  DEFAULT_COURSE_ID,
  DEFAULT_DISCIPLINE_ID,
  disciplineRef,
} from '../helpers/course-fixtures'

/**
 * 课程模块共享展示组件的输出（jsdom）。版式与响应式由页面 e2e 覆盖。
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
const { CourseCard } = await import('@/components/course/course-card')
const { CohortList } = await import('@/components/course/cohort-list')
const { SalaryReferenceCard } = await import('@/components/course/salary-reference-card')
const { SyllabusList } = await import('@/components/course/syllabus-list')
const { FaqList } = await import('@/components/course/faq-list')
const { WorkThumbGrid } = await import('@/components/course/work-thumb-grid')
const { TeacherCard, TeacherCardGrid } = await import('@/components/course/teacher-card-grid')
const { CareerDirectionList } = await import('@/components/course/career-direction-list')
const { SoftwareTags } = await import('@/components/course/software-tags')
const { CourseTags } = await import('@/components/course/course-tags')

const config: LeadFormConfig = {
  // 与课程 ID 相同的选项也存在：课程与专业的 ID 被传反时，意向专业会选中它而不是落空
  disciplines: [
    { id: DEFAULT_COURSE_ID, name: '游戏美术' },
    { id: DEFAULT_DISCIPLINE_ID, name: '三维动画' },
  ],
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

const now = new Date('2026-11-23T00:30:00.000Z')

describe('CourseCard', () => {
  const course = courseCard({
    stageTitles: ['阶段一', '阶段二', '阶段三', '阶段四', '阶段五', '阶段六'],
    cohorts: [
      cohortItem({ id: 1, startDate: '2026-11-10T02:00:00.000Z' }), // 已开班
      cohortItem({ id: 2, startDate: '2027-01-05T02:00:00.000Z', campus: null, mode: 'online' }),
      cohortItem({ id: 3, startDate: '2026-12-14T02:00:00.000Z' }),
    ],
  })

  it('标题默认 h3 并链接到课程详情；可改为其它层级', () => {
    withProvider(<CourseCard course={course} now={now} />)
    const heading = screen.getByRole('heading', { level: 3, name: course.title })
    expect(within(heading).getByRole('link').getAttribute('href')).toBe(
      '/courses/3d-animation-career',
    )
    cleanup()
    withProvider(<CourseCard course={course} now={now} headingLevel="h2" />)
    expect(screen.getByRole('heading', { level: 2, name: course.title })).toBeTruthy()
  })

  it('显示专业方向、班型与时长 / 授课方式 / 城市', () => {
    withProvider(<CourseCard course={course} now={now} />)
    expect(screen.getByText('三维动画')).toBeTruthy()
    expect(screen.getByText('长期就业班')).toBeTruthy()
    expect(screen.getByText('7 个月')).toBeTruthy()
    expect(screen.getByText('线下面授 / 双师课堂')).toBeTruthy()
    expect(screen.getByText('北京 / 上海')).toBeTruthy()
  })

  it('学习路线最多列出 5 个阶段，超出时提示阶段总数', () => {
    withProvider(<CourseCard course={course} now={now} />)
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(within(list).queryByText('阶段六')).toBeNull()
    expect(screen.getByText('等 6 个阶段')).toBeTruthy()
  })

  it('近期开班取未开班中最早的一期；校区名已含城市时不重复城市', () => {
    withProvider(<CourseCard course={course} now={now} />)
    expect(screen.getByText('2026年12月14日 · 北京海淀校区')).toBeTruthy()
    expect(screen.queryByText(/北京·北京海淀校区/)).toBeNull()
  })

  it('开课城市：线下 / 双师课程暂无已发布校区时显示“待定”，纯线上课程显示“线上”', () => {
    const meta = (label: string) =>
      screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent
    withProvider(<CourseCard course={courseCard({ campuses: [] })} now={now} />)
    expect(meta('授课方式')).toContain('线下面授')
    expect(meta('开课城市')).toBe('待定')
    cleanup()
    withProvider(
      <CourseCard course={courseCard({ campuses: [], deliveryModes: ['online'] })} now={now} />,
    )
    expect(meta('开课城市')).toBe('线上')
  })

  it('概要取值只在“/”后换行，中文词不会被拆开（break-keep），“/”不会落到行首', () => {
    const { container } = withProvider(<CourseCard course={course} now={now} />)
    const values = [...container.querySelectorAll('dl dd')]
    expect(values).toHaveLength(3)
    for (const dd of values) {
      expect(dd.className).toContain('break-keep')
      expect(dd.className).toContain('wrap-break-word')
    }
    expect(values[2]!.textContent).toBe('北京\u00a0/ 上海')
  })

  it('没有未开班的计划时不显示近期开班', () => {
    withProvider(<CourseCard course={courseCard({ cohorts: [] })} now={now} />)
    expect(screen.queryByText('近期开班')).toBeNull()
  })

  it('两个出口：课程详情链接与预约试听（弹窗带课程、专业与 course_card 位置）', async () => {
    withProvider(<CourseCard course={course} now={now} />)
    const detail = screen.getByRole('link', { name: `${course.title}：课程详情` })
    expect(detail.getAttribute('href')).toBe('/courses/3d-animation-career')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: `预约试听：${course.title}` }))
    })
    const form = screen.getByRole('dialog').querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'course_card',
    )
    expect(form.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('trial')
    expect(form.querySelector<HTMLInputElement>('input[name="course"]')?.value).toBe(
      String(DEFAULT_COURSE_ID),
    )
    expect(form.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe(
      String(DEFAULT_DISCIPLINE_ID),
    )
  })

  it('预约试听的留资位置可以传入（首页精选课程用 home_course）', async () => {
    withProvider(<CourseCard course={course} now={now} leadPosition="home_course" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: `预约试听：${course.title}` }))
    })
    const form = screen.getByRole('dialog').querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'home_course',
    )
    expect(form.querySelector<HTMLInputElement>('input[name="course"]')?.value).toBe(
      String(DEFAULT_COURSE_ID),
    )
  })
})

describe('CohortList', () => {
  it('没有开班计划时显示空状态', () => {
    withProvider(<CohortList cohorts={[]} courseId={1} disciplineId={1} />)
    expect(screen.getByText(/暂无近期开班计划/)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('每行显示日期、地点、授课方式与文字状态，并有可区分的预约按钮', () => {
    withProvider(
      <CohortList
        cohorts={[
          cohortItem({ id: 1, status: 'full', note: '周末班' }),
          cohortItem({
            id: 2,
            mode: 'online',
            campus: null,
            status: 'upcoming',
            startDate: '2027-01-05T02:00:00.000Z',
            endDate: null,
          }),
        ]}
        courseId={1}
        disciplineId={1}
      />,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]!).getByText('2026年12月14日')).toBeTruthy()
    expect(within(rows[0]!).getByText('至 2027年6月30日')).toBeTruthy()
    expect(within(rows[0]!).getByText('已满班')).toBeTruthy()
    expect(within(rows[0]!).getByText('周末班')).toBeTruthy()
    expect(within(rows[1]!).getByText('线上')).toBeTruthy()
    expect(within(rows[1]!).getByText('线上直播')).toBeTruthy()
    expect(within(rows[1]!).getByText('即将开班')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '预约试听：2026年12月14日开班（北京海淀校区）' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: '预约试听：2027年1月5日开班（线上）' })).toBeTruthy()
  })

  it('每行的预约试听打开弹窗，带上课程、专业与 course_cohort 位置', async () => {
    withProvider(
      <CohortList
        cohorts={[cohortItem({ id: 1 })]}
        courseId={DEFAULT_COURSE_ID}
        disciplineId={DEFAULT_DISCIPLINE_ID}
      />,
    )
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '预约试听：2026年12月14日开班（北京海淀校区）' }),
      )
    })
    const form = screen.getByRole('dialog').querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'course_cohort',
    )
    expect(form.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('trial')
    expect(form.querySelector<HTMLInputElement>('input[name="course"]')?.value).toBe(
      String(DEFAULT_COURSE_ID),
    )
    expect(form.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe(
      String(DEFAULT_DISCIPLINE_ID),
    )
  })
})

describe('CohortList：校区链接与跨课程的开班', () => {
  it('开班校区链接到校区详情；线上开班没有链接；linkCampus=false 时只显示文字', () => {
    const cohorts = [
      cohortItem({ id: 1 }),
      cohortItem({ id: 2, mode: 'online', campus: null, startDate: '2027-01-05T02:00:00.000Z' }),
    ]
    const { unmount } = withProvider(<CohortList cohorts={cohorts} courseId={1} disciplineId={1} />)
    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]!).getByRole('link', { name: '北京海淀校区' }).getAttribute('href')).toBe(
      '/campuses/beijing-haidian',
    )
    expect(within(rows[1]!).queryByRole('link')).toBeNull()
    unmount()

    withProvider(
      <CohortList cohorts={cohorts.slice(0, 1)} courseId={1} disciplineId={1} linkCampus={false} />,
    )
    expect(screen.getByText('北京海淀校区').closest('a')).toBeNull()
  })

  it('每行带课程时：显示课程名（链接到课程），预约试听带上该行的课程、专业方向与指定的位置', async () => {
    withProvider(
      <CohortList
        cohorts={[
          {
            ...cohortItem({ id: 1 }),
            course: {
              id: 41,
              slug: 'game-art-career',
              title: '游戏美术长期班',
              disciplineId: DEFAULT_DISCIPLINE_ID,
            },
          },
        ]}
        position="campus_cohort"
        linkCampus={false}
      />,
    )
    const row = screen.getByRole('listitem')
    expect(within(row).getByRole('link', { name: '游戏美术长期班' }).getAttribute('href')).toBe(
      '/courses/game-art-career',
    )
    await act(async () => {
      fireEvent.click(
        within(row).getByRole('button', {
          name: '预约试听：游戏美术长期班，2026年12月14日开班（北京海淀校区）',
        }),
      )
    })
    const form = screen.getByRole('dialog').querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'campus_cohort',
    )
    expect(form.querySelector<HTMLInputElement>('input[name="course"]')?.value).toBe('41')
    expect(form.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe(
      String(DEFAULT_DISCIPLINE_ID),
    )
  })
})

describe('SalaryReferenceCard', () => {
  it('显示区间、来源、统计时间、补充说明与免责声明', () => {
    render(
      <SalaryReferenceCard
        salary={{
          range: '8,000–15,000 元/月',
          source: '示例数据',
          statDate: '2026 年 9 月',
          note: '一线城市初级岗位',
          disclaimer: '以上薪资数据仅供参考，不作为培训效果承诺。',
        }}
      />,
    )
    expect(screen.getByRole('heading', { level: 3, name: '薪资参考' })).toBeTruthy()
    expect(screen.getByText('8,000–15,000 元/月')).toBeTruthy()
    expect(screen.getByText('数据来源：示例数据')).toBeTruthy()
    expect(screen.getByText('统计时间：2026 年 9 月')).toBeTruthy()
    expect(screen.getByText('一线城市初级岗位')).toBeTruthy()
    expect(screen.getByText('以上薪资数据仅供参考，不作为培训效果承诺。')).toBeTruthy()
  })

  it('来源与统计时间之间的“·”接在来源末尾（不换行空格），换行时不会落到第二行行首', () => {
    render(
      <SalaryReferenceCard
        salary={{
          range: '8,000–15,000 元/月',
          source: '示例数据（虚构），仅用于演示',
          statDate: '2026 年 9 月',
          note: null,
          disclaimer: '以上薪资数据仅供参考。',
        }}
      />,
    )
    const line = screen.getByText('统计时间：2026 年 9 月').parentElement!
    // 只有两个可换行的单元：来源（含分隔点）与统计时间
    expect(line.children).toHaveLength(2)
    const source = line.children[0]!
    expect(source.textContent).toBe('数据来源：示例数据（虚构），仅用于演示\u00a0·')
    expect(source.lastElementChild?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('SyllabusList', () => {
  it('每个阶段一个原生 details，只有第一阶段默认展开', () => {
    const { container } = render(
      <SyllabusList
        stages={[
          { title: '造型基础', duration: '4 周', goals: '熟悉软件', topics: ['界面', '建模'] },
          { title: '角色绑定', duration: null, goals: null, topics: [] },
        ]}
      />,
    )
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(2)
    expect(details[0]!.open).toBe(true)
    expect(details[1]!.open).toBe(false)
    expect(details[0]!.querySelector('summary')?.textContent).toContain('第 1 阶段')
    expect(details[0]!.querySelector('summary')?.textContent).toContain('4 周')
    expect(within(details[0]! as HTMLElement).getByText('建模')).toBeTruthy()
  })

  it('知识点按自身宽度（容器查询）分两列，放进窄栏时不会把词挤断', () => {
    const { container } = render(
      <SyllabusList
        stages={[{ title: '造型基础', duration: null, goals: null, topics: ['建模'] }]}
      />,
    )
    const list = container.querySelector('details ul')!
    expect(list.className).toContain('@lg:grid-cols-2')
    expect(list.className).not.toContain('sm:grid-cols-2')
    expect(list.parentElement!.className).toContain('@container')
  })

  it('没有阶段时不渲染', () => {
    const { container } = render(<SyllabusList stages={[]} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('FaqList', () => {
  it('问题在 summary 中，回答默认收起', () => {
    const { container } = render(
      <FaqList
        faqs={[
          { id: 1, question: '零基础可以学吗？', answer: '可以。' },
          { id: 2, question: '可以分期吗？', answer: '请咨询课程顾问。' },
        ]}
      />,
    )
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(2)
    expect([...details].every((d) => !d.open)).toBe(true)
    expect(details[0]!.querySelector('summary')?.textContent).toBe('零基础可以学吗？')
  })
})

describe('WorkThumbGrid / TeacherCardGrid', () => {
  const cover = { src: '/api/media/file/w.webp', alt: '', width: 800, height: 600 }

  it('每件作品整体链接到作品详情（名称为作品名、署名为描述），图片 alt 缺省时用作品名，支持数量上限', () => {
    render(
      <WorkThumbGrid
        works={[
          { id: 1, title: '雨夜街角', cover, authorName: '小林', cohortLabel: '2026 届' },
          {
            id: 2,
            title: '机甲设计',
            cover: { ...cover, alt: '机甲正面图' },
            authorName: null,
            cohortLabel: null,
          },
          { id: 3, title: '第三件', cover, authorName: null, cohortLabel: null },
        ]}
        limit={2}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/works/1', '/works/2'])
    const first = screen.getByRole('link', { name: '雨夜街角' })
    expect(first).toHaveProperty('href', expect.stringMatching(/\/works\/1$/))
    expect(document.getElementById(first.getAttribute('aria-describedby')!)?.textContent).toBe(
      '小林 · 2026 届',
    )
    // 没有署名时不加描述
    expect(screen.getByRole('link', { name: '机甲设计' }).hasAttribute('aria-describedby')).toBe(
      false,
    )
    expect(screen.getByAltText('雨夜街角')).toBeTruthy()
    expect(screen.getByAltText('机甲正面图')).toBeTruthy()
    expect(screen.getByText('小林 · 2026 届')).toBeTruthy()
  })

  it('讲师卡片整体链接到讲师详情：姓名标题、头衔、从业年限与擅长领域', () => {
    render(
      <TeacherCardGrid
        teachers={[
          {
            id: 1,
            slug: 'lin',
            name: '林老师',
            title: '三维动画讲师',
            avatar: cover,
            yearsOfExperience: 8,
            specialties: ['角色绑定', '表演动画'],
          },
        ]}
      />,
    )
    const link = screen.getByRole('link', { name: '林老师' })
    expect(link.getAttribute('href')).toBe('/teachers/lin')
    // 头衔、年限、擅长作为链接描述
    const details = document.getElementById(link.getAttribute('aria-describedby')!)
    expect(details?.textContent).toContain('三维动画讲师')
    expect(details?.textContent).toContain('从业 8 年')
    expect(screen.getByRole('heading', { level: 3, name: '林老师' })).toBeTruthy()
    expect(screen.getByAltText('林老师')).toBeTruthy()
    expect(screen.getByText('从业 8 年')).toBeTruthy()
    expect(screen.getByText(/角色绑定 \/ 表演动画/)).toBeTruthy()
  })

  const teacher = {
    id: 1,
    slug: 'lin',
    name: '林老师',
    title: '三维动画讲师',
    avatar: { src: '/api/media/file/t.webp', alt: '', width: 400, height: 400 },
    yearsOfExperience: 8,
    specialties: ['镜头语言与分镜', '动画短片指导'],
  }

  it('讲师网格：同时覆盖 md: 与 lg: 列数时，通栏默认的 lg:grid-cols-4 被替换', () => {
    const { container } = render(
      <TeacherCardGrid teachers={[teacher]} className="md:grid-cols-3 lg:grid-cols-3" />,
    )
    const list = container.querySelector('ul')!
    expect(list.className).toContain('lg:grid-cols-3')
    expect(list.className).not.toContain('lg:grid-cols-4')
  })

  it('讲师带专业方向（讲师列表）时列出简称，读屏有“专业方向”前缀；不带时不显示', () => {
    const { rerender } = render(
      <TeacherCardGrid
        teachers={[
          {
            ...teacher,
            disciplines: [
              disciplineRef(),
              disciplineRef({ id: 2, name: '游戏美术', shortName: '游戏', slug: 'game-art' }),
            ],
          },
        ]}
      />,
    )
    // getByText 会把不换行空格规范成普通空格
    const line = screen.getByText(/三维动画 \/ 游戏/)
    expect(line.textContent).toBe('专业方向：三维动画\u00a0/ 游戏')
    rerender(<TeacherCardGrid teachers={[teacher]} />)
    expect(screen.queryByText(/专业方向：/)).toBeNull()
  })

  it('讲师头像 sizes 可按所在栏宽传入；擅长领域只在“/”后换行', () => {
    const { container } = render(
      <TeacherCardGrid teachers={[teacher]} imageSizes="(min-width: 1024px) 18vw, 96px" />,
    )
    expect(container.querySelector('img')!.getAttribute('sizes')).toBe(
      '(min-width: 1024px) 18vw, 96px',
    )
    const specialties = screen.getByText(/镜头语言与分镜/)
    expect(specialties.className).toContain('break-keep')
    expect(specialties.textContent).toContain('镜头语言与分镜\u00a0/ 动画短片指导')
  })

  it('单张讲师卡片可单独使用（如首页横滑列表）：整体链接、标题层级与头像加载可配置', () => {
    const { container } = render(<TeacherCard teacher={teacher} headingLevel="h4" priority />)
    expect(screen.getByRole('link', { name: '林老师' }).getAttribute('href')).toBe('/teachers/lin')
    expect(screen.getByRole('heading', { level: 4, name: '林老师' })).toBeTruthy()
    const img = container.querySelector('img')!
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('fetchpriority')).toBe('high')
  })

  it('讲师头像默认全部懒加载；priorityCount 让前几位立即加载并提高优先级（只给首屏的网格）', () => {
    const many = [1, 2, 3, 4, 5].map((id) => ({
      ...teacher,
      id,
      slug: `teacher-${id}`,
      name: `讲师${id}`,
    }))
    const { container, rerender } = render(<TeacherCardGrid teachers={many} />)
    const loading = () =>
      [...container.querySelectorAll('img')].map((img) => [
        img.getAttribute('loading'),
        img.getAttribute('fetchpriority'),
      ])
    expect(loading()).toEqual(many.map(() => ['lazy', null]))

    rerender(<TeacherCardGrid teachers={many} priorityCount={2} />)
    expect(loading()).toEqual([
      ['eager', 'high'],
      ['eager', 'high'],
      ['lazy', null],
      ['lazy', null],
      ['lazy', null],
    ])
  })
})

describe('CourseTags', () => {
  it('短期班徽标用 accent 底色（米色区块里 muted 与白色卡片同色，徽标会失去底色）', () => {
    render(<CourseTags discipline={disciplineRef()} classType="short_term" />)
    const badge = screen.getByText('短期提升班')
    expect(badge.className).toContain('bg-accent')
    expect(badge.className).toContain('text-accent-foreground')
    expect(badge.className).not.toContain('bg-muted')
  })

  it('长期班徽标保持反色（inverse）', () => {
    render(<CourseTags discipline={disciplineRef()} classType="long_term" />)
    const badge = screen.getByText('长期就业班')
    expect(badge.getAttribute('data-variant')).toBe('inverse')
    expect(badge.className).not.toContain('bg-accent')
  })
})

describe('CareerDirectionList / SoftwareTags', () => {
  it('方向标题层级可调，空列表不渲染', () => {
    render(
      <CareerDirectionList
        items={[{ title: '三维动画师', description: '负责角色与镜头动画' }]}
        headingLevel="h4"
      />,
    )
    expect(screen.getByRole('heading', { level: 4, name: '三维动画师' })).toBeTruthy()
    cleanup()
    const { container } = render(<CareerDirectionList items={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('软件只输出文字', () => {
    render(<SoftwareTags software={[{ id: 1, name: 'Maya', category: 'modeling' }]} />)
    expect(screen.getByText('Maya')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })
})
