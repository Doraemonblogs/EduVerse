// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'

/**
 * 作品列表页 /works 专属的纯函数与组件（jsdom）：收录规则、分页标题、结果数文案、空状态。
 * URL 同步、分页、404 与响应式由 e2e（tests/e2e/works-list.e2e.spec.ts）覆盖。
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
const { WorksListEmpty } = await import('@/components/works/list/works-list-empty')
const { pagedTitle, worksListIndexing, worksResultTemplate } =
  await import('@/components/works/list/works-list')

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

describe('worksListIndexing', () => {
  it('第 1 页：可收录，canonical 为 /works，标题不加页码', () => {
    expect(worksListIndexing({ hasFilterParams: false, page: 1 })).toEqual({
      path: '/works',
      noindex: false,
      titlePage: null,
    })
  })

  it('无筛选的第 N 页：可收录，canonical 带页码', () => {
    expect(worksListIndexing({ hasFilterParams: false, page: 2 })).toEqual({
      path: '/works?page=2',
      noindex: false,
      titlePage: 2,
    })
    expect(worksListIndexing({ hasFilterParams: false, page: 12 }).path).toBe('/works?page=12')
  })

  it('带筛选参数：noindex，canonical 始终是 /works（不论第几页）', () => {
    expect(worksListIndexing({ hasFilterParams: true, page: 1 })).toEqual({
      path: '/works',
      noindex: true,
      titlePage: null,
    })
    expect(worksListIndexing({ hasFilterParams: true, page: 3 })).toEqual({
      path: '/works',
      noindex: true,
      titlePage: 3,
    })
  })

  it('异常页码按第 1 页处理', () => {
    for (const page of [0, -1, 1.5, Number.NaN]) {
      expect(worksListIndexing({ hasFilterParams: false, page })).toEqual({
        path: '/works',
        noindex: false,
        titlePage: null,
      })
    }
  })
})

describe('pagedTitle', () => {
  it('第 2 页起在标题后加页码，第 1 页原样返回', () => {
    expect(pagedTitle('学员作品', 2)).toBe('学员作品（第 2 页）')
    expect(pagedTitle('学员作品｜EduVerse 数艺学院', 3)).toBe(
      '学员作品｜EduVerse 数艺学院（第 3 页）',
    )
    expect(pagedTitle('学员作品', null)).toBe('学员作品')
  })
})

describe('worksResultTemplate', () => {
  it('只有 1 页时只显示总数，多于 1 页时加上当前页 / 总页数，并保留 {count} 给筛选栏', () => {
    expect(worksResultTemplate(1, 1)).toBe('共 {count} 件作品')
    expect(worksResultTemplate(1, 3)).toBe('共 {count} 件作品 · 第 1 / 3 页')
    expect(worksResultTemplate(3, 3)).toBe('共 {count} 件作品 · 第 3 / 3 页')
  })
})

describe('WorksListEmpty', () => {
  it('筛选无结果：说明 + 预约试听（position works_list_empty）+ 清除筛选', () => {
    render(
      <LeadDialogProvider config={config}>
        <WorksListEmpty filtered />
      </LeadDialogProvider>,
    )
    const empty = within(screen.getByRole('region', { name: '没有符合条件的作品' }))
    expect(empty.getByText(/清除筛选查看全部作品/)).toBeTruthy()
    const clear = empty.getByRole('link', { name: '清除筛选' })
    expect(clear.getAttribute('href')).toBe('/works')
    expect(clear.getAttribute('rel')).toBe('nofollow')
    expect(clear.getAttribute('data-prefetch')).toBe('false')

    fireEvent.click(empty.getByRole('button', { name: '预约试听' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'works_list_empty',
    )
    expect(dialog.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('trial')
  })

  it('还没有任何作品：换成“作品正在整理中”，没有可清除的筛选', () => {
    render(
      <LeadDialogProvider config={config}>
        <WorksListEmpty filtered={false} />
      </LeadDialogProvider>,
    )
    const empty = within(screen.getByRole('region', { name: '作品正在整理中' }))
    expect(empty.queryByRole('link', { name: '清除筛选' })).toBeNull()
    expect(empty.getByRole('button', { name: '预约试听' })).toBeTruthy()
  })
})
