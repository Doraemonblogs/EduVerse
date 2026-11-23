import Image from 'next/image'

import { zh } from '@/i18n/zh'
import { formatMessage, joinList } from '@/lib/course/format'
import type { TeacherCardData } from '@/lib/course/types'
import { cn } from '@/lib/utils'

const t = zh.course.teacher

/** 默认按通栏网格（≥ lg 4 列，版心 1280px）计算的头像宽度；移动端头像固定 96px */
const DEFAULT_SIZES =
  '(min-width: 1360px) 300px, (min-width: 1024px) 23vw, (min-width: 640px) 46vw, 96px'

export type TeacherCardGridProps = {
  teachers: TeacherCardData[]
  /** 讲师姓名的标题层级，默认 h3（区块标题为 h2 时） */
  headingLevel?: 'h3' | 'h4'
  /** 最多展示几位（默认全部） */
  limit?: number
  /** 头像 sizes；网格列数或所在栏宽不同时（如课程详情主栏 3 列）传入 */
  imageSizes?: string
  /**
   * 追加到网格上的类名。改列数时要同时覆盖 md: 与 lg:（如 `md:grid-cols-3 lg:grid-cols-3`），
   * 断点不同的类不会互相覆盖，只写 md: 时 ≥ lg 仍是 4 列。
   */
  className?: string
}

/**
 * 讲师卡片网格（服务端组件）：头像、姓名、头衔、从业年限、擅长领域。
 * M3 只展示、不加链接（讲师详情 /teachers/[slug] 在 M4 上线）。
 * 移动端头像在左、文字在右；≥ sm 头像在上，2 / 4 列。空数组不渲染。
 */
export function TeacherCardGrid({
  teachers,
  headingLevel: Heading = 'h3',
  limit,
  imageSizes = DEFAULT_SIZES,
  className,
}: TeacherCardGridProps) {
  const items = limit === undefined ? teachers : teachers.slice(0, limit)
  if (items.length === 0) return null
  return (
    <ul role="list" className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {items.map((teacher) => (
        <li key={teacher.id} className="flex gap-4 sm:flex-col">
          <div className="size-24 shrink-0 overflow-hidden rounded-sm bg-muted sm:aspect-square sm:size-auto">
            {teacher.avatar ? (
              <Image
                src={teacher.avatar.src}
                alt={teacher.avatar.alt || teacher.name}
                width={teacher.avatar.width}
                height={teacher.avatar.height}
                sizes={imageSizes}
                className="size-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Heading className="text-h4 text-foreground">{teacher.name}</Heading>
            <p className="text-sm text-muted-foreground">{teacher.title}</p>
            {teacher.yearsOfExperience !== null ? (
              <p className="text-sm text-foreground">
                {formatMessage(t.years, { years: teacher.yearsOfExperience })}
              </p>
            ) : null}
            {teacher.specialties.length > 0 ? (
              <p className="text-sm break-keep text-muted-foreground wrap-break-word">
                <span className="sr-only">{t.specialties}：</span>
                {joinList(teacher.specialties)}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
