import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

import { CourseCard } from '@/components/course/course-card'
import { LeadCTA } from '@/components/lead/lead-cta'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { majorPath } from '@/lib/course/paths'
import { type QuizDiscipline, type QuizSettingsData } from '@/lib/quiz/types'

import { QuizScoreChart, type QuizScoreRow } from './quiz-score-chart'

const t = zh.quiz.report

/** 推荐课程网格（1 / 2 / 3 列，版心 1280px，桌面端右侧给悬浮栏让位）的封面图宽度 */
const COURSE_IMAGE_SIZES =
  '(min-width: 1360px) 410px, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, 100vw'

type QuizReportProps = {
  /** 后台「职业测试设置 · 结果页」的完整报告文案 */
  result: Pick<
    QuizSettingsData['result'],
    'reportTitle' | 'disclaimer' | 'nextStepsTitle' | 'nextSteps'
  >
  rows: readonly QuizScoreRow[]
  recommended: QuizDiscipline
  /** 本轮测试结果（serializeQuizResult 的 JSON）：“预约试听”弹窗随线索提交 */
  quizResult: string
  /** 完整报告标题的 id（QuizRunner 展开报告后把焦点移到这里） */
  titleId: string
}

/**
 * 完整报告（留资后展开）：标题与“仅供参考”说明 → 各方向得分条形图 + 下一步建议（≥ lg 左右两栏）
 * → 推荐方向的课程（CourseCard，最多 3 门，末尾链接到专业方向页）。
 * 推荐方向暂时没有课程时显示说明与“预约试听”按钮（留资弹窗，意向 quiz，位置 quiz_result，带本轮测试结果——
 * 本会话已留资时之后几轮不再显示留资区，这个按钮是唯一能把新一轮答案交给顾问的入口）。
 */
export function QuizReport({ result, rows, recommended, quizResult, titleId }: QuizReportProps) {
  const now = new Date()
  const stepsId = `${titleId}-steps`
  const scoresId = `${titleId}-scores`
  const coursesId = `${titleId}-courses`

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-12 md:gap-16">
      <div className="flex max-w-3xl flex-col gap-3">
        <h2 id={titleId} tabIndex={-1} className="text-h2 text-foreground outline-none">
          {result.reportTitle}
        </h2>
        {result.disclaimer ? (
          <p className="text-sm text-muted-foreground">{result.disclaimer}</p>
        ) : null}
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <section aria-labelledby={scoresId} className="flex flex-col gap-6">
          <h3 id={scoresId} className="text-h3 text-foreground">
            {t.scoresTitle}
          </h3>
          <QuizScoreChart rows={rows} recommendedId={recommended.id} />
        </section>

        {result.nextSteps.length > 0 ? (
          <section aria-labelledby={stepsId} className="flex flex-col gap-6">
            <h3 id={stepsId} className="text-h3 text-foreground">
              {result.nextStepsTitle}
            </h3>
            <ol role="list" className="flex flex-col border-t border-border">
              {result.nextSteps.map((step, index) => (
                <li
                  key={`${index}-${step.title}`}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 border-b border-border py-5"
                >
                  <span aria-hidden className="numeric text-h3 leading-none text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-base font-semibold text-foreground">{step.title}</span>
                    {step.description ? (
                      <span className="text-sm text-muted-foreground">{step.description}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      <section aria-labelledby={coursesId} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h3 id={coursesId} className="text-h3 text-foreground">
            {t.coursesTitle}
          </h3>
          <Link
            href={majorPath(recommended.slug)}
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-base font-medium text-emphasis underline-offset-4 hover:underline"
          >
            {formatMessage(t.allCourses, { name: recommended.shortName })}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
        </div>
        {recommended.courses.length > 0 ? (
          <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.courses.map((course) => (
              <li key={course.id}>
                <CourseCard
                  course={course}
                  headingLevel="h4"
                  now={now}
                  imageSizes={COURSE_IMAGE_SIZES}
                  leadPosition="quiz_course"
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-md bg-muted px-5 py-8 md:px-10">
            <p className="max-w-2xl text-base text-muted-foreground">{t.noCourses}</p>
            <LeadCTA
              position="quiz_result"
              intent="quiz"
              disciplineId={recommended.id}
              quizResult={quizResult || undefined}
            >
              {zh.quiz.result.consult}
            </LeadCTA>
          </div>
        )}
      </section>
    </section>
  )
}
