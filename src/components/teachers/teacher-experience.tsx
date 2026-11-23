import type { TeacherExperience } from '@/lib/teachers/types'
import { cn } from '@/lib/utils'

type TeacherExperienceListProps = {
  items: readonly TeacherExperience[]
  className?: string
}

/**
 * 从业经历时间线（服务端组件）：有序列表 <ol>，按后台录入顺序排列；
 * 每一条是时间（可为空）、职位与机构。左侧竖线串起各条，圆点标出每一段的起点（装饰，读屏忽略）。
 * 空数组不渲染。
 */
export function TeacherExperienceList({ items, className }: TeacherExperienceListProps) {
  if (items.length === 0) return null
  return (
    <ol role="list" className={cn('flex flex-col', className)}>
      {items.map((item, index) => (
        <li
          key={`${index}-${item.org}-${item.role}`}
          className="relative flex flex-col gap-1 border-l border-border pb-8 pl-6 last:pb-1"
        >
          <span aria-hidden className="absolute top-2 -left-1 size-2 rounded-full bg-foreground" />
          {item.period ? (
            <p className="numeric text-sm text-muted-foreground">{item.period}</p>
          ) : null}
          <p className="font-semibold text-foreground">{item.role}</p>
          <p className="text-sm text-muted-foreground">{item.org}</p>
        </li>
      ))}
    </ol>
  )
}
