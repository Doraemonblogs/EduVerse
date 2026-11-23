import { cn } from '@/lib/utils'
import type { TimelineBlock as TimelineBlockData } from '@/payload-types'

import type { BlockWidth } from './types'

/**
 * 时间线区块：竖向有序列表，左侧为时间轴与节点标记。
 * 常规版心下 ≥ md 时间单独成列（右对齐），轴线位于时间与内容之间。
 */
export function TimelineBlock({ block, width }: { block: TimelineBlockData; width: BlockWidth }) {
  const items = block.items
  if (!items.length) return null
  const wide = width === 'site'

  return (
    <ol className="flex max-w-4xl flex-col">
      {items.map((item, index) => {
        const last = index === items.length - 1
        return (
          <li
            key={item.id ?? index}
            className={cn(
              'relative grid gap-1 pl-8',
              !last && 'pb-10',
              wide && 'md:grid-cols-[8rem_1fr] md:gap-x-16 md:pl-0',
            )}
          >
            {/* 时间轴：从本节点连到下一个节点；≥ md 时位于时间列（8rem）与内容列之间的间隙正中（10rem） */}
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  'absolute top-2 -bottom-2 left-[5.5px] w-px -translate-x-1/2 bg-border',
                  wide && 'md:top-3 md:-bottom-3 md:left-40',
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                'absolute top-2 left-[5.5px] size-[11px] -translate-x-1/2 rounded-full border-2 border-emphasis bg-background',
                wide && 'md:top-3 md:left-40',
              )}
            />
            <p
              className={cn(
                'numeric text-h4 font-semibold text-emphasis',
                wide && 'md:text-right md:text-h3',
              )}
            >
              {item.year}
            </p>
            <div className="flex flex-col gap-1.5">
              <h3 className={cn('text-h4 text-foreground', wide && 'md:pt-0.5')}>{item.title}</h3>
              {item.description ? (
                <p className="text-muted-foreground">{item.description}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
