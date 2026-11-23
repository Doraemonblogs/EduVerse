import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from 'lucide-react'
import { useId, type FormEvent, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { type QuizAnswer } from '@/lib/quiz/score'
import { type QuizQuestionData } from '@/lib/quiz/types'
import { cn } from '@/lib/utils'

import { quizProgress } from './quiz-runner-model'

const t = zh.quiz.runner

/** 选项前的字母序号（A、B、C …，纯装饰，读屏只读选项文字） */
function optionLetter(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1)
}

type QuizQuestionProps = {
  question: QuizQuestionData
  /** 第几题（0 起） */
  index: number
  total: number
  answer: QuizAnswer
  /** 未选择就尝试进入下一题 */
  showHint: boolean
  onSelect: (option: number) => void
  onNext: () => void
  onPrevious: () => void
}

/**
 * 一屏一题（QuizRunner 的答题屏）：进度文字 + 进度条（role=progressbar）→ `<fieldset>` + `<legend>` 的单选组 → 上一题 / 下一题。
 *
 * - 选项是原生单选框（方向键切换、空格选择），整张选项卡片都是点击区域（单选框透明铺满卡片），焦点描边画在卡片上；
 * - 在选项上按回车 = 下一题；“下一题”是表单的提交按钮，未选择时 aria-disabled（仍可聚焦、仍响应点击），
 *   点击、轻触或用键盘触发时只显示“请选择一个选项后继续”（role=status），停留在本题；
 * - 最后一题的按钮文字为“查看结果”。焦点移动与滚动由 QuizRunner 负责。
 */
export function QuizQuestion({
  question,
  index,
  total,
  answer,
  showHint,
  onSelect,
  onNext,
  onPrevious,
}: QuizQuestionProps) {
  const id = useId()
  const progressId = `${id}-progress`
  const hintId = `${id}-hint`
  const answered = typeof answer === 'number'
  const isLast = index + 1 >= total
  const progressText = formatMessage(t.progress, { current: index + 1, total })
  const percent = Math.round(quizProgress({ kind: 'question', index }, total) * 100)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onNext()
  }

  // 在选项上按回车进入下一题（各浏览器对单选框的隐式提交并不一致，这里显式处理）
  const handleOptionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    onNext()
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-6 rounded-md border border-border bg-card p-5 text-card-foreground sm:p-8 md:gap-8 md:p-10"
    >
      <div className="flex flex-col gap-3">
        <p id={progressId} className="numeric text-sm font-medium text-muted-foreground">
          {progressText}
        </p>
        <div
          role="progressbar"
          aria-label={t.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={progressText}
          className="h-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-standard motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <fieldset aria-describedby={showHint ? `${progressId} ${hintId}` : progressId}>
        <legend className="text-h3 text-foreground">{question.question}</legend>
        <div className="mt-6 grid gap-3">
          {question.options.map((option, optionIndex) => {
            const checked = answer === optionIndex
            return (
              <label
                key={`${question.id}-${optionIndex}`}
                className={cn(
                  'group relative flex min-h-14 cursor-pointer items-center gap-4 rounded-md border border-border bg-card px-4 py-3 transition-colors duration-150 ease-standard',
                  'hover:border-foreground',
                  'has-checked:border-foreground has-checked:bg-muted',
                  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
                )}
              >
                <input
                  type="radio"
                  name={`quiz-question-${question.id}`}
                  value={optionIndex}
                  checked={checked}
                  onChange={() => onSelect(optionIndex)}
                  onKeyDown={handleOptionKeyDown}
                  className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-md opacity-0"
                />
                <span
                  aria-hidden
                  className={cn(
                    'numeric grid size-8 shrink-0 place-items-center rounded-sm border border-border text-sm font-semibold text-muted-foreground transition-colors',
                    'peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background',
                  )}
                >
                  {optionLetter(optionIndex)}
                </span>
                <span className="min-w-0 flex-1 text-base text-foreground">{option.label}</span>
                <CheckIcon
                  aria-hidden
                  className="size-5 shrink-0 text-foreground opacity-0 transition-opacity peer-checked:opacity-100"
                />
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <p
          id={hintId}
          role="status"
          aria-live="polite"
          className={cn('text-sm text-destructive', !showHint && 'sr-only')}
        >
          {showHint ? t.chooseOne : ''}
        </p>
        <div className="flex items-center gap-3">
          {index > 0 ? (
            <Button type="button" variant="outline" size="lg" onClick={onPrevious}>
              <ArrowLeftIcon aria-hidden />
              {t.previous}
            </Button>
          ) : null}
          {/* 按钮基础样式在 aria-disabled 时屏蔽指针事件（防止重复提交）；这里要让点击 / 轻触也能触发提示，
              所以恢复指针事件，并去掉悬停反馈、换成“不可用”光标 */}
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            className="ml-auto aria-disabled:pointer-events-auto aria-disabled:cursor-not-allowed aria-disabled:hover:bg-secondary"
            aria-disabled={!answered}
          >
            {isLast ? t.finish : t.next}
            <ArrowRightIcon aria-hidden />
          </Button>
        </div>
      </div>
    </form>
  )
}
