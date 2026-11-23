import { ArrowRightIcon, RotateCcwIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { LeadCTA } from '@/components/lead/lead-cta'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { majorPath } from '@/lib/course/paths'
import { type QuizDiscipline } from '@/lib/quiz/types'
import { cn } from '@/lib/utils'

const t = zh.quiz.result

type QuizSummaryProps = {
  /** 摘要标题（后台「职业测试设置 · 结果页」，如“你的推荐方向”） */
  summaryTitle: string
  /** 推荐方向；所有选项都没有计分、无法推荐时为 null */
  recommended: QuizDiscipline | null
  /** 无法推荐时“预约试听”弹窗带上的测试结果 */
  quizResult: string
  /** 摘要标题的 id（QuizRunner 进入结果页时把焦点移到这里） */
  titleId: string
  onRestart: () => void
}

/**
 * 结果摘要（公开，深色卡片）：推荐方向的名称、tagline、“了解该专业”链接与“重新测试”，≥ md 右侧为方向封面。
 * 无法推荐时说明原因，提供“重新测试”与“预约试听”（留资弹窗，意向 quiz，位置 quiz_result）。
 */
export function QuizSummary({
  summaryTitle,
  recommended,
  quizResult,
  titleId,
  onRestart,
}: QuizSummaryProps) {
  const restart = (
    <Button type="button" variant="outline" size="lg" onClick={onRestart}>
      <RotateCcwIcon aria-hidden />
      {t.restart}
    </Button>
  )

  if (!recommended) {
    return (
      <section
        aria-labelledby={titleId}
        className="surface-dark flex flex-col items-start gap-4 rounded-md p-6 sm:p-8 md:p-12"
      >
        <h2 id={titleId} tabIndex={-1} className="text-h2 outline-none">
          {t.noRecommendationTitle}
        </h2>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          {t.noRecommendationDescription}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <LeadCTA
            position="quiz_result"
            intent="quiz"
            quizResult={quizResult || undefined}
            size="lg"
          >
            {t.consult}
          </LeadCTA>
          {restart}
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'surface-dark grid overflow-hidden rounded-md',
        recommended.cover && 'md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]',
      )}
    >
      <div className="flex flex-col items-start gap-5 p-6 sm:p-8 md:p-12">
        <h2 id={titleId} tabIndex={-1} className="flex flex-col gap-3 outline-none">
          <span className="eyebrow text-muted-foreground">{summaryTitle}</span>{' '}
          <span className="text-h1 text-foreground">{recommended.name}</span>
        </h2>
        {recommended.tagline ? (
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            {recommended.tagline}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3">
          <Button asChild variant="secondary" size="lg">
            <Link href={majorPath(recommended.slug)} prefetch={false}>
              {formatMessage(t.learnMore, { name: recommended.shortName })}
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
          {restart}
        </div>
      </div>
      {recommended.cover ? (
        <div className="relative order-first aspect-video bg-muted md:order-none md:aspect-auto md:min-h-full">
          <Image
            src={recommended.cover.src}
            alt={recommended.cover.alt}
            fill
            sizes="(min-width: 1360px) 520px, (min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
    </section>
  )
}
