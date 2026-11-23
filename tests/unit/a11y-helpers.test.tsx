// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { NavigationMenu } from 'radix-ui'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import {
  AXE_EXCLUDE,
  type AxeViolation,
  blockingViolations,
  formatViolations,
  headingIssues,
  type HeadingInfo,
  RADIX_NAV_FOCUS_PROXY,
} from '../helpers/axe'

/**
 * 端到端无障碍检查的判断逻辑（tests/helpers/axe.ts）：标题结构、违规筛选与报告格式，
 * 以及 axe 排除项只命中 Radix 大菜单的焦点代理（库升级改了结构时这里先失败）。
 */

const h = (level: number, text = `h${level}`): HeadingInfo => ({ level, text })

describe('headingIssues：唯一 h1、h1 在最前、不跳级', () => {
  it('结构正确时没有问题（回到较浅的级别不受限）', () => {
    expect(headingIssues([h(1), h(2), h(3), h(3), h(2), h(3), h(4), h(2)])).toEqual([])
  })

  it('没有 h1 / 有多个 h1 时报告数量与标题', () => {
    expect(headingIssues([])).toEqual(['应恰好有 1 个 h1，实际 0 个'])
    expect(headingIssues([h(1, '甲'), h(2), h(1, '乙')])).toEqual([
      '应恰好有 1 个 h1，实际 2 个：「甲」、「乙」',
    ])
  })

  it('h1 之前出现其它标题时报告第一个标题', () => {
    expect(headingIssues([h(2, '导航'), h(1, '页面')])).toEqual([
      '第一个标题应为 h1，实际是 h2「导航」',
    ])
  })

  it('跳级时报告前后两个标题', () => {
    expect(headingIssues([h(1, '页面'), h(2, '区块'), h(4, '卡片')])).toEqual([
      '标题跳级：h2「区块」之后是 h4「卡片」',
    ])
    expect(headingIssues([h(1, '页面'), h(3, '卡片')])).toEqual([
      '标题跳级：h1「页面」之后是 h3「卡片」',
    ])
  })
})

const violation = (id: string, impact: AxeViolation['impact'], nodes = 1): AxeViolation => ({
  id,
  impact,
  help: `${id} help`,
  helpUrl: `https://example.test/${id}`,
  nodes: Array.from({ length: nodes }, (_, i) => ({
    target: [`#n${i}`],
    html: `<div id="n${i}"></div>`,
    failureSummary: 'Fix any of the following:\n  first\n  second',
  })),
})

describe('blockingViolations / formatViolations', () => {
  it('只保留 serious 与 critical', () => {
    const all = [
      violation('a', 'minor'),
      violation('b', 'moderate'),
      violation('c', 'serious'),
      violation('d', 'critical'),
      violation('e', null),
    ]
    expect(blockingViolations(all).map((v) => v.id)).toEqual(['c', 'd'])
  })

  it('每条违规一行标题，每个节点一行（折叠空白），超出上限时注明剩余数量', () => {
    expect(formatViolations([violation('color-contrast', 'serious', 3)], 2)).toEqual([
      '[serious] color-contrast: color-contrast help',
      '  - #n0 <div id="n0"></div> → Fix any of the following: first second',
      '  - #n1 <div id="n1"></div> → Fix any of the following: first second',
      '  …另有 1 处',
    ])
    expect(formatViolations([])).toEqual([])
  })
})

describe('AXE_EXCLUDE：Radix 大菜单焦点代理', () => {
  const proxySelector = RADIX_NAV_FOCUS_PROXY

  it('登记在排除项中', () => {
    expect(AXE_EXCLUDE).toContain(proxySelector)
  })

  beforeAll(() => {
    // jsdom 没有 ResizeObserver（Radix 菜单视口用它测量内容尺寸）
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })
  afterEach(cleanup)

  function renderMenu(value: string) {
    return render(
      <NavigationMenu.Root value={value} onValueChange={() => {}} aria-label="主导航">
        <NavigationMenu.List>
          <NavigationMenu.Item value="courses">
            <NavigationMenu.Trigger>专业课程</NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <NavigationMenu.Link href="/courses/a">课程 A</NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="/works">学员作品</NavigationMenu.Link>
          </NavigationMenu.Item>
        </NavigationMenu.List>
        <NavigationMenu.Viewport />
      </NavigationMenu.Root>,
    )
  }

  it('菜单展开时只命中触发按钮后的焦点代理（aria-hidden + tabindex=0 的 span）', () => {
    const { container } = renderMenu('courses')
    const matched = container.querySelectorAll(proxySelector)
    expect(matched).toHaveLength(1)
    const proxy = matched[0]!
    expect(proxy.tagName).toBe('SPAN')
    expect(proxy.previousElementSibling?.textContent).toBe('专业课程')
    expect(proxy.textContent).toBe('')
  })

  it('菜单收起时不渲染焦点代理，排除项不命中任何元素', () => {
    const { container } = renderMenu('')
    expect(container.querySelectorAll(proxySelector)).toHaveLength(0)
  })

  it('不会误伤其它 aria-hidden 的可聚焦元素', () => {
    document.body.innerHTML = `
      <ul>
        <li><button aria-expanded="true">展开</button><span aria-hidden="true" tabindex="0"></span></li>
        <li><button data-state="open" aria-expanded="true">展开</button><span tabindex="0">可见</span></li>
      </ul>
      <span aria-hidden="true" tabindex="0"></span>`
    expect(document.querySelectorAll(proxySelector)).toHaveLength(0)
  })
})
