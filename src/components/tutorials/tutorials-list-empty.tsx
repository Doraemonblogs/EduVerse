import Link from 'next/link'

import { LeadCTA } from '@/components/lead/lead-cta'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { COURSES_PATH } from '@/lib/course/paths'
import { TUTORIALS_PATH } from '@/lib/tutorials/paths'
import { cn } from '@/lib/utils'

const t = zh.tutorials.list

/** 还没有任何教程时“预约试听”的留资位置标识 */
export const TUTORIALS_LIST_EMPTY_POSITION = 'tutorials_list_empty'

export type TutorialsListEmptyProps = {
  /**
   * 是否是筛选无结果：
   * - true：说明 + “清除筛选”（回到全部教程）+ “查看专业课程”；
   * - false：还没有任何已发布的教程——说明 + “预约试听”（留资弹窗，intent trial）+ “查看专业课程”。
   */
  filtered: boolean
  className?: string
}

/** 教程列表空状态（服务端组件） */
export function TutorialsListEmpty({ filtered, className }: TutorialsListEmptyProps) {
  return (
    <section
      aria-labelledby="tutorials-list-empty-title"
      className={cn(
        'flex flex-col items-start gap-4 rounded-md bg-muted px-5 py-8 md:px-10 md:py-12',
        className,
      )}
    >
      <h2 id="tutorials-list-empty-title" className="text-h3 text-foreground">
        {filtered ? t.emptyTitle : t.noTutorialsTitle}
      </h2>
      <p className="max-w-2xl text-base text-muted-foreground">
        {filtered ? t.emptyDescription : t.noTutorialsDescription}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {filtered ? (
          <Button asChild variant="secondary">
            <Link href={TUTORIALS_PATH} rel="nofollow" prefetch={false} scroll={false}>
              {zh.filterBar.clear}
            </Link>
          </Button>
        ) : (
          <LeadCTA position={TUTORIALS_LIST_EMPTY_POSITION} intent="trial">
            {t.trial}
          </LeadCTA>
        )}
        <Button asChild variant="outline">
          <Link href={COURSES_PATH} prefetch={false}>
            {t.viewCourses}
          </Link>
        </Button>
      </div>
    </section>
  )
}
