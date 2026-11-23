import { cn } from '@/lib/utils'
import type { WorkCardData } from '@/lib/works/types'

import { WORK_CARD_SIZES, WorkCard, type WorkCardProps } from './work-card'

export type WorkMasonryProps = {
  works: WorkCardData[]
  /** 作品名的标题层级（见 WorkCard），默认 h3 */
  headingLevel?: WorkCardProps['headingLevel']
  /**
   * 前几件作品的封面高优先级加载（首屏）。CSS 多列按“先填满第一列再换列”排布，
   * 列表前几项都在第一列上方，所以一般只给 1（首屏左上角那张），默认 0（全部懒加载）。
   */
  priorityCount?: number
  /** 封面图 sizes；默认按 2 / 3 / 4 列计算，改列数时一并传入 */
  imageSizes?: string
  /** 追加到列表上的类名（改列数时同时覆盖 md: 与 lg:，如 `md:columns-3 lg:columns-3`） */
  className?: string
}

/**
 * 作品瀑布流（服务端组件）：CSS 多列（移动端 2 列、md 3 列、lg 4 列），每件作品不跨列断开，
 * 封面按原图宽高比排布，形成高低错落。列表语义 <ul role="list">；阅读顺序是逐列自上而下（与视觉一致）。
 * 空数组不渲染（空状态由页面处理）。
 */
export function WorkMasonry({
  works,
  headingLevel,
  priorityCount = 0,
  imageSizes = WORK_CARD_SIZES,
  className,
}: WorkMasonryProps) {
  if (works.length === 0) return null
  return (
    <ul role="list" className={cn('columns-2 gap-3 md:columns-3 md:gap-5 lg:columns-4', className)}>
      {works.map((work, index) => (
        <li key={work.id} className="mb-6 break-inside-avoid md:mb-8">
          <WorkCard
            work={work}
            headingLevel={headingLevel}
            imageSizes={imageSizes}
            priority={index < priorityCount}
          />
        </li>
      ))}
    </ul>
  )
}
