/**
 * 首页下半部分（区块 5–11）的版式规则（纯函数，单元测试覆盖）。
 * 横滑容器（HorizontalScroller）在移动端总是横滑；这里决定桌面端（≥ lg）用网格还是继续横滑。
 */

export type GridColumns = 2 | 3 | 4 | 5 | 6

export type DesktopLayout =
  | {
      desktop: 'grid'
      columns: GridColumns
      /** 从哪个断点起改为网格（xl：1024–1279px 之间继续横滑） */
      from: 'lg' | 'xl'
    }
  | { desktop: 'scroll' }

/**
 * 卡片区块的桌面端版式：不超过 maxColumns × maxRows 张时用网格（一眼看全），列数为
 * min(张数, maxColumns)（至少 2 列，单张卡片不会撑满整行）；更多时继续横滑（带上一组 / 下一组按钮）。
 * lgMaxColumns：1024–1279px（版心再给悬浮操作栏让位后约 900px）最多排几列；网格列数超过它时，
 * 这一段继续横滑（每屏项数按 HorizontalScroller 的 size 预设），xl 起才改为网格，避免卡片过窄、文字逐字折行。
 */
export function cardDesktopLayout(
  count: number,
  {
    maxColumns,
    maxRows,
    lgMaxColumns = maxColumns,
  }: { maxColumns: 2 | 3 | 4; maxRows: number; lgMaxColumns?: 2 | 3 | 4 },
): DesktopLayout {
  if (count > maxColumns * maxRows) return { desktop: 'scroll' }
  const columns = Math.min(maxColumns, Math.max(2, count)) as GridColumns
  return { desktop: 'grid', columns, from: columns > lgMaxColumns ? 'xl' : 'lg' }
}

/** 桌面端版式 → HorizontalScroller 的 desktop / columns / gridFrom（展开传入） */
export function scrollerLayoutProps(layout: DesktopLayout) {
  return layout.desktop === 'grid'
    ? ({ desktop: 'grid', columns: layout.columns, gridFrom: layout.from } as const)
    : ({ desktop: 'scroll' } as const)
}

/**
 * Logo 墙（≥ lg）的列数：在 6 列与 5 列之间选最后一行最满的（整除最好；同样满时取 6 列，Logo 不会过大）。
 * 例：20 家 → 5 列 × 4 行；18 / 24 家 → 6 列；不足 6 家时一行 6 列（左对齐）。
 */
export function logoWallColumns(count: number): 5 | 6 {
  if (count <= 6) return 6
  const fill = (columns: number) => {
    const rest = count % columns
    return rest === 0 ? 1 : rest / columns
  }
  return fill(5) > fill(6) ? 5 : 6
}

/**
 * 按断点只显示前若干项（作品网格：移动端 6 件 = 2 列 × 3 行、md 9 件 = 3 列 × 3 行，≥ lg 全部），返回追加到列表项的类名。
 * 用 display:none 隐藏，读屏与 Tab 顺序同步跳过；完整列表在“查看更多作品”。
 */
export const WORKS_VISIBLE = { mobile: 6, tablet: 9 } as const

export function worksItemVisibility(index: number): string | undefined {
  if (index >= WORKS_VISIBLE.tablet) return 'max-lg:hidden'
  if (index >= WORKS_VISIBLE.mobile) return 'max-md:hidden'
  return undefined
}
