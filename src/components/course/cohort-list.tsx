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
import type { CohortItem, CohortStatus } from '@/lib/course/types'
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
   * 要展示的开班计划。传 `upcomingCohorts(course.cohorts, new Date())` 的结果——
   * 本组件不做日期过滤，原样按传入顺序展示。
   */
  cohorts: CohortItem[]
  /** 每行“预约试听”带上的课程与专业（线索 context.course / discipline） */
  courseId: number
  disciplineId: number
  /** 没有开班计划时的说明，默认 zh.course.cohort.empty */
  emptyText?: string
  className?: string
}

/**
 * 开班计划列表（服务端组件）：开班日期（至结课日期）、校区或线上、授课方式、状态徽标、备注，
 * 每行一个“预约试听”（留资弹窗，position=course_cohort）。
 * 不展示剩余名额、倒计时等紧迫感信息。没有开班时显示空状态（仍保留在页面上，引导预约）。
 */
export function CohortList({
  cohorts,
  courseId,
  disciplineId,
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
              <p className="text-foreground">{place}</p>
              {cohort.note ? <p className="text-sm text-muted-foreground">{cohort.note}</p> : null}
            </div>
            <p className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{deliveryModeLabel(cohort.mode)}</Badge>
              <Badge variant={STATUS_VARIANT[cohort.status]}>
                {cohortStatusLabel(cohort.status)}
              </Badge>
            </p>
            <LeadCTA
              position="course_cohort"
              intent="trial"
              courseId={courseId}
              disciplineId={disciplineId}
              variant="secondary"
              className="w-full md:w-auto"
              aria-label={formatMessage(t.trialLabel, { date, place })}
            >
              {t.trial}
            </LeadCTA>
          </li>
        )
      })}
    </ul>
  )
}
