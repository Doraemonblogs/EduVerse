import Image from 'next/image'
import Link from 'next/link'

import { LeadCTA } from '@/components/lead/lead-cta'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { nextCohort } from '@/lib/course/cohorts'
import {
  cohortPlaceLabel,
  courseCitiesLabel,
  deliveryModesLabel,
  formatCohortDate,
  formatDuration,
  formatMessage,
} from '@/lib/course/format'
import { coursePath } from '@/lib/course/paths'
import type { CourseCardData } from '@/lib/course/types'
import { cn } from '@/lib/utils'

import { CourseTags } from './course-tags'

const t = zh.course

/** 学习路线最多列出的阶段数 */
const MAX_STAGES = 5

/** 默认按课程网格（1 / 2 / 3 列，版心 1280px）计算的图片宽度 */
const DEFAULT_SIZES =
  '(min-width: 1360px) 410px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 100vw'

export type CourseCardProps = {
  course: CourseCardData
  /** 课程名称的标题层级：放在 h2 区块（如“按专业分组”）下用 h3（默认），区块标题是 h3 时用 h4 */
  headingLevel?: 'h2' | 'h3' | 'h4'
  /** 计算“近期开班”的当前时间，默认渲染时的时间 */
  now?: Date
  /** 封面图 sizes；默认按 1 / 2 / 3 列网格计算，网格列数不同时传入 */
  imageSizes?: string
  /** “预约试听”按钮的留资位置标识，默认 course_card（首页精选课程传 home_course） */
  leadPosition?: string
  className?: string
}

/**
 * 课程卡片（服务端组件）：封面、专业方向 + 班型、标题（链接到详情）、两行简介、
 * 时长 / 授课方式 / 城市、编号式学习路线（最多 5 个阶段）、近期开班，
 * 以及两个出口：“课程详情”（链接）与“预约试听”（留资弹窗，position 默认 course_card，带课程与专业）。
 * 卡片在网格里等高（h-full），按钮贴底。深色区块内自动切换配色。
 */
export function CourseCard({
  course,
  headingLevel: Heading = 'h3',
  now = new Date(),
  imageSizes = DEFAULT_SIZES,
  leadPosition = 'course_card',
  className,
}: CourseCardProps) {
  const href = coursePath(course.slug)
  const upcoming = nextCohort(course.cohorts, now)
  const stages = course.stageTitles.slice(0, MAX_STAGES)
  const duration = formatDuration(course.duration)

  const meta = [
    { label: t.meta.duration, value: duration },
    { label: t.meta.mode, value: deliveryModesLabel(course.deliveryModes) },
    { label: t.meta.city, value: courseCitiesLabel(course.campuses, course.deliveryModes) },
  ].filter((item) => item.value)

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground',
        className,
      )}
    >
      <div className="aspect-video overflow-hidden bg-muted">
        {course.cover ? (
          <Image
            src={course.cover.src}
            alt={course.cover.alt}
            width={course.cover.width}
            height={course.cover.height}
            sizes={imageSizes}
            className="size-full object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
        <CourseTags discipline={course.discipline} classType={course.classType} />

        <div className="flex flex-col gap-2">
          <Heading className="text-xl leading-snug font-semibold text-foreground">
            <Link
              href={href}
              prefetch={false}
              className="underline-offset-4 transition-colors hover:text-emphasis hover:underline"
            >
              {course.title}
            </Link>
          </Heading>
          <p className="line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>
        </div>

        {meta.length > 0 ? (
          <dl className="grid grid-cols-3 gap-3 border-y border-border py-3 text-sm">
            {meta.map((item) => (
              <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                {/* 中文只在“ / ”两侧的空格处换行，不把“双师课堂”“广州”拆开 */}
                <dd className="font-medium break-keep text-foreground wrap-break-word">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {stages.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground">{t.card.roadmap}</p>
            <ol role="list" className="flex flex-col gap-1.5 text-sm">
              {stages.map((title, index) => (
                <li key={`${index}-${title}`} className="flex gap-3">
                  <span className="numeric w-5 shrink-0 text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 text-foreground">{title}</span>
                </li>
              ))}
            </ol>
            {course.stageTitles.length > MAX_STAGES ? (
              <p className="pl-8 text-sm text-muted-foreground">
                {formatMessage(t.card.moreStages, { count: course.stageTitles.length })}
              </p>
            ) : null}
          </div>
        ) : null}

        {upcoming ? (
          <p className="text-sm">
            <span className="text-muted-foreground">{t.meta.nextCohort}</span>{' '}
            <span className="font-medium text-foreground">
              {formatCohortDate(upcoming.startDate)} · {cohortPlaceLabel(upcoming)}
            </span>
          </p>
        ) : null}

        <div className="mt-auto grid grid-cols-2 gap-3 pt-1">
          <Button asChild variant="outline">
            <Link
              href={href}
              prefetch={false}
              aria-label={formatMessage(t.card.detailLabel, { title: course.title })}
            >
              {t.card.detail}
            </Link>
          </Button>
          <LeadCTA
            position={leadPosition}
            intent="trial"
            courseId={course.id}
            disciplineId={course.discipline.id}
            aria-label={formatMessage(t.card.trialLabel, { title: course.title })}
          >
            {t.card.trial}
          </LeadCTA>
        </div>
      </div>
    </article>
  )
}
