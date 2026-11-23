import { ArrowRightIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { type QuizDiscipline } from '@/lib/quiz/types'

const t = zh.quiz.runner

type QuizIntroProps = {
  /** 开始按钮文字（后台「职业测试设置 · 开始页」） */
  startLabel: string
  questionCount: number
  disciplines: readonly Pick<QuizDiscipline, 'id' | 'shortName'>[]
  /** 水合前按钮不可用（点击不会有反应） */
  ready: boolean
  onStart: () => void
}

/**
 * 开始页（QuizRunner 的第一屏，服务端渲染）：题量、键盘操作提示、开始按钮，以及测试涵盖的专业方向。
 * 标题与说明在页面标题区（后台「职业测试设置 · 开始页」），这里不重复。
 */
export function QuizIntro({
  startLabel,
  questionCount,
  disciplines,
  ready,
  onStart,
}: QuizIntroProps) {
  // 题量文案“{count} 道单选题”：数字放大显示，其余文字照常（读屏读整句）
  const [before = '', after = ''] = t.questionCount.split('{count}')
  return (
    <div className="grid gap-8 rounded-md border border-border bg-card p-5 text-card-foreground sm:p-8 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
      <div className="flex flex-col items-start gap-6">
        <p className="flex items-baseline gap-2 text-foreground">
          <span className="sr-only">
            {formatMessage(t.questionCount, { count: questionCount })}
          </span>
          {before.trim() ? (
            <span aria-hidden className="text-lg font-semibold">
              {before.trim()}
            </span>
          ) : null}
          <span aria-hidden className="numeric text-display leading-none">
            {questionCount}
          </span>
          {after.trim() ? (
            <span aria-hidden className="text-lg font-semibold">
              {after.trim()}
            </span>
          ) : null}
        </p>
        <p className="hidden text-sm text-muted-foreground md:block">{t.keyboardHint}</p>
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={!ready}
          onClick={onStart}
        >
          {startLabel}
          <ArrowRightIcon aria-hidden />
        </Button>
      </div>

      {disciplines.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-16">
          <h2 className="text-sm font-semibold text-muted-foreground">{t.coverage}</h2>
          <ul role="list" className="flex flex-wrap gap-2">
            {disciplines.map((discipline) => (
              <li key={discipline.id}>
                <Badge variant="outline" className="px-3 py-1 text-sm text-foreground">
                  {discipline.shortName}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
