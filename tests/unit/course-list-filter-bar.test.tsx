// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import type { CourseFilters } from '@/lib/course/types'

import { BEIJING, SHANGHAI, courseCard, disciplineRef } from '../helpers/course-fixtures'

/**
 * 课程列表专属组件（jsdom）：筛选栏、分组结果、空状态。版式、URL 同步与响应式由 e2e 覆盖。
 */
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch,
    scroll,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean; scroll?: boolean }) => (
    <a
      href={href}
      data-prefetch={String(prefetch)}
      data-scroll={scroll === undefined ? undefined : String(scroll)}
      {...rest}
    >
      {children}
    </a>
  ),
}))

const { LeadDialogProvider } = await import('@/components/lead/lead-dialog')
const { CourseFilterBar } = await import('@/components/course/list/course-filter-bar')
const { CourseGroups } = await import('@/components/course/list/course-groups')
const { CourseListEmpty } = await import('@/components/course/list/course-list-empty')
const { groupCoursesByDiscipline } = await import('@/components/course/list/group-courses')

const config: LeadFormConfig = {
  disciplines: [{ id: 1, name: '三维动画' }],
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

const ANIMATION = disciplineRef()
const GAME = disciplineRef({ id: 2, name: '游戏美术', shortName: '游戏', slug: 'game-art' })

const cards = [
  courseCard({
    id: 1,
    slug: 'animation-career',
    discipline: ANIMATION,
    classType: 'long_term',
    deliveryModes: ['offline'],
    campuses: [BEIJING, SHANGHAI],
  }),
  courseCard({
    id: 2,
    slug: 'animation-online',
    discipline: ANIMATION,
    classType: 'short_term',
    deliveryModes: ['online'],
    campuses: [],
  }),
  courseCard({
    id: 3,
    slug: 'game-career',
    discipline: GAME,
    classType: 'long_term',
    deliveryModes: ['offline'],
    campuses: [SHANGHAI],
  }),
]

function renderBar(filters: CourseFilters, resultCount: number, previewNotice = false) {
  return render(
    <CourseFilterBar
      cards={cards}
      filters={filters}
      resultCount={resultCount}
      previewNotice={previewNotice}
    />,
  )
}

const row = (name: string) => within(screen.getByRole('list', { name }))

describe('CourseFilterBar', () => {
  it('整体是“课程筛选”导航，四行依次为专业方向 / 班型 / 授课方式 / 城市', () => {
    renderBar({}, 3)
    const nav = screen.getByRole('navigation', { name: '课程筛选' })
    expect(
      within(nav)
        .getAllByRole('list')
        .map((list) => list.getAttribute('aria-labelledby')),
    ).toEqual([
      'course-filter-discipline',
      'course-filter-type',
      'course-filter-mode',
      'course-filter-city',
    ])
    expect(
      row('专业方向')
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['全部3（3 门课程）', '三维动画2（2 门课程）', '游戏1（1 门课程）'])
    expect(
      row('城市')
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/courses', '/courses?city=beijing', '/courses?city=shanghai'])
  })

  it('没有筛选时每行“全部”为当前项，不显示“清除筛选”', () => {
    renderBar({}, 3)
    for (const name of ['专业方向', '班型', '授课方式', '城市']) {
      const current = row(name)
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'true')
      expect(current.map((link) => link.textContent?.startsWith('全部'))).toEqual([true])
    }
    expect(screen.getByRole('status').textContent).toBe('共 3 门课程')
    expect(screen.queryByRole('link', { name: '清除筛选' })).toBeNull()
  })

  it('筛选链接 nofollow、不预取、保持滚动位置', () => {
    renderBar({ discipline: '3d-animation' }, 2)
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('rel')).toBe('nofollow')
      expect(link.getAttribute('data-prefetch')).toBe('false')
      expect(link.getAttribute('data-scroll')).toBe('false')
    }
  })

  it('选中项 aria-current="true"，再点同一项取消；其它维度的数量按当前条件计算', () => {
    renderBar({ discipline: '3d-animation' }, 2)
    const selected = row('专业方向').getByRole('link', { name: /^三维动画/ })
    expect(selected.getAttribute('aria-current')).toBe('true')
    expect(selected.getAttribute('href')).toBe('/courses')
    expect(
      row('专业方向').getByRole('link', { name: /^全部/ }).getAttribute('aria-current'),
    ).toBeNull()

    // 班型：三维动画下长期 1、短期 1；链接保留专业方向，参数顺序固定
    const shortTerm = row('班型').getByRole('link', { name: /^短期提升班/ })
    expect(shortTerm.textContent).toBe('短期提升班1（1 门课程）')
    expect(shortTerm.getAttribute('href')).toBe('/courses?discipline=3d-animation&type=short_term')
    // 城市：三维动画只有长期班开设校区（线上课程不计入城市）
    expect(
      row('城市')
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['全部2（2 门课程）', '北京1（1 门课程）', '上海1（1 门课程）'])
  })

  it('有筛选时显示“清除筛选”，链接到 /courses', () => {
    renderBar({ type: 'long_term', city: 'shanghai' }, 2)
    const clear = screen.getByRole('link', { name: '清除筛选' })
    expect(clear.getAttribute('href')).toBe('/courses')
    expect(screen.getByRole('status').textContent).toBe('共 2 门课程')
  })

  it('静态预览站在筛选栏下提示不支持筛选', () => {
    renderBar({}, 3, true)
    expect(screen.getByRole('note').textContent).toContain('静态预览站不支持按条件筛选')
  })

  it('正式站不显示预览提示', () => {
    renderBar({}, 3)
    expect(screen.queryByRole('note')).toBeNull()
  })
})

describe('CourseGroups', () => {
  it('每个专业方向一个区块：h2 为全称，“了解该专业”链接到专业方向页，课程标题 h3', () => {
    render(
      <LeadDialogProvider config={config}>
        <CourseGroups groups={groupCoursesByDiscipline(cards)} now={new Date()} />
      </LeadDialogProvider>,
    )
    const regions = screen.getAllByRole('region')
    expect(regions).toHaveLength(2)

    const animation = within(screen.getByRole('region', { name: '三维动画' }))
    expect(animation.getByRole('heading', { level: 2 }).textContent).toBe('三维动画')
    expect(animation.getByText('2 门课程')).toBeTruthy()
    expect(animation.getByRole('link', { name: '了解该专业：三维动画' }).getAttribute('href')).toBe(
      '/majors/3d-animation',
    )
    expect(animation.getAllByRole('heading', { level: 3 })).toHaveLength(2)

    const game = within(screen.getByRole('region', { name: '游戏美术' }))
    expect(game.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      cards[2]!.title,
    ])
  })
})

describe('CourseListEmpty', () => {
  it('说明 + 咨询课程顾问（打开留资弹窗）+ 清除筛选', () => {
    render(
      <LeadDialogProvider config={config}>
        <CourseListEmpty />
      </LeadDialogProvider>,
    )
    const empty = within(screen.getByRole('region', { name: '没有符合条件的课程' }))
    expect(empty.getByRole('link', { name: '清除筛选' }).getAttribute('href')).toBe('/courses')

    fireEvent.click(empty.getByRole('button', { name: '咨询课程顾问' }))
    const dialog = screen.getByRole('dialog')
    const position = dialog.querySelector<HTMLInputElement>('input[name="position"]')
    const intent = dialog.querySelector<HTMLInputElement>('input[name="intent"]')
    expect(position?.value).toBe('course_list_empty')
    expect(intent?.value).toBe('consult')
  })
})
