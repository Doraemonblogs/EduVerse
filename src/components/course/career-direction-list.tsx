import type { CareerDirection } from '@/lib/course/types'
import { cn } from '@/lib/utils'

export type CareerDirectionListProps = {
  items: CareerDirection[]
  /** 每个方向标题的层级，默认 h3（区块标题为 h2 时） */
  headingLevel?: 'h3' | 'h4'
  /** 桌面端列数，默认 2；与薪资卡并排时用 1 */
  columns?: 1 | 2
  className?: string
}

/** 就业 / 发展方向列表（服务端组件）：岗位名 + 说明，细线分隔，不加装饰图标；空数组不渲染 */
export function CareerDirectionList({
  items,
  headingLevel: Heading = 'h3',
  columns = 2,
  className,
}: CareerDirectionListProps) {
  if (items.length === 0) return null
  return (
    <ul
      role="list"
      className={cn('grid gap-x-8 gap-y-6', columns === 2 && 'sm:grid-cols-2', className)}
    >
      {items.map((item, index) => (
        <li
          key={`${index}-${item.title}`}
          className="flex flex-col gap-2 border-t border-border pt-4"
        >
          <Heading className="text-h4 text-foreground">{item.title}</Heading>
          {item.description ? (
            <p className="text-base text-muted-foreground">{item.description}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
