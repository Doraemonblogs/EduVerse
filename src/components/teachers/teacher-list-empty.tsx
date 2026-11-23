import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { COURSES_PATH } from '@/lib/course/paths'
import { TEACHERS_PATH } from '@/lib/teachers/paths'
import { cn } from '@/lib/utils'

const t = zh.teachers.list

type TeacherListEmptyProps = {
  /**
   * true：有讲师，但当前筛选条件下没有 → 说明 + “清除筛选”（回到全部讲师）+ 专业课程；
   * false：还没有任何已发布的讲师 → 说明 + 专业课程
   */
  filtered: boolean
  className?: string
}

/** 讲师列表的空状态（服务端组件） */
export function TeacherListEmpty({ filtered, className }: TeacherListEmptyProps) {
  return (
    <section
      aria-labelledby="teacher-list-empty-title"
      className={cn(
        'flex flex-col items-start gap-4 rounded-md bg-muted px-5 py-8 md:px-10 md:py-12',
        className,
      )}
    >
      <h2 id="teacher-list-empty-title" className="text-h3 text-foreground">
        {filtered ? t.emptyTitle : t.noTeachersTitle}
      </h2>
      <p className="max-w-2xl text-base text-muted-foreground">
        {filtered ? t.emptyDescription : t.noTeachersDescription}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {filtered ? (
          // 品牌橙只用于留资按钮：清除筛选用深色实心按钮
          <Button asChild variant="secondary">
            <Link href={TEACHERS_PATH} rel="nofollow" prefetch={false} scroll={false}>
              {zh.filterBar.clear}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={COURSES_PATH} prefetch={false}>
            {t.viewCourses}
          </Link>
        </Button>
      </div>
    </section>
  )
}
