import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import type { Page } from '@playwright/test'
import type { ImpactValue, Result, RunOptions } from 'axe-core'

/**
 * 端到端测试用的无障碍检查工具：
 * - runAxe：把 node_modules 中的 axe-core 注入页面并运行（不依赖 @axe-core/playwright）；
 * - readHeadings / headingIssues：标题结构（唯一 h1、不跳级）。
 * 浏览器端代码只做采集，判断逻辑是纯函数，单元测试覆盖（tests/unit/a11y-helpers.test.tsx）。
 */

/** 只检查 WCAG 2.x A / AA 规则 */
export const AXE_TAGS = ['wcag2a', 'wcag2aa'] as const

/** 视为不合格的影响等级 */
export const BLOCKING_IMPACTS: readonly ImpactValue[] = ['serious', 'critical']

/**
 * 不参与检查的节点（每一项都要写明原因，并有对应的行为测试兜底）：
 * - nextjs-portal：开发服务器注入的 Next 调试浮层（生产构建不存在），不是站点内容；
 * - Radix NavigationMenu 的焦点代理：菜单展开时紧跟在触发按钮后面的 1px 视觉隐藏 span
 *   （aria-hidden + tabindex=0，库内部实现，无法通过参数关闭）。它获得焦点的同一时刻就把焦点转进菜单内容
 *   （从触发按钮按 Tab）或菜单的最后一个链接（从后面的导航项按 Shift+Tab）；从菜单内容的首 / 尾链接
 *   按 Shift+Tab / Tab 时，库在 keydown 中先聚焦它，再由浏览器默认的 Tab 移到触发按钮 / 下一个导航项。
 *   焦点从不停留在它上面，读屏软件也不会朗读它；axe 只看静态属性会报 aria-hidden-focus。
 *   a11y.e2e.spec.ts 的大菜单用例逐一验证这四个方向。
 */
export const RADIX_NAV_FOCUS_PROXY =
  'li > button[data-state="open"][aria-expanded="true"] + span[aria-hidden="true"][tabindex="0"]'

export const AXE_EXCLUDE = ['nextjs-portal', RADIX_NAV_FOCUS_PROXY] as const

/** 违规项中测试关心的字段（浏览器端裁剪后传回，避免把整份结果序列化回来） */
export type AxeViolation = {
  id: string
  impact: ImpactValue | null
  help: string
  helpUrl: string
  nodes: { target: string[]; html: string; failureSummary: string }[]
}

const require = createRequire(import.meta.url)
let axeSource: string | undefined

function readAxeSource(): string {
  axeSource ??= readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
  return axeSource
}

/** 在当前页面运行 axe（WCAG 2 A / AA），返回全部违规项（含 minor / moderate，由调用方筛选） */
export async function runAxe(page: Page): Promise<AxeViolation[]> {
  const alreadyInjected = await page.evaluate(() => 'axe' in window)
  if (!alreadyInjected) await page.evaluate(readAxeSource())

  const options: RunOptions = {
    runOnly: { type: 'tag', values: [...AXE_TAGS] },
    resultTypes: ['violations'],
    // 页面内的 iframe 只有点击后才出现的第三方播放器 / 地图，测试中不会加载
    iframes: false,
  }
  return page.evaluate(
    async ({ exclude, options }) => {
      type AxeGlobal = {
        run: (
          context: { exclude: string[][] },
          options: RunOptions,
        ) => Promise<{ violations: Result[] }>
      }
      const axe = (window as unknown as { axe: AxeGlobal }).axe
      const { violations } = await axe.run(
        { exclude: exclude.map((selector) => [selector]) },
        options,
      )
      return violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact ?? null,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({
          target: node.target.map(String),
          html: node.html,
          failureSummary: node.failureSummary ?? '',
        })),
      }))
    },
    { exclude: [...AXE_EXCLUDE], options },
  )
}

/** 只保留 serious / critical 级别的违规 */
export function blockingViolations(violations: readonly AxeViolation[]): AxeViolation[] {
  return violations.filter(
    (violation) => violation.impact !== null && BLOCKING_IMPACTS.includes(violation.impact),
  )
}

/** 把违规项整理成便于在断言失败信息中阅读的文本（每个节点一行，最多列出 maxNodes 个） */
export function formatViolations(violations: readonly AxeViolation[], maxNodes = 5): string[] {
  return violations.flatMap((violation) => {
    const head = `[${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}`
    const nodes = violation.nodes.slice(0, maxNodes).map((node) => {
      const summary = node.failureSummary.replace(/\s+/g, ' ').trim()
      return `  - ${node.target.join(' ')} ${node.html.slice(0, 160)}${summary ? ` → ${summary}` : ''}`
    })
    const rest = violation.nodes.length - maxNodes
    return [head, ...nodes, ...(rest > 0 ? [`  …另有 ${rest} 处`] : [])]
  })
}

export type HeadingInfo = { level: number; text: string }

/**
 * 读取页面上辅助技术可感知的标题（h1–h6 与 role="heading"），按文档顺序。
 * 跳过不可感知的：display:none / visibility:hidden、aria-hidden、inert 子树内的标题。
 * 视觉隐藏（sr-only）的标题仍然计入——读屏软件会读到它们。
 */
export async function readHeadings(page: Page): Promise<HeadingInfo[]> {
  return page.evaluate(() => {
    const nodes = document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [role="heading"]')
    const headings: { level: number; text: string }[] = []
    for (const el of nodes) {
      if (el.closest('[aria-hidden="true"], [inert], nextjs-portal')) continue
      if (!el.checkVisibility({ visibilityProperty: true })) continue
      const role = el.getAttribute('role')
      if (role && role !== 'heading') continue
      const ariaLevel = Number(el.getAttribute('aria-level'))
      const tagLevel = /^H([1-6])$/.exec(el.tagName)?.[1]
      const level = ariaLevel >= 1 ? ariaLevel : tagLevel ? Number(tagLevel) : 2
      headings.push({ level, text: (el.textContent ?? '').replace(/\s+/g, ' ').trim() })
    }
    return headings
  })
}

/**
 * 标题结构问题：
 * - 必须恰好一个 h1，并且它是第一个标题（头部 / 导航中不能有更高或同级的标题抢在前面）；
 * - 不跳级：每个标题最多比前一个标题深一级（h2 → h4 不行；回到较浅的级别不受限）。
 */
export function headingIssues(headings: readonly HeadingInfo[]): string[] {
  const issues: string[] = []
  const h1s = headings.filter((heading) => heading.level === 1)
  if (h1s.length !== 1) {
    issues.push(
      `应恰好有 1 个 h1，实际 ${h1s.length} 个${h1s.length ? `：${h1s.map((h) => `「${h.text}」`).join('、')}` : ''}`,
    )
  }
  const first = headings[0]
  if (first && first.level !== 1) {
    issues.push(`第一个标题应为 h1，实际是 h${first.level}「${first.text}」`)
  }
  for (let i = 1; i < headings.length; i++) {
    const previous = headings[i - 1]!
    const current = headings[i]!
    if (current.level > previous.level + 1) {
      issues.push(
        `标题跳级：h${previous.level}「${previous.text}」之后是 h${current.level}「${current.text}」`,
      )
    }
  }
  return issues
}
