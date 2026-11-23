// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GAME, workCard } from '../helpers/work-fixtures'

/**
 * 作品卡片与瀑布流（jsdom）。瀑布流的列数与排布由页面 e2e 覆盖。
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

const { WorkCard } = await import('@/components/works/work-card')
const { WorkMasonry } = await import('@/components/works/work-masonry')

afterEach(cleanup)

const describedText = (element: HTMLElement) =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent)

describe('WorkCard', () => {
  it('整张卡片一个链接到作品详情，无障碍名称为作品名，署名与专业作为描述', () => {
    render(<WorkCard work={workCard({ id: 42 })} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    const link = screen.getByRole('link', { name: '《灯塔守望者》角色动画短片' })
    expect(link.getAttribute('href')).toBe('/works/42')
    expect(describedText(link)).toEqual(['林同学 · 2026 届，三维动画'])
    expect(
      within(link).getByRole('heading', { level: 3, name: '《灯塔守望者》角色动画短片' }),
    ).toBeTruthy()
  })

  it('封面按原图宽高比（不裁切），alt 缺省时用作品名；默认懒加载', () => {
    render(
      <WorkCard
        work={workCard({
          cover: { src: '/api/media/file/w.webp', alt: '', width: 800, height: 1067 },
        })}
      />,
    )
    const image = screen.getByAltText('《灯塔守望者》角色动画短片')
    expect(image.getAttribute('width')).toBe('800')
    expect(image.getAttribute('height')).toBe('1067')
    expect(image.className).toContain('h-auto')
    expect(image.className).not.toContain('object-cover')
    expect(image.getAttribute('loading')).toBe('lazy')
  })

  it('精选作品显示文字徽标“精选”，并加入链接描述；首屏图高优先级', () => {
    render(
      <WorkCard
        work={workCard({ featured: true, discipline: GAME, cohortLabel: null })}
        headingLevel="h2"
        priority
      />,
    )
    const link = screen.getByRole('link')
    expect(describedText(link)).toEqual(['精选', '林同学，游戏'])
    expect(screen.getByText('精选')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy()
    const image = screen.getByRole('img')
    expect(image.getAttribute('loading')).toBe('eager')
    expect(image.getAttribute('fetchpriority')).toBe('high')
  })

  it('没有署名与专业方向（未发布）时不加描述，也不显示空行', () => {
    render(
      <WorkCard
        work={workCard({ authorName: null, cohortLabel: null, discipline: null, cover: null })}
      />,
    )
    const link = screen.getByRole('link')
    expect(link.hasAttribute('aria-describedby')).toBe(false)
    expect(link.querySelector('p')).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('WorkMasonry', () => {
  it('CSS 多列瀑布流：<ul role="list">，每项不跨列断开；只有前 priorityCount 张高优先级', () => {
    const works = [workCard({ id: 1 }), workCard({ id: 2 }), workCard({ id: 3 })]
    render(<WorkMasonry works={works} priorityCount={1} />)
    const list = screen.getByRole('list')
    expect(list.className).toContain('columns-2')
    expect(list.className).toContain('md:columns-3')
    expect(list.className).toContain('lg:columns-4')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    for (const item of items) expect(item.className).toContain('break-inside-avoid')
    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/works/1', '/works/2', '/works/3'])
    expect(
      within(list)
        .getAllByRole('img')
        .map((img) => img.getAttribute('loading')),
    ).toEqual(['eager', 'lazy', 'lazy'])
    // 同一作品名出现多次时，各卡片的 id 互不冲突
    const ids = within(list)
      .getAllByRole('heading')
      .map((h) => h.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('空数组不渲染', () => {
    const { container } = render(<WorkMasonry works={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
