// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import type { WorkDetail, WorkPagesSettings } from '@/lib/works/types'

import { GAME, workCard, workDetail } from '../helpers/work-fixtures'

/**
 * 作品详情页主体（jsdom）：作品名与化名说明、信息栏的链接与取舍、行动号召带上课程与专业、相关作品。
 * 真实数据、版式与提交线索由 e2e（tests/e2e/work-detail.e2e.spec.ts）覆盖。
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
const { WorkDetailView } = await import('@/components/works/detail/work-detail-view')

const leadConfig: LeadFormConfig = {
  disciplines: [
    { id: 1, name: '三维动画' },
    { id: 3, name: '影视特效' },
  ],
  cities: ['北京'],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const settings: WorkPagesSettings = {
  list: { title: '学员作品', description: null, seo: null },
  detail: { ctaTitle: '想做出这样的作品？', ctaDescription: '预约一节试听课。' },
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

function renderView(work: WorkDetail) {
  return render(
    <LeadDialogProvider config={leadConfig}>
      <WorkDetailView work={work} settings={settings} />
    </LeadDialogProvider>,
  )
}

/** 信息栏中某一项的取值 */
function fact(label: string): HTMLElement | null {
  const term = screen.queryByText(label, { selector: 'dt' })
  return term?.parentElement?.querySelector('dd') ?? null
}

describe('WorkDetailView', () => {
  it('面包屑、作品名（h1）、精选、署名（化名 · 届别）与化名说明', () => {
    renderView(workDetail({ id: 42, featured: true }))
    const breadcrumbs = screen.getByRole('navigation', { name: '面包屑' })
    expect(within(breadcrumbs).getByRole('link', { name: '学员作品' }).getAttribute('href')).toBe(
      '/works',
    )
    expect(
      within(breadcrumbs).getByText('《灯塔守望者》角色动画短片').getAttribute('aria-current'),
    ).toBe('page')

    const hero = screen.getByRole('region', { name: '《灯塔守望者》角色动画短片' })
    expect(within(hero).getByRole('heading', { level: 1 }).textContent).toBe(
      '《灯塔守望者》角色动画短片',
    )
    expect(within(hero).getByText('精选')).toBeTruthy()
    expect(within(hero).getByText('林同学 · 2026 届')).toBeTruthy()
    expect(within(hero).getByText('作者署名为学员化名')).toBeTruthy()
  })

  it('信息栏：专业方向链接到专业页、课程链接到课程详情、软件为文字标签、发布时间为北京日期', () => {
    renderView(
      workDetail({
        publishedAt: '2026-11-20T20:00:00.000Z',
        software: [
          { slug: 'maya', name: 'Maya' },
          { slug: 'nuke', name: 'Nuke' },
        ],
      }),
    )
    expect(screen.getByRole('heading', { level: 2, name: '作品说明' })).toBeTruthy()
    expect(screen.getByText('毕业短片。')).toBeTruthy()

    const discipline = within(fact('专业方向')!).getByRole('link', { name: '三维动画' })
    expect(discipline.getAttribute('href')).toBe('/majors/3d-animation')
    const course = within(fact('所属课程')!).getByRole('link', { name: '三维动画设计长期就业班' })
    expect(course.getAttribute('href')).toBe('/courses/3d-animation-career')

    const software = fact('所用软件')!
    expect(within(software).queryAllByRole('link')).toHaveLength(0)
    expect(
      within(software)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Maya', 'Nuke'])

    const time = fact('发布时间')!.querySelector('time')
    expect(time?.textContent).toBe('2026年11月21日')
    expect(time?.getAttribute('datetime')).toBe('2026-11-21')
  })

  it('课程不可访问、专业方向未发布、没有软件与说明时，相应的项不显示', () => {
    renderView(workDetail({ course: null, discipline: null, software: [], description: null }))
    expect(fact('所属课程')).toBeNull()
    expect(fact('专业方向')).toBeNull()
    expect(fact('所用软件')).toBeNull()
    expect(screen.queryByRole('heading', { name: '作品说明' })).toBeNull()
    expect(fact('发布时间')).not.toBeNull()
  })

  it('行动号召：标题与说明来自后台；“预约试听”打开的弹窗带上位置 work_detail、课程与专业', async () => {
    // 课程 ID 3、专业 ID 1，意向专业选项两者都有：传反时会选中错误的一项
    renderView(workDetail({ discipline: { ...GAME, id: 1 } }))
    const cta = screen.getByRole('region', { name: '想做出这样的作品？' })
    expect(within(cta).getByText('预约一节试听课。')).toBeTruthy()

    await act(async () => {
      fireEvent.click(within(cta).getByRole('button', { name: '预约试听' }))
    })
    const dialog = screen.getByRole('dialog', { name: '预约免费试听' })
    expect(dialog.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'work_detail',
    )
    expect(dialog.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('trial')
    expect(dialog.querySelector<HTMLInputElement>('input[name="course"]')?.value).toBe('3')
    expect(within(dialog).getByLabelText('意向专业')).toHaveProperty('value', '1')
  })

  it('相关作品：卡片链接到各自详情，并有“查看全部作品”；没有相关作品时不显示该区块', () => {
    const { unmount } = renderView(
      workDetail({ related: [workCard({ id: 5, title: '《纸鹤快递》' }), workCard({ id: 6 })] }),
    )
    const related = screen.getByRole('region', { name: '相关作品' })
    expect(within(related).getByRole('link', { name: '《纸鹤快递》' }).getAttribute('href')).toBe(
      '/works/5',
    )
    expect(
      within(related)
        .getByRole('link', { name: /查看全部作品/ })
        .getAttribute('href'),
    ).toBe('/works')
    unmount()

    renderView(workDetail({ related: [] }))
    expect(screen.queryByRole('region', { name: '相关作品' })).toBeNull()
  })
})
