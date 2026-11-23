// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import { zh } from '@/i18n/zh'

/**
 * 头部与 Logo：大菜单触发按钮的键盘焦点描边、Logo 的无障碍名称与图片加载方式。
 * 计算样式（描边是否真的可见）由 e2e 覆盖，这里校验组件输出。
 */
const pathname = vi.hoisted(() => ({ current: '/' }))

vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))
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
const { SiteHeader } = await import('@/components/layout/site-header')
const { Logo } = await import('@/components/layout/logo')

const leadConfig: LeadFormConfig = {
  disciplines: [],
  cities: [],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const logoMedia = { id: 1, url: '/api/media/file/logo.png', width: 240, height: 64, alt: '' }

beforeEach(() => {
  pathname.current = '/'
})
afterEach(cleanup)

function renderHeader() {
  render(
    <LeadDialogProvider config={leadConfig}>
      <SiteHeader
        brand={{ name: 'EduVerse 数艺学院', shortName: 'EduVerse' }}
        items={[
          { label: '首页', type: 'link', href: '/' },
          { label: '专业课程', type: 'course_menu' },
          { label: '学员作品', type: 'link', href: '/works' },
        ]}
        ctaLabel="预约试听"
        showSearch
        hotline={null}
        groups={[]}
        campuses={[]}
      />
    </LeadDialogProvider>,
  )
}

describe('站点头部', () => {
  it.each(['/', '/courses/3d-animation', '/majors/game-art'])(
    '在 %s 上，“专业课程”大菜单按钮保留键盘焦点描边（不移除 outline）',
    (path) => {
      pathname.current = path
      renderHeader()
      const trigger = screen.getByRole('button', { name: '专业课程' })
      expect(trigger.className).not.toMatch(/(^|\s)outline-none(\s|$)/)
      // 描边向内收：吸顶头部贴着视口顶端时上沿不会被裁掉
      expect(trigger.className).toContain('focus-visible:-outline-offset-2')
    },
  )

  it('Logo 链接的无障碍名称使用 zh.ts 中的文案', () => {
    renderHeader()
    const label = zh.layout.logoHomeLabel.replace('{brand}', 'EduVerse 数艺学院')
    expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe('/')
  })
})

describe('Logo 无障碍名称', () => {
  it('品牌名里的 $ 字符原样保留（不被当作字符串替换模式）', () => {
    render(<Logo brandName="Edu$&Verse $' 学院" />)
    expect(screen.getByRole('link').getAttribute('aria-label')).toBe(
      zh.layout.logoHomeLabel.split('{brand}').join("Edu$&Verse $' 学院"),
    )
  })
})

describe('Logo 图片加载方式', () => {
  it('头部 Logo 立即加载，但不使用已弃用的 priority（不抢占高优先级预加载）', () => {
    render(<Logo brandName="EduVerse 数艺学院" logo={logoMedia} loading="eager" />)
    const img = screen.getByRole('link').querySelector('img')
    expect(img?.getAttribute('loading')).toBe('eager')
    expect(img?.getAttribute('fetchpriority')).toBeNull()
  })

  it('页脚等首屏外的 Logo 默认懒加载', () => {
    render(<Logo brandName="EduVerse 数艺学院" logo={logoMedia} />)
    const img = screen.getByRole('link').querySelector('img')
    expect(img?.getAttribute('loading')).toBe('lazy')
    expect(img?.getAttribute('fetchpriority')).toBeNull()
  })
})
