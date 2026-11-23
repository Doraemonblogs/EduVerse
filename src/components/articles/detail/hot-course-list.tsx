import Image from 'next/image'
import Link from 'next/link'
import { useId } from 'react'

import { zh } from '@/i18n/zh'
import { classTypeLabel } from '@/lib/course/format'
import { coursePath } from '@/lib/course/paths'
import type { CourseCardData } from '@/lib/course/types'
import { cn } from '@/lib/utils'

const t = zh.articles.detail

/** 缩略图固定 96px 宽（16:10） */
const THUMB_SIZES = '96px'

type HotCourseListProps = {
  courses: Pick<CourseCardData, 'id' | 'slug' | 'title' | 'cover' | 'discipline' | 'classType'>[]
  className?: string
}

/**
 * 侧栏的热门课程（服务端组件）：紧凑的图文列表，每行一个链接（缩略图、课程名、专业方向 · 班型），
 * 读屏名称是课程名，专业方向与班型作为说明。缩略图在首屏之下，懒加载。
 */
export function HotCourseList({ courses, className }: HotCourseListProps) {
  const id = useId()

  return (
    <ul role="list" className={cn('flex flex-col divide-y divide-border', className)}>
      {courses.map((course) => {
        const titleId = `${id}-${course.id}-title`
        const metaId = `${id}-${course.id}-meta`
        return (
          <li key={course.id}>
            <Link
              href={coursePath(course.slug)}
              prefetch={false}
              aria-labelledby={titleId}
              aria-describedby={metaId}
              className="group flex items-center gap-4 rounded-sm py-3"
            >
              <div className="aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-sm bg-muted">
                {course.cover ? (
                  <Image
                    src={course.cover.src}
                    alt={course.cover.alt || course.title}
                    width={course.cover.width}
                    height={course.cover.height}
                    sizes={THUMB_SIZES}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
                  />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3
                  id={titleId}
                  className="line-clamp-2 text-sm leading-snug font-semibold break-keep text-foreground underline-offset-4 wrap-break-word group-hover:underline"
                >
                  {course.title}
                </h3>
                <p id={metaId} className="text-xs text-muted-foreground">
                  {course.discipline.shortName}
                  {t.courseMetaSeparator}
                  {classTypeLabel(course.classType)}
                </p>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
