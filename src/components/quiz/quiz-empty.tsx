import Link from 'next/link'

import { LeadCTA } from '@/components/lead/lead-cta'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { COURSES_PATH } from '@/lib/course/paths'

const t = zh.quiz.empty

/**
 * 后台还没有题目或已发布的专业方向时的空状态：说明 + 两个出口——浏览专业课程、预约试听（留资弹窗，意向 quiz）。
 */
export function QuizEmpty() {
  return (
    <section
      aria-labelledby="quiz-empty-title"
      className="flex max-w-3xl flex-col items-start gap-4 rounded-md bg-muted px-5 py-8 md:px-10 md:py-12"
    >
      <h2 id="quiz-empty-title" className="text-h3 text-foreground">
        {t.title}
      </h2>
      <p className="text-base text-muted-foreground">{t.description}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={COURSES_PATH}>{t.viewCourses}</Link>
        </Button>
        <LeadCTA position="quiz_empty" intent="quiz">
          {zh.quiz.result.consult}
        </LeadCTA>
      </div>
    </section>
  )
}
