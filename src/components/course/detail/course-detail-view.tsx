import Link from 'next/link'

import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { SectionHeading } from '@/components/common/section-heading'
import { CareerDirectionList } from '@/components/course/career-direction-list'
import { CohortList } from '@/components/course/cohort-list'
import { CourseCard } from '@/components/course/course-card'
import { FaqList } from '@/components/course/faq-list'
import { SalaryReferenceCard } from '@/components/course/salary-reference-card'
import { SoftwareTags } from '@/components/course/software-tags'
import { SyllabusList } from '@/components/course/syllabus-list'
import { TeacherCardGrid } from '@/components/course/teacher-card-grid'
import { WorkThumbGrid } from '@/components/course/work-thumb-grid'
import type { LeadFormConfig } from '@/components/lead/types'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { upcomingCohorts } from '@/lib/course/cohorts'
import { formatMessage } from '@/lib/course/format'
import { majorPath } from '@/lib/course/paths'
import type { CourseDetail, CoursePagesSettings } from '@/lib/course/types'
import { cn } from '@/lib/utils'

import { CourseHero } from './course-hero'
import { CourseOverview } from './course-overview'
import { CourseSidebar } from './course-sidebar'
import { DetailSection } from './detail-section'
import { ProjectList } from './project-list'
import { CourseSectionNav } from './section-nav'
import { courseDetailNav, hasSectionContent, type CourseDetailSectionId } from './sections'

const t = zh.course.detail

/**
 * 学员作品在主栏深色面板里的列数：3 件或 5 件以上排 3 列，其余排 2 列，避免末行只剩一件。
 * 图片宽度按主栏扣除面板内边距计算。
 */
function workGrid(count: number): { className: string; sizes: string } {
  return count === 3 || count >= 5
    ? {
        className: 'md:grid-cols-3 lg:grid-cols-3',
        sizes: '(min-width: 1360px) 250px, (min-width: 1024px) 20vw, (min-width: 768px) 30vw, 46vw',
      }
    : {
        className: 'md:grid-cols-2 lg:grid-cols-2',
        sizes: '(min-width: 1360px) 380px, (min-width: 1024px) 30vw, 46vw',
      }
}

/**
 * 授课讲师在主栏里固定 3 列（md 起；必须同时覆盖 lg:，否则通栏网格的 lg:grid-cols-4 仍会生效）。
 * 头像宽度按主栏三等分计算；移动端头像固定 96px。
 */
const TEACHER_SIZES =
  '(min-width: 1360px) 270px, (min-width: 1024px) 18vw, (min-width: 768px) 30vw, (min-width: 640px) 46vw, 96px'

const RELATED_TITLE_ID = 'related-courses-title'

export type CourseDetailViewProps = {
  course: CourseDetail
  settings: CoursePagesSettings
  leadConfig: LeadFormConfig
  /** 渲染时的当前时间：开班计划、近期开班按它过滤 */
  now: Date
}

/**
 * 课程详情页主体（服务端组件，不取数据）：
 * 首屏 → 两栏（主栏：页内导航 + 各内容区块；右栏：吸顶留资侧栏）→ 同专业其它课程。
 * 两栏用 grid 排布，移动端单栏时侧栏自然排在主内容之后——表单只有一个 DOM 实例。
 * 没有内容的区块整块不渲染，页内导航同步省略（见 sections.ts）。
 */
