import Image from 'next/image'

import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { CourseTags } from '@/components/course/course-tags'
import { LeadCTA } from '@/components/lead/lead-cta'
import { zh } from '@/i18n/zh'
import {
  campusLabel,
  classTypeLabel,
  cohortPlaceLabel,
  deliveryModesLabel,
  formatCohortDate,
  formatDuration,
  noCampusLabel,
} from '@/lib/course/format'
import { COURSES_PATH, coursePath, majorPath } from '@/lib/course/paths'
import type { CohortItem, CourseDetail } from '@/lib/course/types'
import { cn } from '@/lib/utils'

const t = zh.course

/** 首屏大图：桌面端占半栏（版心 1280px），移动端通栏 */
const HERO_SIZES = '(min-width: 1360px) 620px, (min-width: 1024px) 46vw, 100vw'

export const COURSE_TITLE_ID = 'course-title'

type CourseHeroProps = {
  course: CourseDetail
  /** 面包屑第二级（课程列表页）的名称，与列表页标题一致 */
  coursesLabel: string
  /** 最近一期开班（渲染时按当前时间过滤后的第一条） */
  nextCohort: CohortItem | null
}

type Fact = { label: string; value: React.ReactNode; className?: string; numeric?: boolean }

/**
 * 课程详情首屏（深色区块）：面包屑、专业方向 + 班型、课程名（h1）、简介、两个转化按钮、
 * 封面大图（唯一的高优先级图片），以及关键信息 <dl>。
 */
export function CourseHero({ course, coursesLabel, nextCohort }: CourseHeroProps) {
  const image = course.heroImage ?? course.cover
  const facts = keyFacts(course, nextCohort)

  return (
    <Section tone="dark" spacing="sm" aria-labelledby={COURSE_TITLE_ID}>
      <Container className="flex flex-col gap-8 md:gap-10">
        <Breadcrumbs
          items={[
            { label: coursesLabel, href: COURSES_PATH },
            { label: course.discipline.name, href: majorPath(course.discipline.slug) },
            { label: course.title, href: coursePath(course.slug) },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12 xl:gap-16">
          <div className="flex min-w-0 flex-col gap-5">
            <CourseTags discipline={course.discipline} classType={course.classType} />
            <h1 id={COURSE_TITLE_ID} className="text-h1 text-foreground">
              {course.title}
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">{course.summary}</p>
            <div className="grid grid-cols-2 gap-3 pt-2 sm:flex sm:flex-wrap">
              <LeadCTA
                position="course_hero"
                intent="trial"
                courseId={course.id}
                disciplineId={course.discipline.id}
                size="lg"
              >
                {t.detail.trial}
              </LeadCTA>
              <LeadCTA
                position="course_hero"
                intent="tuition"
                courseId={course.id}
                disciplineId={course.discipline.id}
                title={t.detail.tuitionDialogTitle}
                description={t.detail.tuitionDialogDescription}
                variant="outline"
                size="lg"
              >
                {t.detail.tuition}
              </LeadCTA>
            </div>
          </div>

          <div className="aspect-video overflow-hidden rounded-md bg-muted">
            {image ? (
              <Image
                src={image.src}
                alt={image.alt || course.title}
                width={image.width}
                height={image.height}
                sizes={HERO_SIZES}
                preload
                className="size-full object-cover"
              />
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className={cn(
                'flex min-w-0 flex-col gap-1 border-t border-border py-4',
                fact.className,
              )}
            >
              <dt className="text-sm text-muted-foreground">{fact.label}</dt>
              <dd
                className={cn(
                  'font-semibold break-keep text-foreground wrap-break-word',
                  fact.numeric && 'numeric',
                )}
              >
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </Section>
  )
}

/**
 * 关键信息：短项（时长、班型、授课方式、上课时间）在前，
 * 长项（近期开班、开设校区）在后并跨列，保证 2 / 3 / 4 列时都能排整齐。
 * 没有数据的项不显示；没有已发布校区时，开设校区按授课方式显示“线上”（纯线上）或“待定”。
 */
function keyFacts(course: CourseDetail, next: CohortItem | null): Fact[] {
  const facts: Fact[] = []
  const duration = formatDuration(course.duration)
  if (duration) facts.push({ label: t.meta.duration, value: duration, numeric: true })
  facts.push({ label: t.meta.classType, value: classTypeLabel(course.classType) })
  const modes = deliveryModesLabel(course.deliveryModes)
  if (modes) facts.push({ label: t.meta.mode, value: modes })
  if (course.schedule) facts.push({ label: t.meta.schedule, value: course.schedule })
  if (next) {
    facts.push({
      label: t.meta.nextCohort,
      value: `${formatCohortDate(next.startDate)} · ${cohortPlaceLabel(next)}`,
      numeric: true,
      className: 'col-span-2',
    })
  }
  facts.push({
    label: t.meta.campuses,
    value:
      course.campuses.length > 0 ? (
        <ul role="list" className="flex flex-wrap gap-x-4 gap-y-1">
          {course.campuses.map((campus) => (
            <li key={campus.id}>{campusLabel(campus)}</li>
          ))}
        </ul>
      ) : (
        noCampusLabel(course.deliveryModes)
      ),
    className: next ? 'col-span-2 sm:col-span-3 lg:col-span-2' : 'col-span-full',
  })
  return facts
}
