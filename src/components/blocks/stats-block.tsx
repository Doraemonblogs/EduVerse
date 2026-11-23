import { cn } from '@/lib/utils'
import type { StatsBlock as StatsBlockData } from '@/payload-types'

import type { BlockWidth } from './types'

/** 桌面端按数据项个数平分（最多 4 项，后台限制） */
const desktopColumns: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
}

/**
 * 数据区块：大号数值 + 名称，下方小字为口径与统计时间（广告法要求，后台必填）。
 * 语义上用 dl：名称为 dt，数值与说明为 dd；视觉上数值在最上方。
 */
export function StatsBlock({ block, width }: { block: StatsBlockData; width: BlockWidth }) {
  const items = block.items.slice(0, 4)
  if (!items.length) return null

  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-x-6 gap-y-10 md:gap-x-8',
        width === 'site' && desktopColumns[items.length],
      )}
    >
      {items.map((item, index) => (
        <div key={item.id ?? index} className="flex flex-col gap-1 border-t border-border pt-4">
          <dt className="text-base text-foreground">{item.label}</dt>
          <dd className="numeric order-first text-h1 font-semibold text-foreground">
            {item.value}
          </dd>
          <dd className="mt-1 text-xs text-muted-foreground">{item.note}</dd>
        </div>
      ))}
    </dl>
  )
}
