import Link from 'next/link'

import { CampusLink } from '@/components/campuses/campus-link'
import { LeadCTA } from '@/components/lead/lead-cta'
import { Badge } from '@/components/ui/badge'
import { zh } from '@/i18n/zh'
import {
  cohortPlaceLabel,
  cohortStatusLabel,
  deliveryModeLabel,
  formatCohortDate,
  formatMessage,
} from '@/lib/course/format'
import { coursePath } from '@/lib/course/paths'
import type { CohortCourseRef, CohortItem, CohortStatus } from '@/lib/course/types'
import { cn } from '@/lib/utils'

const t = zh.course.cohort

/** 状态徽标：文字本身表达状态，颜色只是辅助（不只靠颜色区分） */
const STATUS_VARIANT: Record<CohortStatus, 'emphasis' | 'neutral' | 'outline'> = {
  enrolling: 'emphasis',
  upcoming: 'neutral',
  full: 'outline',
}

export type CohortListProps = {
  /**
   * 要展示的开班计划。传 `upcomingCohorts(cohorts, new Date())` 的结果——
   * 本组件不做日期过滤，原样按传入顺序展示。
   * 跨课程的列表（如校区详情）每条带上 course：该行显示课程名（链接到课程），“预约试听”带上该课程与专业方向。
   */
  cohorts: (CohortItem & { course?: CohortCourseRef })[]
  /** 每行“预约试听”带上的课程与专业（线索 context.course / discipline）；行上有 course 时以行为准 */
  courseId?: number
  disciplineId?: number
  /** “预约试听”的留资位置，默认 course_cohort（课程详情） */
  position?: string
  /** 开班校区是否链接到校区详情（默认是；校区详情页自己的列表传 false） */
  linkCampus?: boolean
  /** 没有开班计划时的说明，默认 zh.course.cohort.empty */
  emptyText?: string
  className?: string
}

/**
 * 开班计划列表（服务端组件）：开班日期（至结课日期）、（跨课程时）课程名、校区（链接到校区详情）或线上、
 * 授课方式、状态徽标、备注，每行一个“预约试听”（留资弹窗，默认 position=course_cohort）。
 * 不展示剩余名额、倒计时等紧迫感信息。没有开班时显示空状态（仍保留在页面上，引导预约）。
 */
export function CohortList({
  cohorts,
  courseId,
  disciplineId,
  position = 'course_cohort',
  linkCampus = true,
  emptyText = t.empty,
  className,
}: CohortListProps) {
  if (cohorts.length === 0) {
    return (
      <p
        className={cn(
          'rounded-md border border-dashed border-border p-6 text-muted-foreground',
          className,
        )}
      >
        {emptyText}
      </p>
    )
  }

  return (
    <ul role="list" className={cn('divide-y divide-border border-y border-border', className)}>
      {cohorts.map((cohort) => {
        const date = formatCohortDate(cohort.startDate)
        const end = formatCohortDate(cohort.endDate)
        const place = cohortPlaceLabel(cohort)
        return (
          <li
            key={cohort.id}
            className="grid gap-3 py-5 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto_auto] md:items-center md:gap-6"
          >
            <div className="flex flex-col gap-0.5">
              <p className="numeric text-lg font-semibold text-foreground">{date}</p>
              {end ? (
                <p className="text-sm text-muted-foreground">
                  {formatMessage(t.until, { date: end })}
                </p>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              {cohort.course ? (
                <p className="font-semibold break-keep text-foreground wrap-break-word">
                  <Link
                    href={coursePath(cohort.course.slug)}
                    prefetch={false}
                    className="rounded-xs underline decoration-muted-foreground underline-offset-4 transition-colors hover:decoration-foreground"
                  >
                    {cohort.course.title}
                  </Link>
                </p>
              ) : null}
              <p className="text-foreground">
                {cohort.campus && linkCampus ? (
                  <CampusLink campus={cohort.campus}>{place}</CampusLink>
                ) : (
                  place
                )}
              </p>
              {cohort.note ? <p className="text-sm text-muted-foreground">{cohort.note}</p> : null}
            </div>
            <p className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{deliveryModeLabel(cohort.mode)}</Badge>
              <Badge variant={STATUS_VARIANT[cohort.status]}>
                {cohortStatusLabel(cohort.status)}
              </Badge>
            </p>
            <LeadCTA
              position={position}
              intent="trial"
              courseId={cohort.course?.id ?? courseId}
              disciplineId={cohort.course?.disciplineId ?? disciplineId}
              variant="secondary"
              className="w-full md:w-auto"
              aria-label={formatMessage(cohort.course ? t.trialCourseLabel : t.trialLabel, {
                date,
                place,
                course: cohort.course?.title ?? '',
              })}
            >
              {t.trial}
            </LeadCTA>
          </li>
        )
      })}
    </ul>
  )
}
