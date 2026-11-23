// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import { cn } from '@/lib/utils'

/**
 * 桌面端右侧悬浮操作栏（FloatingActions）的让位：
 * - globals.css 的 avoid-floating-actions 留出的宽度不小于悬浮栏实际占位；
 * - 会停在悬浮栏旁边的内容（课程详情吸顶侧栏、页脚各行）都用了它；
 * - 页脚转化区在 lg 以下上下排列，按钮组不收缩，热线号码不换行。
 * 真实布局（1024–1440px 不重叠、无横向滚动）由页面 e2e / 截图自查覆盖。
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
const { SiteFooter } = await import('@/components/layout/site-footer')

const root = path.resolve(__dirname, '../..')
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')
const css = read('src/styles/globals.css')

/** 取出 @utility name { ... } 的内容（支持嵌套括号） */
function utility(name: string): string {
  const match = new RegExp(`@utility\\s+${name}\\s*\\{`).exec(css)
  if (!match) throw new Error(`找不到 @utility ${name}`)
  const start = css.indexOf('{', match.index)
  let depth = 0
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}') depth--
    if (depth === 0) return css.slice(start + 1, i)
  }
  throw new Error('花括号不匹配')
}

afterEach(() => cleanup())

describe('avoid-floating-actions', () => {
  const body = utility('avoid-floating-actions')

  it('右侧留白取常规留白、安全区与“悬浮栏占位 − 版心外页边距”中的较大值', () => {
    const value = body.replace(/\s+/g, ' ')
    expect(value).toMatch(/padding-right: max\( ?var\(--spacing-gutter\),/)
    expect(value).toContain('env(safe-area-inset-right, 0px)')
    expect(value).toMatch(
      /calc\(5rem - max\(0px, \(100% - var\(--container-site\)\) \/ 2 - var\(--spacing-gutter\)\)\)/,
    )
  })

  it('5rem 不小于悬浮栏的实际占位（距右 0.75rem + 宽 3.5rem + 两侧 1px 边框）', () => {
    const source = read('src/components/layout/contact-actions.tsx')
    const aside = /<aside[\s\S]*?className="([^"]*)"/.exec(
      source.slice(source.indexOf('export function FloatingActions')),
    )?.[1]
    expect(aside).toContain('right-[max(0.75rem,env(safe-area-inset-right,0px))]')
    expect(aside).toContain('lg:flex')
    // 悬浮栏内的按钮宽 w-14 / size-14（3.5rem）
    expect(source).toContain('w-14')
    const occupied = 0.75 * 16 + 3.5 * 16 + 2
    expect(occupied).toBeLessThan(5 * 16)
  })

  it('按 1024–1600px 的视口计算，版心右缘始终在悬浮栏左侧至少 10px', () => {
    const rem = 16
    for (let width = 1024; width <= 1600; width += 4) {
      // --spacing-gutter: clamp(1rem, -0.25rem + 3.2vw, 2.5rem)
      const gutter = Math.min(Math.max(rem, -0.25 * rem + 0.032 * width), 2.5 * rem)
      const outer = Math.min(width, 80 * rem + gutter * 2)
      const margin = (width - outer) / 2
      const padding = Math.max(gutter, 5 * rem - Math.max(0, (width - 80 * rem) / 2 - gutter))
      const contentRight = width - margin - padding
      const barLeft = width - 0.75 * rem - 3.5 * rem - 2
      expect(barLeft - contentRight, `视口 ${width}px`).toBeGreaterThanOrEqual(10 - 1e-9)
      // 视口足够宽时不额外收窄版心
      if (width >= 1440) expect(padding).toBe(gutter)
    }
  })

  it('tailwind-merge 不会把它当作 clear-* 等类去掉', () => {
    expect(cn('container-site', 'lg:avoid-floating-actions', 'clear-both')).toBe(
      'container-site lg:avoid-floating-actions clear-both',
    )
  })

  it('课程详情的两栏网格（吸顶侧栏）使用 lg:avoid-floating-actions', () => {
    expect(read('src/components/course/detail/course-detail-view.tsx')).toContain(
      'lg:avoid-floating-actions',
    )
  })
})

describe('页脚', () => {
  const leadConfig: LeadFormConfig = {
    disciplines: [],
    cities: [],
    successTitle: '提交成功',
    successMessage: '',
    wechatId: null,
    wechatQr: null,
    hotline: null,
  }

  function renderFooter() {
    return render(
      <LeadDialogProvider config={leadConfig}>
        <SiteFooter
          footer={{
            id: 1,
            cta: {
              enabled: true,
              title: '先来听一节课，再决定学什么',
              description: '课程顾问会根据你的情况安排试听。',
              buttonLabel: '免费预约试听',
            },
            columns: [{ title: '专业课程', links: [{ label: '三维动画', href: '/majors/a' }] }],
            bottomLinks: [{ label: '隐私政策', href: '/privacy' }],
            copyright: '© {year} 示例',
          }}
          settings={{
            id: 1,
            brandName: 'EduVerse 数艺学院',
            shortName: 'EduVerse',
            hotline: '400-000-0000',
            salaryDisclaimer: '仅供参考',
            privacyPolicyVersion: '1',
          }}
        />
      </LeadDialogProvider>,
    )
  }

  it('转化区 lg 以下上下排列；按钮组不收缩，热线号码不换行（768px 下不会被挤成竖排）', () => {
    const { container } = renderFooter()
    const band = container.querySelector('[data-footer-cta] > div')!
    const classes = band.className.split(/\s+/)
    expect(classes).toContain('flex-col')
    expect(classes).toContain('lg:flex-row')
    expect(classes).not.toContain('md:flex-row')

    const hotline = screen.getByRole('link', { name: /咨询热线/ })
    expect(hotline.getAttribute('href')).toBe('tel:4000000000')
    expect(hotline.className).toContain('whitespace-nowrap')
    expect(hotline.parentElement!.className.split(/\s+/)).toContain('shrink-0')
    expect(band.firstElementChild!.className.split(/\s+/)).toContain('min-w-0')
  })

  it('页脚各行都给悬浮操作栏让位（滚到底时热线与二维码不被遮挡，各行右缘对齐）', () => {
    const { container } = renderFooter()
    const rows = container.querySelectorAll('footer .container-site')
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(row.className.split(/\s+/)).toContain('lg:avoid-floating-actions')
    }
  })
})
