import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'

/**
 * 资讯列表 / 分类页 / 资讯详情在 1024–1439px 的版式：桌面端悬浮操作栏固定在视口右侧中部，
 * 贴着版心右缘的内容（列表第三列卡片、相关文章右列、“更多{分类}”链接、吸顶的留资卡片）必须让出位置，
 * 页面上各版心的右缘一致（与首页、校区、就业服务页同一做法：lg:avoid-floating-actions）。
 * ≥ 1440px 时页边距已经够宽，不需要额外让位；移动端没有悬浮栏。
 * 只读页面，不提交线索。
 */

// 开发服务器首次访问某个路由时要现编译，留足时间
test.describe.configure({ timeout: 120_000 })

const WIDTHS = [1024, 1280, 1366]

/** <main> 里每个版心（Container 输出 .container-site）的内容右缘（减去右内边距） */
async function containerContentEdges(page: Page) {
  return page.locator('main .container-site').evaluateAll((containers) =>
    containers.map((container) => {
      const rect = container.getBoundingClientRect()
      return Math.round(rect.right - Number.parseFloat(getComputedStyle(container).paddingRight))
    }),
  )
}

/**
 * <main> 里看得见的链接与按钮（不含被横向滚动容器裁掉的项、读屏专用的 1px 元素）中，
 * 右缘越过 limit 的，返回其名称与右缘。
 */
async function controlsPastEdge(page: Page, limit: number) {
  return page.locator('main').evaluate((main, edge) => {
    const clippedByScroller = (element: Element) => {
      const rect = element.getBoundingClientRect()
      for (
        let parent = element.parentElement;
        parent && parent !== main;
        parent = parent.parentElement
      ) {
        if (getComputedStyle(parent).overflowX === 'visible') continue
        const box = parent.getBoundingClientRect()
        if (rect.right > box.right + 1 || rect.left < box.left - 1) return true
      }
      return false
    }
    return [...main.querySelectorAll('a, button')].flatMap((element) => {
      const rect = element.getBoundingClientRect()
      if (rect.width <= 1 || rect.height <= 1 || clippedByScroller(element)) return []
      if (rect.right <= edge) return []
      const name = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? ''
      return [`${name.slice(0, 30)} → ${Math.round(rect.right)}`]
    })
  }, limit)
}

/** 在各宽度下打开 path：版心右缘一致且在悬浮栏左侧，看得见的链接与按钮都不在悬浮栏下面 */
async function expectClearOfFloatingActions(page: Page, path: string) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 })
    const response = await page.goto(path)
    expect(response?.status(), path).toBe(200)
    const bar = await page.getByRole('complementary', { name: '快捷咨询' }).boundingBox()
    expect(bar, `${width}px 应显示悬浮操作栏`).not.toBeNull()

    const edges = await containerContentEdges(page)
    expect(edges.length, `${path} 的版心个数`).toBeGreaterThan(1)
    expect(new Set(edges).size, `${width}px ${path} 各版心右缘：${JSON.stringify(edges)}`).toBe(1)
    expect(edges[0]!, `${width}px ${path} 内容右缘应在悬浮栏左侧`).toBeLessThan(bar!.x)
    // 分类导航（横滑列表）在桌面端右侧不出血：分类多到需要横滑时，滚动区域也止于版心右缘
    const categoryList = page.getByRole('navigation', { name: '资讯分类' }).getByRole('list')
    if (await categoryList.count()) {
      const list = await categoryList.boundingBox()
      expect(
        Math.round(list!.x + list!.width),
        `${width}px ${path} 分类导航滚动区域的右缘`,
      ).toBeLessThanOrEqual(edges[0]!)
    }
    expect(
      await controlsPastEdge(page, bar!.x),
      `${width}px ${path} 越过悬浮栏左缘的链接与按钮`,
    ).toEqual([])
  }
}

test.describe('资讯页面给桌面悬浮操作栏让位（1024–1366px）', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, '悬浮操作栏只在 ≥ 1024px 显示')
  })

  test('资讯列表与分类页：标题区、分类导航与三列文章网格都在悬浮栏左侧', async ({ page }) => {
    await expectClearOfFloatingActions(page, '/articles')

    // 第一个有文章的分类（分类导航第二项，第一项是“全部”）
    const nav = page.getByRole('navigation', { name: '资讯分类' })
    const href = await nav.getByRole('link').nth(1).getAttribute('href')
    expect(href, '种子数据应有资讯分类').toMatch(/\/articles\/category\/[\w-]+$/)
    await expectClearOfFloatingActions(page, new URL(href!, page.url()).pathname)
  })

  test('资讯详情：标题区、正文与侧栏、相关文章（含“更多{分类}”）都在悬浮栏左侧', async ({
    page,
  }) => {
    // 列表第 1 页的头条（有分类、同分类有其它文章时才有“相关文章”）
    await page.goto('/articles')
    const href = await page
      .getByRole('main')
      .locator('a[href*="/articles/"]:not([href*="/category/"])')
      .first()
      .getAttribute('href')
    expect(href).toBeTruthy()
    const path = new URL(href!, page.url()).pathname
    await page.goto(path)
    await expect(page.getByRole('region', { name: '相关文章' })).toBeVisible()
    await expectClearOfFloatingActions(page, path)
  })
})
