import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

import { CourseCard } from '@/components/course/course-card'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { majorPath } from '@/lib/course/paths'
import { cn } from '@/lib/utils'

import type { CourseGroup } from './group-courses'

const t = zh.course.list

type CourseGroupsProps = {
  groups: CourseGroup[]
  /** 计算各卡片“近期开班”的当前时间（同一次渲染共用） */
  now: Date
  className?: string
}

/**
 * 课程列表的分组结果：每个专业方向一个 <section>，h2 为专业方向全称（右侧“了解该专业”链接到专业方向页），
 * 组内课程卡片网格 1 / 2 / 3 列，卡片标题 h3。
 */
export function CourseGroups({ groups, now, className }: CourseGroupsProps) {
  return (
    <div className={cn('flex flex-col gap-14 md:gap-20', className)}>
      {groups.map(({ discipline, courses }) => {
        const headingId = `course-group-${discipline.slug}`
        return (
          <section
            key={discipline.id}
            aria-labelledby={headingId}
            className="flex flex-col gap-6 md:gap-8"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b border-border pb-3 md:pb-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 id={headingId} className="text-h2 text-foreground">
                  {discipline.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {formatMessage(t.groupCount, { count: courses.length })}
                </p>
              </div>
              <Button asChild variant="link" className="min-h-11 text-sm md:text-base">
                <Link
                  href={majorPath(discipline.slug)}
                  prefetch={false}
                  aria-label={formatMessage(t.majorLinkLabel, { name: discipline.name })}
                >
                  {t.majorLink}
                  <ArrowRightIcon aria-hidden />
                </Link>
              </Button>
            </div>
            <ul role="list" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {courses.map((course) => (
                <li key={course.id}>
                  <CourseCard course={course} now={now} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
