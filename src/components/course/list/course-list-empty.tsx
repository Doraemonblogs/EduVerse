import Link from 'next/link'

import { LeadCTA } from '@/components/lead/lead-cta'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { COURSES_PATH } from '@/lib/course/paths'
import { cn } from '@/lib/utils'

const t = zh.course

/**
 * 筛选无结果：说明 + 两个出口——咨询课程顾问（留资弹窗，intent consult，position course_list_empty）
 * 与“清除筛选”（回到全部课程）。
 */
export function CourseListEmpty({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="course-list-empty-title"
      className={cn(
        'flex flex-col items-start gap-4 rounded-md bg-muted px-5 py-8 md:px-10 md:py-12',
        className,
      )}
    >
      <h2 id="course-list-empty-title" className="text-h3 text-foreground">
        {t.list.emptyTitle}
      </h2>
      <p className="max-w-2xl text-base text-muted-foreground">{t.list.emptyDescription}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <LeadCTA position="course_list_empty" intent="consult">
          {t.list.emptyConsult}
        </LeadCTA>
        <Button asChild variant="outline">
          <Link href={COURSES_PATH} rel="nofollow" prefetch={false} scroll={false}>
            {zh.filterBar.clear}
          </Link>
        </Button>
      </div>
    </section>
  )
}
