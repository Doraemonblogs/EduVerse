import { Badge } from '@/components/ui/badge'
import type { SoftwareRef } from '@/lib/course/types'
import { cn } from '@/lib/utils'

export type SoftwareTagsProps = {
  software: SoftwareRef[]
  className?: string
}

/** 所用软件（服务端组件）：纯文字标签，不使用厂商 Logo（商标）；空数组不渲染 */
export function SoftwareTags({ software, className }: SoftwareTagsProps) {
  if (software.length === 0) return null
  return (
    <ul role="list" className={cn('flex flex-wrap gap-2', className)}>
      {software.map((item) => (
        <li key={item.id}>
          <Badge variant="outline" className="px-2.5 py-1 text-sm text-foreground">
            {item.name}
          </Badge>
        </li>
      ))}
    </ul>
  )
}
