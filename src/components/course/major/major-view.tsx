import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

import { RichText } from '@/components/common/rich-text'
import { CareerDirectionList } from '@/components/course/career-direction-list'
import { CourseCard } from '@/components/course/course-card'
import { SalaryReferenceCard } from '@/components/course/salary-reference-card'
import { TeacherCardGrid } from '@/components/course/teacher-card-grid'
import { WorkThumbGrid } from '@/components/course/work-thumb-grid'
import type { LeadFormConfig } from '@/components/lead/types'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { COURSES_PATH } from '@/lib/course/paths'
import type { CoursePagesSettings, DisciplineDetail } from '@/lib/course/types'
import { isRichTextFilled } from '@/lib/rich-text-filled'
import { cn } from '@/lib/utils'

import { MajorCta } from './major-cta'
import { MajorHero } from './major-hero'
import { assignSectionTones, type MajorSectionKey } from './major-layout'
import { MajorSection } from './major-section'
import { shiftRichTextHeadings } from './rich-text-headings'

const t = zh.course.major

/** 专业介绍正文图片：右栏正文版心 736px */
const INTRO_IMAGE_SIZES = '(min-width: 768px) 736px, 100vw'

/** 作品最多 8 件、讲师最多 8 位（数据层已限制，这里再兜一次） */
const WORKS_LIMIT = 8
const TEACHERS_LIMIT = 8
/** 讲师不多于 3 位时标题放左侧、讲师在右侧排 3 列，避免 4 列网格右侧大片留空 */
const FEW_TEACHERS = 3

type MajorViewProps = {
  discipline: DisciplineDetail
  settings: CoursePagesSettings
  leadConfig: LeadFormConfig
  /** 课程卡片“近期开班”的当前时间（同一次渲染共用） */
  now: Date
}

/**
 * 专业方向落地页 /majors/[slug]：
 * 首屏（深色）→ 专业介绍 → 发展方向与薪资参考 → 开设课程 → 学员作品（深色）→ 专业讲师 → 结尾行动号召（深色）。
 * 没有内容的区块整块不渲染（开设课程除外：没有课程时显示说明，引导预约）；浅色区块白底 / 米色交替。
 */
export function MajorView({ discipline, settings, leadConfig, now }: MajorViewProps) {
  const intro = isRichTextFilled(discipline.intro) ? discipline.intro : null
  const hasCareers = discipline.careerDirections.length > 0
  const salary = discipline.salary
  const works = discipline.works.slice(0, WORKS_LIMIT)
  const teachers = discipline.teachers.slice(0, TEACHERS_LIMIT)

  const keys: MajorSectionKey[] = []
  if (intro) keys.push('intro')
  if (hasCareers || salary) keys.push('careers')
  keys.push('courses')
  if (works.length > 0) keys.push('works')
  if (teachers.length > 0) keys.push('teachers')
  const tones = assignSectionTones(keys)
  const tone = (key: MajorSectionKey) => tones.get(key) ?? 'light'
  const lastKey = keys.at(-1)

  return (
    <>
      <MajorHero discipline={discipline} coursesLabel={settings.list.title} />

      {intro ? (
        <MajorSection id="major-intro" tone={tone('intro')} title={t.sections.intro} layout="split">
          <RichText
            data={shiftRichTextHeadings(intro)}
            imageSizes={INTRO_IMAGE_SIZES}
            className="max-w-(--container-prose)"
          />
        </MajorSection>
      ) : null}

      {hasCareers || salary ? (
        <MajorSection
          id="major-careers"
          tone={tone('careers')}
          title={hasCareers ? t.sections.careers : t.sections.salary}
        >
          <div
            className={cn(
              'grid gap-10',
              hasCareers && salary && 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16',
            )}
          >
            {hasCareers ? <CareerDirectionList items={discipline.careerDirections} /> : null}
            {salary ? (
              <SalaryReferenceCard
                salary={salary}
                title={hasCareers ? undefined : t.salaryRange}
                className={cn(
                  hasCareers && 'lg:sticky lg:top-24 lg:self-start',
                  !hasCareers && 'max-w-xl',
                )}
              />
            ) : null}
          </div>
        </MajorSection>
      ) : null}

      <MajorSection
        id="major-courses"
        tone={tone('courses')}
        title={t.sections.courses}
        description={
          discipline.courses.length > 0
            ? formatMessage(t.coursesSummary, { count: discipline.courses.length })
            : undefined
        }
        actions={
          <Button asChild variant="link" className="min-h-11 text-sm md:text-base">
            <Link href={COURSES_PATH} prefetch={false}>
              {t.allCourses}
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
        }
      >
        {discipline.courses.length > 0 ? (
          <ul role="list" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {discipline.courses.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} now={now} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border p-6 text-muted-foreground">
            {t.coursesEmpty}
          </p>
        )}
      </MajorSection>

      {works.length > 0 ? (
        <MajorSection
          id="major-works"
          tone={tone('works')}
          title={t.sections.works}
          description={t.worksNote}
        >
          <WorkThumbGrid works={works} />
        </MajorSection>
      ) : null}

      {teachers.length > 0 ? (
        <MajorSection
          id="major-teachers"
          tone={tone('teachers')}
          title={t.sections.teachers}
          layout={teachers.length <= FEW_TEACHERS ? 'split' : 'stacked'}
        >
          <TeacherCardGrid
            teachers={teachers}
            className={cn(teachers.length <= FEW_TEACHERS && 'lg:grid-cols-3')}
          />
        </MajorSection>
      ) : null}

      <MajorCta
        title={settings.major.ctaTitle}
        description={settings.major.ctaDescription}
        disciplineId={discipline.id}
        config={leadConfig}
        separated={lastKey !== undefined && tone(lastKey) === 'dark'}
      />
    </>
  )
}
