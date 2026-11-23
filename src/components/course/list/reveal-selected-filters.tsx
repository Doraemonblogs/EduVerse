'use client'

import { useEffect, useRef } from 'react'

/** 筛选行（横向滚动的 <ul>）的选择器，与 CourseFilterBar 的 aria-labelledby 约定一致 */
export const FILTER_ROW_SELECTOR = 'ul[aria-labelledby^="course-filter-"]'

/**
 * 把横向滚动的筛选行滚到当前选中项（aria-current）上，让它居中显示。
 * 只处理有横向溢出、且选中项不完整可见的行：点选可见的选项不会挪动；
 * 直接设置 scrollLeft（不用 scrollIntoView，避免带动页面纵向滚动），没有动画，无需处理减少动态效果。
 */
export function revealSelectedFilters(root: ParentNode): void {
  for (const row of root.querySelectorAll<HTMLElement>(FILTER_ROW_SELECTOR)) {
    if (row.scrollWidth <= row.clientWidth) continue
    const selected = row.querySelector<HTMLElement>('[aria-current="true"]')
    if (!selected) continue
    const rowBox = row.getBoundingClientRect()
    const box = selected.getBoundingClientRect()
    if (box.left >= rowBox.left && box.right <= rowBox.right) continue
    const offset = box.left - rowBox.left + row.scrollLeft
    row.scrollLeft = Math.max(0, offset - (row.clientWidth - box.width) / 2)
  }
}

/**
 * 移动端筛选行默认停在最左侧，排在后面的选中项（如“杭州”）会在屏幕外，
 * 打开分享链接或从课程详情返回时看不出当前筛了什么。挂载后、以及筛选条件变化后
 * 把每一行的选中项滚进可见范围。不渲染任何可见内容（桌面端各行自动换行，不受影响）。
 */
export function RevealSelectedFilters({ selection }: { selection: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const nav = ref.current?.closest('nav')
    if (nav) revealSelectedFilters(nav)
  }, [selection])

  return <span ref={ref} hidden />
}
