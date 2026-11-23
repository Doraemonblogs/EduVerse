'use client'

import { useEffect, useRef } from 'react'

/**
 * 把横向滚动的分类导航滚到当前项（aria-current="page"）上，让它居中显示。
 * 只在列表有横向溢出、且当前项不完整可见时处理（移动端分类多时排在后面的“常见问题”会在屏幕外）；
 * 直接设置 scrollLeft（不用 scrollIntoView，避免带动页面纵向滚动），没有动画，无需处理减少动态效果。
 */
export function revealCurrentItem(list: HTMLElement): void {
  if (list.scrollWidth <= list.clientWidth) return
  const current = list.querySelector<HTMLElement>('[aria-current="page"]')
  if (!current) return
  const listBox = list.getBoundingClientRect()
  const box = current.getBoundingClientRect()
  if (box.left >= listBox.left && box.right <= listBox.right) return
  const offset = box.left - listBox.left + list.scrollLeft
  list.scrollLeft = Math.max(0, offset - (list.clientWidth - box.width) / 2)
}

/**
 * 是否需要把当前项滚进可见范围：
 * - 当前分类变了（客户端导航到另一个分类）→ 需要；
 * - 首次挂载（水合）时，访客可能已经在页面接管前横向滑动过导航：列表不在起点（scrollLeft ≠ 0）就尊重访客的位置，
 *   不再跳回当前项（否则正要点击的选项会被挪走）。
 */
export function shouldRevealCurrent(changed: boolean, scrollLeft: number): boolean {
  return changed || scrollLeft === 0
}

/**
 * 挂载后（以及切换分类后）把分类导航的当前项滚进可见范围。不渲染任何可见内容；
 * 放在横向滚动的 <ul> 旁边（同一个父元素里）。
 */
export function RevealCurrentCategory({ current }: { current: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  // 上一次处理过的当前项：开发环境 StrictMode 重复执行 effect 时不算“变了”
  const seen = useRef<string | null>(null)

  useEffect(() => {
    const changed = seen.current !== null && seen.current !== current
    seen.current = current
    const list = ref.current?.parentElement?.querySelector<HTMLElement>('ul')
    if (list && shouldRevealCurrent(changed, list.scrollLeft)) revealCurrentItem(list)
  }, [current])

  return <span ref={ref} hidden />
}
