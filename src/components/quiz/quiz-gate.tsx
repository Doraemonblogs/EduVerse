import { LockIcon } from 'lucide-react'

import { LeadForm } from '@/components/lead/lead-form'
import { type LeadFormConfig } from '@/components/lead/types'
import { type QuizSettingsData } from '@/lib/quiz/types'
import { cn } from '@/lib/utils'

/** 锁定预览里的装饰条宽度（%）：只表达“这里有一张条形图”，不含任何真实数据 */
const TEASER_BARS = [92, 74, 58, 41, 27]

type QuizGateProps = {
  /** 后台「职业测试设置 · 结果页」的完整报告留资文案 */
  result: Pick<QuizSettingsData['result'], 'gatedTitle' | 'gatedDescription' | 'unlockLabel'>
  config: LeadFormConfig
  /** 推荐方向 ID（表单“意向专业”的默认值，线索的专业方向） */
  disciplineId: number
  /** serializeQuizResult() 的结果，作为隐藏字段提交 */
  quizResult: string
  /**
   * 已在本页提交成功：只保留表单区域（表单自身切换为提交成功提示与添加微信引导），
   * 标题、说明与锁定预览收起——完整报告已在上方展开
   */
  submitted: boolean
  onSuccess: () => void
}

/**
 * 完整报告的留资区（米色卡片）：左侧标题、说明与锁定预览（装饰），右侧页内留资表单
 * （intent quiz、position quiz_result、意向专业 = 推荐方向、quizResult = 答案与各方向得分）。
 * 表单始终渲染在同一位置：提交成功后父组件在上方展开完整报告，这里的表单实例保持挂载，继续显示成功提示。
 * 页面以这张表单收尾时隐藏页脚重复的行动号召横幅（data-page-end-cta）。
 * 完整报告是营销引导而非访问控制：报告数据随页面一起下发（见 docs/ARCHITECTURE.md §4.6）。
 */
export function QuizGate({
  result,
  config,
  disciplineId,
  quizResult,
  submitted,
  onSuccess,
}: QuizGateProps) {
  const titleId = 'quiz-gate-title'
  return (
    <section
      aria-labelledby={submitted ? undefined : titleId}
      data-page-end-cta=""
      className={cn(
        'surface-paper grid gap-8 rounded-md p-5 sm:p-8 md:p-10',
        !submitted && 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16',
      )}
    >
      {submitted ? null : (
        <div className="flex flex-col gap-4">
          <h2 id={titleId} className="text-h2 text-foreground">
            {result.gatedTitle}
          </h2>
          {result.gatedDescription ? (
            <p className="text-base text-muted-foreground">{result.gatedDescription}</p>
          ) : null}
          <div
            aria-hidden
            className="relative mt-4 hidden flex-col gap-3 rounded-md border border-border bg-card p-5 lg:flex"
          >
            {TEASER_BARS.map((width) => (
              <span key={width} className="flex items-center gap-3">
                <span className="h-2 w-16 rounded-full bg-accent" />
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-accent">
                  <span
                    className="block h-full rounded-full bg-muted-foreground/40"
                    style={{ width: `${width}%` }}
                  />
                </span>
              </span>
            ))}
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-11 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <LockIcon className="size-5" />
              </span>
            </span>
          </div>
        </div>
      )}
      <div
        className={cn(
          // 手机上表单直接放在米色卡片里（不再套一层白卡片，输入框更宽）
          'sm:rounded-md sm:border sm:border-border sm:bg-card sm:p-6 sm:text-card-foreground md:p-8',
          submitted && 'mx-auto w-full max-w-xl',
        )}
      >
        <LeadForm
          config={config}
          variant="inline"
          position="quiz_result"
          intent="quiz"
          disciplineId={disciplineId}
          quizResult={quizResult || undefined}
          submitLabel={result.unlockLabel}
          onSuccess={onSuccess}
        />
      </div>
    </section>
  )
}
