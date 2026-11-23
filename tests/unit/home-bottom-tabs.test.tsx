// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ALL_ARTICLES_TAB,
  articleTabKey,
  articlesForTab,
  buildArticleTabs,
  nextTabIndex,
} from '@/components/home/bottom/article-tabs-model'
import type { HomeArticle, HomeArticleCategory } from '@/lib/home/types'

/**
 * 首页“最新资讯”的分类 Tab：纯函数规则 + 组件的 WAI-ARIA Tabs 行为（jsdom）。版式由页面 e2e 覆盖。
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

const { ArticleTabs } = await import('@/components/home/bottom/article-tabs')

afterEach(cleanup)

const NEWS: HomeArticleCategory = { id: 1, name: '学院新闻', slug: 'news' }
const LEARNING: HomeArticleCategory = { id: 2, name: '学习干货', slug: 'learning' }
const FAQ: HomeArticleCategory = { id: 3, name: '常见问题', slug: 'faq' }

let nextId = 100
const article = (overrides: Partial<HomeArticle> = {}): HomeArticle => {
  const id = nextId++
  return {
    id,
    slug: `article-${id}`,
    title: `文章 ${id}`,
    excerpt: '摘要',
    publishedAt: '2026-11-22T04:00:00.000Z',
    category: NEWS,
    cover: null,
    ...overrides,
  }
}

describe('buildArticleTabs', () => {
  it('第一项“全部”，其后按后台分类顺序列出文章出现过的分类', () => {
    const articles = [article({ category: LEARNING }), article({ category: NEWS })]
    const tabs = buildArticleTabs([NEWS, LEARNING, FAQ], articles, '全部')
    expect(tabs).toEqual([
      { key: ALL_ARTICLES_TAB, label: '全部', categoryId: null },
      { key: articleTabKey(1), label: '学院新闻', categoryId: 1 },
      { key: articleTabKey(2), label: '学习干货', categoryId: 2 },
    ])
  })

  it('出现的分类不足 2 个时不需要 Tab（返回空数组）', () => {
    expect(buildArticleTabs([NEWS, LEARNING], [article(), article()], '全部')).toEqual([])
    expect(buildArticleTabs([], [article({ category: null })], '全部')).toEqual([])
  })

  it('分类列表重复时只出现一次；没有分类的文章不产生 Tab', () => {
    const articles = [article(), article({ category: LEARNING }), article({ category: null })]
    const tabs = buildArticleTabs([NEWS, NEWS, LEARNING], articles, '全部')
    expect(tabs.map((tab) => tab.label)).toEqual(['全部', '学院新闻', '学习干货'])
  })

  it('分类 Tab 的 key 用分类 id，不会与“全部”冲突，可作为 DOM id 片段', () => {
    expect(articleTabKey(7)).toBe('category-7')
    expect(articleTabKey(7)).not.toBe(ALL_ARTICLES_TAB)
    expect(articleTabKey(7)).toMatch(/^[\w-]+$/)
  })
})

describe('articlesForTab', () => {
  const a = article({ category: NEWS })
  const b = article({ category: LEARNING })
  const c = article({ category: null })
  const d = article({ category: NEWS })

  it('“全部”返回全部文章（含没有分类的），保持原有顺序', () => {
    expect(articlesForTab([a, b, c, d], { categoryId: null })).toEqual([a, b, c, d])
  })

  it('分类 Tab 只返回该分类的文章，保持原有顺序', () => {
    expect(articlesForTab([a, b, c, d], { categoryId: NEWS.id })).toEqual([a, d])
    expect(articlesForTab([a, b, c, d], { categoryId: FAQ.id })).toEqual([])
  })
})

describe('nextTabIndex', () => {
  it('左右方向键循环切换，Home / End 到首尾', () => {
    expect(nextTabIndex('ArrowRight', 0, 4)).toBe(1)
    expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0)
    expect(nextTabIndex('ArrowLeft', 2, 4)).toBe(1)
    expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3)
    expect(nextTabIndex('Home', 2, 4)).toBe(0)
    expect(nextTabIndex('End', 0, 4)).toBe(3)
  })

  it('其它按键（含上下方向键、Tab、回车）不处理；没有 Tab 时不处理', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'Tab', 'Enter', ' ', 'a']) {
      expect(nextTabIndex(key, 1, 4)).toBeNull()
    }
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull()
  })
})

describe('ArticleTabs', () => {
  const news1 = article({ title: '开放日回顾', category: NEWS, slug: 'open-day' })
  const learn1 = article({ title: '布线入门', category: LEARNING })
  const news2 = article({ title: '创作营结营', category: NEWS })
  const faq1 = article({ title: '零基础可以学吗', category: FAQ })
  const articles = [news1, learn1, news2, faq1]
  const categories = [NEWS, LEARNING, FAQ]

  const selectedTab = () => screen.getByRole('tab', { selected: true })
  const visiblePanel = () => screen.getByRole('tabpanel')
  const panelTitles = () =>
    within(visiblePanel())
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)

  it('渲染 tablist（无障碍名称“资讯分类”）；默认选中“全部”并显示全部文章', () => {
    render(<ArticleTabs articles={articles} categories={categories} />)
    const tablist = screen.getByRole('tablist', { name: '资讯分类' })
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['全部', '学院新闻', '学习干货', '常见问题'])
    expect(selectedTab().textContent).toBe('全部')
    expect(panelTitles()).toEqual(['开放日回顾', '布线入门', '创作营结营', '零基础可以学吗'])
  })

  it('roving tabindex：只有选中的 Tab 在 Tab 顺序里；Tab 与面板互相关联', () => {
    render(<ArticleTabs articles={articles} categories={categories} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1])
    const panel = visiblePanel()
    expect(selectedTab().getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('aria-labelledby')).toBe(selectedTab().id)
    // 每个 Tab 都指向一个存在的面板；未选中的面板隐藏且为空
    for (const tab of tabs) {
      const target = document.getElementById(tab.getAttribute('aria-controls') ?? '')
      expect(target?.getAttribute('role')).toBe('tabpanel')
      if (tab.getAttribute('aria-selected') !== 'true') {
        expect(target?.hidden).toBe(true)
        expect(target?.childElementCount).toBe(0)
      }
    }
  })

  it('点击分类 Tab 切换面板，只显示该分类的文章', () => {
    render(<ArticleTabs articles={articles} categories={categories} />)
    fireEvent.click(screen.getByRole('tab', { name: '学院新闻' }))
    expect(selectedTab().textContent).toBe('学院新闻')
    expect(panelTitles()).toEqual(['开放日回顾', '创作营结营'])
    expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([-1, 0, -1, -1])
  })

  it('键盘：右 / 左方向键循环切换并移动焦点，Home / End 到首尾（自动激活）', () => {
    render(<ArticleTabs articles={articles} categories={categories} />)
    const first = screen.getByRole('tab', { name: '全部' })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(selectedTab().textContent).toBe('学院新闻')
    expect(document.activeElement).toBe(selectedTab())

    fireEvent.keyDown(document.activeElement as Element, { key: 'End' })
    expect(selectedTab().textContent).toBe('常见问题')
    expect(panelTitles()).toEqual(['零基础可以学吗'])

    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' })
    expect(selectedTab().textContent).toBe('全部')

    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowLeft' })
    expect(selectedTab().textContent).toBe('常见问题')

    fireEvent.keyDown(document.activeElement as Element, { key: 'Home' })
    expect(selectedTab().textContent).toBe('全部')
    expect(document.activeElement).toBe(selectedTab())
  })

  it('其它按键不切换 Tab', () => {
    render(<ArticleTabs articles={articles} categories={categories} />)
    const first = screen.getByRole('tab', { name: '全部' })
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    fireEvent.keyDown(first, { key: 'Enter' })
    expect(selectedTab().textContent).toBe('全部')
  })

  it('文章行：整行一个链接到 /articles/{slug}，名称为标题，分类与发布日期（北京时间）作为描述', () => {
    render(<ArticleTabs articles={[news1, learn1]} categories={categories} />)
    const link = screen.getByRole('link', { name: '开放日回顾' })
    expect(link.getAttribute('href')).toBe('/articles/open-day')
    const description = document.getElementById(link.getAttribute('aria-describedby') ?? '')
    expect(description?.textContent).toContain('学院新闻')
    expect(description?.textContent).toContain('2026年11月22日')
    const time = description?.querySelector('time')
    expect(time?.getAttribute('dateTime')).toBe('2026-11-22')
  })

  it('出现的分类不足 2 个时不显示 Tab，只显示列表', () => {
    render(<ArticleTabs articles={[news1, news2]} categories={categories} />)
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByRole('tabpanel')).toBeNull()
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/articles/open-day',
      `/articles/${news2.slug}`,
    ])
  })
})
