// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import type { ArticleCardData, ArticleDetail, ArticlePagesSettings } from '@/lib/articles/types'
import { paginate } from '@/lib/pagination'

import { courseCard } from '../helpers/course-fixtures'

/**
 * 资讯列表 / 分类页与资讯详情页的版式约定（jsdom）：
 * - 每个版心都给桌面端悬浮操作栏让位（lg:avoid-floating-actions）：1024–1439px 时第三列卡片、
 *   相关文章右列与“更多{分类}”链接贴着版心右缘，不让位会被固定在视口中部的悬浮栏盖住；全页右缘对齐；
 * - 阅读量为 0 时详情页首屏不显示“0 次阅读”。
 * 真实布局下的几何检查见 tests/e2e/articles-layout.e2e.spec.ts。
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

const { ArticlesListView } = await import('@/components/articles/articles-list-view')
const { ArticleDetailView } = await import('@/components/articles/detail/article-detail-view')
const { LeadDialogProvider } = await import('@/components/lead/lead-dialog')

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver)
  // 阅读量上报组件在挂载时调用：只确认不报错，不真的发请求
  vi.stubGlobal('navigator', { ...navigator, sendBeacon: vi.fn(() => true) })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const NEWS = { id: 1, name: '学院新闻', slug: 'news' }

const card = (id: number, overrides: Partial<ArticleCardData> = {}): ArticleCardData => ({
  id,
  slug: `article-${id}`,
  title: `文章 ${id}`,
  excerpt: '摘要',
  cover: { src: `/api/media/file/a-${id}-800x450.webp`, alt: '', width: 800, height: 450 },
  category: NEWS,
  publishedAt: '2026-10-30T15:35:15.652Z',
  views: 0,
  authorName: '教研中心',
  ...overrides,
})

const leadConfig: LeadFormConfig = {
  disciplines: [{ id: 7, name: '三维动画' }],
  cities: ['北京'],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const settings: ArticlePagesSettings = {
  list: { title: '资讯', description: null, seo: null },
  detail: { sidebarTitle: '预约免费试听', sidebarDescription: null },
}

const detail = (overrides: Partial<ArticleDetail> = {}): ArticleDetail => ({
  ...card(100, { slug: 'open-day', title: '北京海淀校区秋季开放日活动回顾' }),
  heroImage: null,
  shareImage: null,
  content: {
    root: {
      type: 'root',
      direction: null,
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [{ type: 'text', text: '正文段落', version: 1, format: 0 }],
        },
      ],
    },
  },
  relatedCourses: [courseCard()],
  relatedArticles: [card(101), card(102)],
  updatedAt: '2026-11-01T02:00:00.000Z',
  seo: undefined,
  ...overrides,
})

/** 页面上全部版心（Container 输出 .container-site） */
const containers = () => [...document.querySelectorAll<HTMLElement>('.container-site')]

describe('资讯列表 / 分类页', () => {
  it('标题区与文章网格的版心都给悬浮操作栏让位（右缘对齐）', () => {
    render(
      <ArticlesListView
        title="资讯"
        description={null}
        breadcrumbs={[{ label: '资讯', href: '/articles' }]}
        nav={[
          { key: 'all', label: '全部', href: '/articles', count: 12, current: true },
          {
            key: 'news',
            label: '学院新闻',
            href: '/articles/category/news',
            count: 12,
            current: false,
          },
        ]}
        slice={paginate(
          Array.from({ length: 12 }, (_, i) => card(i + 1)),
          1,
          12,
        )}
        categorySlug={null}
      />,
    )
    expect(containers()).toHaveLength(2)
    for (const container of containers()) {
      expect(container.className).toContain('lg:avoid-floating-actions')
    }
  })
})

describe('资讯详情页', () => {
  function renderDetail(overrides: Partial<ArticleDetail> = {}) {
    return render(
      <LeadDialogProvider config={leadConfig}>
        <ArticleDetailView
          article={detail(overrides)}
          settings={settings}
          hotCourses={[courseCard({ id: 9 })]}
          leadConfig={leadConfig}
          now={new Date('2026-11-23T02:00:00.000Z')}
        />
      </LeadDialogProvider>,
    )
  }

  it('标题区、两栏正文与相关文章三个版心都给悬浮操作栏让位（右缘对齐）', () => {
    renderDetail()
    expect(screen.getByRole('region', { name: '相关文章' })).toBeTruthy()
    expect(containers()).toHaveLength(3)
    for (const container of containers()) {
      expect(container.className).toContain('lg:avoid-floating-actions')
    }
  })

  it('阅读量为 0 时首屏不显示阅读量；大于 0 时显示', () => {
    renderDetail({ views: 0 })
    const header = () => screen.getByRole('heading', { level: 1 }).closest('header')!
    expect(header().textContent).toContain('作者：教研中心')
    expect(header().textContent).not.toContain('次阅读')
    cleanup()

    renderDetail({ views: 863 })
    expect(header().textContent).toContain('863 次阅读')
  })
})
