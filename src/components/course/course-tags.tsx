import { Badge } from '@/components/ui/badge'
import { classTypeLabel } from '@/lib/course/format'
import type { ClassType, DisciplineRef } from '@/lib/course/types'
import { cn } from '@/lib/utils'

type CourseTagsProps = {
  /** 只用到简称 */
  discipline: Pick<DisciplineRef, 'shortName'>
  classType: ClassType
  className?: string
}

/**
 * 短期班徽标的底色：用 accent 而不是 neutral 默认的 muted——米色区块里 muted 是白色，
 * 与白色卡片同色，徽标会只剩文字。accent 在浅色 / 米色 / 深色区块里都与卡片、区块底色不同
 * （accent-foreground / accent 已登记在 contrast-pairs.ts，三种区块都校验对比度）。
 */
const SHORT_TERM_BADGE = 'bg-accent text-accent-foreground'

/** 课程徽标：专业方向简称 + 班型（课程卡片、课程详情首屏共用；纯文字，不加链接） */
export function CourseTags({ discipline, classType, className }: CourseTagsProps) {
  const longTerm = classType === 'long_term'
  return (
    <p className={cn('flex flex-wrap items-center gap-2', className)}>
      <Badge variant="outline">{discipline.shortName}</Badge>
      <Badge
        variant={longTerm ? 'inverse' : 'neutral'}
        className={longTerm ? undefined : SHORT_TERM_BADGE}
      >
        {classTypeLabel(classType)}
      </Badge>
    </p>
  )
}
