import Image from 'next/image'
import Link from 'next/link'
import { useId } from 'react'

import { zh } from '@/i18n/zh'
import { formatMessage, joinList } from '@/lib/course/format'
import type { DisciplineRef, TeacherCardData } from '@/lib/course/types'
import { teacherPath } from '@/lib/teachers/paths'
import { cn } from '@/lib/utils'

const t = zh.course.teacher

/** 默认按通栏网格（≥ lg 4 列，版心 1280px）计算的头像宽度；移动端头像固定 96px */
const DEFAULT_SIZES =
  '(min-width: 1360px) 300px, (min-width: 1024px) 23vw, (min-width: 640px) 46vw, 96px'

/**
 * 网格接受的讲师：M3 的讲师卡片；带上 disciplines（讲师列表 TeacherListItem）时，
 * 卡片在头衔下方列出专业方向简称。
 */
export type TeacherCardGridItem = TeacherCardData & { disciplines?: readonly DisciplineRef[] }

export type TeacherCardGridProps = {
  teachers: readonly TeacherCardGridItem[]
  /** 讲师姓名的标题层级，默认 h3（区块标题为 h2 时） */
  headingLevel?: 'h2' | 'h3' | 'h4'
  /** 最多展示几位（默认全部） */
  limit?: number
  /** 头像 sizes；网格列数或所在栏宽不同时（如课程详情主栏 3 列）传入 */
  imageSizes?: string
  /**
   * 前几位讲师的头像立即加载并提高优先级（只给网格在首屏的页面，如讲师列表传一行的数量），
   * 默认 0：全部懒加载（课程详情、专业页里的讲师网格在首屏之下）。
   */
  priorityCount?: number
  /**
   * 追加到网格上的类名。改列数时要同时覆盖 md: 与 lg:（如 `md:grid-cols-3 lg:grid-cols-3`），
   * 断点不同的类不会互相覆盖，只写 md: 时 ≥ lg 仍是 4 列。
   */
  className?: string
}

/**
 * 讲师卡片网格（服务端组件）：头像、姓名、头衔、（专业方向）、从业年限、擅长领域。
 * 每张卡片整体是一个链接，进入讲师详情 /teachers/{slug}（键盘焦点描边落在整张卡片上）；
 * 链接的无障碍名称只取姓名（aria-labelledby），其余信息作为描述（aria-describedby）。
 * 移动端头像在左、文字在右；≥ sm 头像在上，2 / 4 列。空数组不渲染。
 */
export function TeacherCardGrid({
  teachers,
  headingLevel = 'h3',
  limit,
  imageSizes = DEFAULT_SIZES,
  priorityCount = 0,
  className,
}: TeacherCardGridProps) {
  const items = limit === undefined ? teachers : teachers.slice(0, limit)
  if (items.length === 0) return null
  return (
    <ul role="list" className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {items.map((teacher, index) => (
        <li key={teacher.id}>
          <TeacherCard
            teacher={teacher}
            headingLevel={headingLevel}
            imageSizes={imageSizes}
            priority={index < priorityCount}
          />
        </li>
      ))}
    </ul>
  )
}

export type TeacherCardProps = {
  teacher: TeacherCardGridItem
  /** 讲师姓名的标题层级，默认 h3 */
  headingLevel?: 'h2' | 'h3' | 'h4'
  /** 头像 sizes；默认按通栏 4 列网格计算 */
  imageSizes?: string
  /** 头像立即加载并提高优先级（只给首屏可见的卡片） */
  priority?: boolean
}

/**
 * 单张讲师卡片（服务端组件），即 TeacherCardGrid 的每一项；放进其它容器（如首页横滑列表
 * HorizontalScroller）时单独使用。整张卡片是一个链接（→ /teachers/{slug}）。
 */
export function TeacherCard({
  teacher,
  headingLevel: Heading = 'h3',
  imageSizes = DEFAULT_SIZES,
  priority = false,
}: TeacherCardProps) {
  const id = useId()
  const nameId = `${id}-name`
  const detailsId = `${id}-details`
  const disciplines = teacher.disciplines ?? []

  return (
    <Link
      href={teacherPath(teacher.slug)}
      prefetch={false}
      aria-labelledby={nameId}
      aria-describedby={detailsId}
      className="group flex h-full gap-4 rounded-sm sm:flex-col"
    >
      <div className="size-24 shrink-0 overflow-hidden rounded-sm bg-muted sm:aspect-square sm:size-auto">
        {teacher.avatar ? (
          <Image
            src={teacher.avatar.src}
            alt={teacher.avatar.alt || teacher.name}
            width={teacher.avatar.width}
            height={teacher.avatar.height}
            sizes={imageSizes}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Heading
          id={nameId}
          className="text-h4 text-foreground underline-offset-4 group-hover:underline"
        >
          {teacher.name}
        </Heading>
        <div id={detailsId} className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">{teacher.title}</p>
          {disciplines.length > 0 ? (
            <p className="text-sm break-keep text-foreground wrap-break-word">
              <span className="sr-only">{zh.teachers.disciplines}：</span>
              {joinList(disciplines.map((d) => d.shortName))}
            </p>
          ) : null}
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
      </div>
    </Link>
  )
}
