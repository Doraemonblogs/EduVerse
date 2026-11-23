import * as React from 'react'

import { cn } from '@/lib/utils'

import { HorizontalScrollerControls } from './horizontal-scroller-controls'

/**
 * 每屏可见项数（--scroller-per-view，可为小数：露出下一项的一部分，提示可以横滑）。
 * 依次为移动端 → sm → md → lg（desktop="scroll" 时桌面端也按它排布）。
 */
const ITEM_SIZES = {
  /** 大卡片（课程、学员故事、校区）：1.15 → 2.15 → 3 */
  card: '[--scroller-per-view:1.15] sm:[--scroller-per-view:2.15] lg:[--scroller-per-view:3]',
  /** 中等卡片（讲师、作品）：1.6 → 2.6 → 3.3 → 4 */
  compact:
    '[--scroller-per-view:1.6] sm:[--scroller-per-view:2.6] md:[--scroller-per-view:3.3] lg:[--scroller-per-view:4]',
  /** Logo：2.6 → 3.6 → 4.6 → 6 */
  logo: '[--scroller-per-view:2.6] sm:[--scroller-per-view:3.6] md:[--scroller-per-view:4.6] lg:[--scroller-per-view:6]',
} as const

/** desktop="grid" 时的列数，按改为网格的断点（gridFrom）区分（Tailwind 只识别完整类名） */
const GRID_COLUMNS = {
  lg: {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  },
  xl: {
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
    6: 'xl:grid-cols-6',
  },
} as const

/** 桌面端（≥ lg）横滑：列表左右各让出 4px，列表项的焦点描边不被滚动容器裁掉 */
const DESKTOP_SCROLL = 'lg:-mx-1 lg:scroll-px-1 lg:px-1'

/** desktop="grid"：从 gridFrom 断点起改为网格（不能滚动）；gridFrom="xl" 时 lg–xl 之间仍按横滑排布 */
const DESKTOP_GRID = {
  lg: 'lg:my-0 lg:grid lg:overflow-visible lg:py-0',
  xl: `${DESKTOP_SCROLL} xl:mx-0 xl:my-0 xl:grid xl:overflow-visible xl:scroll-px-0 xl:px-0 xl:py-0`,
} as const

/** 改为网格后隐藏进度条与按钮 */
const GRID_HIDES_CONTROLS = { lg: 'lg:hidden', xl: 'xl:hidden' } as const

export type HorizontalScrollerProps = {
  /** 滚动区域的无障碍名称（列表的 aria-label，也用于按钮的“{label}：上一组”），如区块标题 */
  label: string
  /** 每个直接子元素渲染为一个 <li>（须带 key）；Fragment 算一项 */
  children: React.ReactNode
  /** 项宽度预设（每屏可见项数），默认 card */
  size?: keyof typeof ITEM_SIZES
  /**
   * 桌面端（≥ lg）：scroll 继续横滑（默认）；grid 改为网格（columns 列，从 gridFrom 断点开始），
   * 此时进度条与按钮在网格断点起隐藏，列表也不再可聚焦（不能滚动）
   */
  desktop?: 'scroll' | 'grid'
  /** desktop="grid" 时的列数，默认 4 */
  columns?: keyof (typeof GRID_COLUMNS)['lg']
  /**
   * desktop="grid" 时从哪个断点起改为网格，默认 lg。
   * 卡片在 1024–1279px 排成多列会过窄时用 xl：lg–xl 之间继续横滑（按 size 预设的每屏项数，带进度条与按钮）
   */
  gridFrom?: 'lg' | 'xl'
  /** 显示上一组 / 下一组按钮（aria-label，滚到头时禁用），默认 false */
  controls?: boolean
  /** 显示底部进度条（装饰性，aria-hidden），默认 true */
  progress?: boolean
  /**
   * 移动端（< lg）左右出血到视口边缘，默认 true。
   * 只在列表直接位于版心（Container）内容区时使用；放在卡片、栅格列等更窄的容器里时传 false。
   */
  bleed?: boolean
  /** 追加到最外层容器 */
  className?: string
  /** 追加到 <ul>（如调整间距：`[--scroller-gap:0.75rem]`） */
  listClassName?: string
  /** 追加到每个 <li>（如 `[--scroller-per-view:1.3]` 覆盖预设，或 `flex` 让卡片等高） */
  itemClassName?: string
}

/**
 * 通用横滑容器（服务端 / 客户端组件都能用）：CSS scroll-snap 的 <ul> 列表，不引入轮播库。
 * - 移动端露出下一项的一部分；桌面端继续横滑，或用 desktop="grid" 改为网格（gridFrom 指定从 lg 还是 xl 开始）；
 * - 键盘：列表可聚焦（tabIndex=0 + aria-label），聚焦后可用左右方向键滚动；列表项内的链接按顺序 Tab 到达；
 * - 进度条与按钮是唯一的客户端部分（HorizontalScrollerControls）；内容不超出时不显示；
 * - prefers-reduced-motion 时不平滑滚动；列表自身横向滚动，不会出现页面级横向滚动条。
 * 空列表不渲染。
 *
 * @example
 * <HorizontalScroller label={heading.title} desktop="grid" columns={4} size="compact">
 *   {teachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)}
 * </HorizontalScroller>
 */
export function HorizontalScroller({
  label,
  children,
  size = 'card',
  desktop = 'scroll',
  columns = 4,
  gridFrom = 'lg',
  controls = false,
  progress = true,
  bleed = true,
  className,
  listClassName,
  itemClassName,
}: HorizontalScrollerProps) {
  const listId = React.useId()
  const items = React.Children.toArray(children)
  if (items.length === 0) return null
  const grid = desktop === 'grid'

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <ul
        id={listId}
        role="list"
        aria-label={label}
        tabIndex={0}
        className={cn(
          'flex snap-x snap-mandatory gap-(--scroller-gap) overflow-x-auto overscroll-x-contain',
          // 定位上下文：卡片里的绝对定位后代（如读屏文字 sr-only）以列表为包含块，才会被横向滚动裁剪；
          // 否则它们按视口定位、不受裁剪，滚到视口外的卡片会撑出页面级横向滚动条
          'relative',
          '[--scroller-gap:1rem] lg:[--scroller-gap:1.5rem]',
          'scroll-smooth motion-reduce:scroll-auto',
          // 列表项的焦点描边（外扩 2px）不被滚动容器裁掉；列表自身的描边画在内侧
          '-my-1 py-1 focus-visible:-outline-offset-2',
          controls || progress ? 'scrollbar-none' : '[scrollbar-width:thin]',
          ITEM_SIZES[size],
          bleed && 'max-lg:scroller-bleed',
          grid ? cn(DESKTOP_GRID[gridFrom], GRID_COLUMNS[gridFrom][columns]) : DESKTOP_SCROLL,
          listClassName,
        )}
      >
        {items.map((item, index) => (
          <li
            key={React.isValidElement(item) && item.key !== null ? item.key : index}
            className={cn('scroller-item min-w-0 snap-start', itemClassName)}
          >
            {item}
          </li>
        ))}
      </ul>
      <HorizontalScrollerControls
        targetId={listId}
        label={label}
        controls={controls}
        progress={progress}
        className={grid ? GRID_HIDES_CONTROLS[gridFrom] : undefined}
      />
    </div>
  )
}