export function CourseDetailView({ course, settings, leadConfig, now }: CourseDetailViewProps) {
  const cohorts = upcomingCohorts(course.cohorts, now)
  const next = cohorts[0] ?? null
  const nav = courseDetailNav(course)
  const has = (id: CourseDetailSectionId) => hasSectionContent(course, id)
  const works = workGrid(course.works.length)

  return (
    <>
      <CourseHero course={course} coursesLabel={settings.list.title} nextCohort={next} />

      <Section tone="light" spacing="none" className="pt-6 pb-section-sm md:pt-8">
        {/* 侧栏吸顶后会停在桌面端悬浮操作栏下方：lg:avoid-floating-actions 给悬浮栏让出右侧位置 */}
        <Container className="grid gap-12 lg:avoid-floating-actions lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:gap-16">
          <div className="@container flex min-w-0 flex-col gap-10 md:gap-12">
            <CourseSectionNav items={nav} label={t.navLabel} />

            <div className="flex flex-col gap-16 md:gap-20">
              {has('overview') ? (
                <CourseOverview highlights={course.highlights} audience={course.audience} />
              ) : null}

              {has('syllabus') ? (
                <DetailSection
                  id="syllabus"
                  title={t.sections.syllabus}
                  description={
                    course.stages.length > 0
                      ? formatMessage(t.syllabusSummary, { count: course.stages.length })
                      : undefined
                  }
                >
                  <SyllabusList stages={course.stages} />
                  {course.software.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-h4 text-foreground">{t.sections.software}</h3>
                      <SoftwareTags software={course.software} />
                    </div>
                  ) : null}
                </DetailSection>
              ) : null}

              {has('projects') ? (
                <DetailSection id="projects" title={t.sections.projects}>
                  <ProjectList projects={course.projects} />
                </DetailSection>
              ) : null}

              {has('works') ? (
                <DetailSection
                  id="works"
                  title={t.sections.works}
                  className="surface-dark rounded-md px-5 py-8 md:p-10"
                >
                  <WorkThumbGrid
                    works={course.works}
                    imageSizes={works.sizes}
                    className={works.className}
                  />
                </DetailSection>
              ) : null}

              {has('teachers') ? (
                <DetailSection id="teachers" title={t.sections.teachers}>
                  <TeacherCardGrid
                    teachers={course.teachers}
                    imageSizes={TEACHER_SIZES}
                    className="md:grid-cols-3 lg:grid-cols-3"
                  />
                </DetailSection>
              ) : null}

              <DetailSection id="cohorts" title={t.sections.cohorts} description={t.cohortsNote}>
                <CohortList
                  cohorts={cohorts}
                  courseId={course.id}
                  disciplineId={course.discipline.id}
                />
              </DetailSection>

              {has('careers') ? (
                <DetailSection id="careers" title={t.sections.careers}>
                  <div
                    className={cn(
                      'grid gap-8',
                      course.salary && '@2xl:grid-cols-[minmax(0,1fr)_20rem] @2xl:gap-10',
                    )}
                  >
                    <CareerDirectionList
                      items={course.careerDirections}
                      columns={course.salary ? 1 : 2}
                      className="self-start"
                    />
                    {course.salary ? (
                      <SalaryReferenceCard salary={course.salary} className="self-start" />
                    ) : null}
                  </div>
                </DetailSection>
              ) : null}

              {has('faqs') ? (
                <DetailSection id="faqs" title={t.sections.faqs}>
                  <FaqList faqs={course.faqs} />
                </DetailSection>
              ) : null}
            </div>
          </div>

          <CourseSidebar
            course={course}
            settings={settings.detail}
            leadConfig={leadConfig}
            nextCohort={next}
          />
        </Container>
      </Section>

      {course.related.length > 0 ? (
        <Section tone="paper" aria-labelledby={RELATED_TITLE_ID}>
          <Container className="flex flex-col gap-8 md:gap-10">
            <SectionHeading
              id={RELATED_TITLE_ID}
              title={t.sections.related}
              actions={
                <Button asChild variant="outline">
                  <Link href={majorPath(course.discipline.slug)} prefetch={false}>
                    {formatMessage(t.majorLink, { name: course.discipline.name })}
                  </Link>
                </Button>
              }
            />
            <ul role="list" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {course.related.map((related) => (
                <li key={related.id}>
                  <CourseCard course={related} now={now} />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}
    </>
  )
}
