import { LeadForm } from '@/components/lead/lead-form'
import type { LeadFormConfig } from '@/components/lead/types'
import { zh } from '@/i18n/zh'
import { cohortPlaceLabel, formatCohortDate } from '@/lib/course/format'
import type { CohortItem, CourseDetail, CoursePagesSettings } from '@/lib/course/types'
import { cn } from '@/lib/utils'

const t = zh.course

export const SIDEBAR_TITLE_ID = 'course-sidebar-title'

/**
 * 桌面端吸顶：头部 64px 下方留 16px。视口高度不够放下整张卡片时（表单出现校验提示、矮屏），
 * 卡片自身限高、内部滚动，提交按钮始终够得着；视口很矮（< 720px）时不吸顶，随页面滚动。
 */
const STICKY = '[@media(min-height:45rem)]:lg:sticky [@media(min-height:45rem)]:lg:top-20'
const STICKY_SCROLL =
  '[@media(min-height:45rem)]:lg:max-h-[calc(100dvh-6rem)] [@media(min-height:45rem)]:lg:overflow-y-auto'

/**
 * 摘要取值：中文只在空格、标点处换行（不把“北京海淀校区”拆成“北京海淀校 / 区”），
 * 单个词超出栏宽时才强制断开。
 */
const SUMMARY_VALUE = 'min-w-0 font-medium break-keep text-foreground wrap-break-word'

type CourseSidebarProps = {
  course: Pick<CourseDetail, 'id' | 'title' | 'discipline'>
  /** 后台「课程页面设置 → 课程详情」的侧栏标题与说明 */
  settings: CoursePagesSettings['detail']
  leadConfig: LeadFormConfig
  nextCohort: CohortItem | null
  className?: string
}

/**
 * 课程详情侧栏：标题与说明来自后台，课程摘要（意向课程、近期开班），侧栏形态的留资表单。
 * 页面上只渲染这一份表单：桌面端在右栏吸顶，移动端随网格排到主内容之后（同一个 DOM 实例）。
 * 表单不读取页面级留资上下文，课程与专业在这里显式传入（线索 context.course / discipline）。
 */
export function CourseSidebar({
  course,
  settings,
  leadConfig,
  nextCohort,
  className,
}: CourseSidebarProps) {
  return (
    <aside aria-labelledby={SIDEBAR_TITLE_ID} className={cn('lg:self-start', STICKY, className)}>
      <div
        className={cn(
          'surface-paper flex flex-col gap-4 rounded-md border border-border p-5 md:p-6',
          STICKY_SCROLL,
        )}
      >
        <div className="flex flex-col gap-2">
          <h2 id={SIDEBAR_TITLE_ID} className="text-h3 text-foreground">
            {settings.sidebarTitle}
          </h2>
          {settings.sidebarDescription ? (
            <p className="text-sm text-muted-foreground">{settings.sidebarDescription}</p>
          ) : null}
        </div>

        <dl className="flex flex-col gap-1 border-y border-border py-3 text-sm">
          <div className="flex gap-3">
            <dt className="shrink-0 text-muted-foreground">{t.detail.sidebarCourse}</dt>
            <dd className={SUMMARY_VALUE}>{course.title}</dd>
          </div>
          {nextCohort ? (
            <div className="flex gap-3">
              <dt className="shrink-0 text-muted-foreground">{t.meta.nextCohort}</dt>
              <dd className={cn('numeric', SUMMARY_VALUE)}>
                {formatCohortDate(nextCohort.startDate)} · {cohortPlaceLabel(nextCohort)}
              </dd>
            </div>
          ) : null}
        </dl>

        <LeadForm
          config={leadConfig}
          variant="sidebar"
          position="course_sidebar"
          intent="trial"
          courseId={course.id}
          disciplineId={course.discipline.id}
          className="gap-3"
        />
      </div>
    </aside>
  )
}
