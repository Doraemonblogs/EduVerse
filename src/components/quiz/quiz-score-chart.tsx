import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { type QuizScoreItem } from '@/lib/quiz/types'
import { cn } from '@/lib/utils'

const t = zh.quiz.report

export type QuizScoreRow = QuizScoreItem & { name: string }

type QuizScoreChartProps = {
  /** 已排序的得分（scoreQuiz 的结果，附专业方向名称） */
  rows: readonly QuizScoreRow[]
  /** 推荐方向（第 1 名）的 ID；没有推荐时为 null */
  recommendedId: number | null
  className?: string
}

/**
 * 各方向得分条形图（有序列表，按得分从高到低）：每行写明方向名称与得分占比的文字，
 * 条的长度按相对最高分（ratio）绘制，推荐方向另加“推荐”文字徽标——不只靠颜色或长度表达。
 * 读屏每行读一句完整的话（scoreLabel），可见的名称、条、数字对读屏隐藏，避免重复。
 */
export function QuizScoreChart({ rows, recommendedId, className }: QuizScoreChartProps) {
  return (
    <ol role="list" className={cn('flex flex-col gap-4', className)}>
      {rows.map((row) => {
        const recommended = row.disciplineId === recommendedId
        const label = formatMessage(recommended ? t.scoreLabelRecommended : t.scoreLabel, {
          name: row.name,
          percent: row.percent,
        })
        return (
          <li key={row.disciplineId} className="flex flex-col gap-1.5">
            <span className="sr-only">{label}</span>
            <span aria-hidden className="flex items-baseline justify-between gap-3 text-sm">
              <span
                className={cn(
                  'flex min-w-0 items-center gap-2',
                  recommended ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className="min-w-0 truncate">{row.name}</span>
                {recommended ? (
                  <span className="shrink-0 rounded-xs bg-secondary px-1.5 text-xs leading-5 font-medium text-secondary-foreground">
                    {t.recommended}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  'numeric shrink-0',
                  recommended ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {formatMessage(t.scoreValue, { percent: row.percent })}
              </span>
            </span>
            <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  'block h-full rounded-full',
                  recommended ? 'bg-foreground' : 'bg-subtle-foreground/60',
                )}
                style={{ width: `${Math.round(row.ratio * 100)}%` }}
              />
            </span>
          </li>
        )
      })}
    </ol>
  )
}
