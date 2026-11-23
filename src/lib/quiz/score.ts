import type { QuizOption, QuizScoreItem } from './types'

/**
 * 职业测试计分（纯函数，客户端 QuizRunner 与测试共用）。
 *
 * - 每道题选中的选项给相关专业方向加分，按专业方向累计；
 * - 排序：分值从高到低，同分按专业方向的后台排序（disciplineIds 中的先后）；
 * - 只计 disciplineIds 中的方向（已发布方向）；未作答、下标越界、分值非法（负数、非有限数）的忽略。
 */

/** 只需要题目的选项 */
type ScoredQuestion = { options: readonly Pick<QuizOption, 'scores'>[] }

/** 一道题的答案：选项下标（0 起）；null / undefined 表示未作答 */
export type QuizAnswer = number | null | undefined

function selectedOption(question: ScoredQuestion | undefined, answer: QuizAnswer) {
  if (!question || typeof answer !== 'number' || !Number.isInteger(answer)) return undefined
  return question.options[answer]
}

/**
 * 计算各专业方向的得分并排序。
 * @param questions 题目（顺序与 answers 一一对应）
 * @param answers 每道题选中的选项下标
 * @param disciplineIds 参与计分的专业方向 ID，按后台排序（同分时靠前的优先）
 */
export function scoreQuiz(
  questions: readonly ScoredQuestion[],
  answers: readonly QuizAnswer[],
  disciplineIds: readonly number[],
): QuizScoreItem[] {
  const totals = new Map<number, number>()
  for (const id of disciplineIds) totals.set(id, 0)

  questions.forEach((question, index) => {
    const option = selectedOption(question, answers[index])
    for (const { disciplineId, weight } of option?.scores ?? []) {
      const current = totals.get(disciplineId)
      if (current === undefined || !Number.isFinite(weight) || weight <= 0) continue
      totals.set(disciplineId, current + weight)
    }
  })

  const rank = new Map([...totals.keys()].map((id, index) => [id, index]))
  const entries = [...totals.entries()].sort(
    ([a, scoreA], [b, scoreB]) => scoreB - scoreA || (rank.get(a) ?? 0) - (rank.get(b) ?? 0),
  )
  const total = entries.reduce((sum, [, score]) => sum + score, 0)
  const top = entries[0]?.[1] ?? 0

  return entries.map(([disciplineId, score]) => ({
    disciplineId,
    score,
    percent: total > 0 ? Math.round((score / total) * 100) : 0,
    ratio: top > 0 ? score / top : 0,
  }))
}

/** 推荐方向：排第一且得分大于 0 的方向；一分都没有（选项都未配置加分）时返回 null */
export function pickRecommendation(scores: readonly QuizScoreItem[]): QuizScoreItem | null {
  const first = scores[0]
  return first && first.score > 0 ? first : null
}

/** 是否每道题都已作答（下标是该题选项范围内的整数），且答案数与题目数一致 */
export function isQuizComplete(
  questions: readonly ScoredQuestion[],
  answers: readonly QuizAnswer[],
): boolean {
  return (
    questions.length > 0 &&
    answers.length === questions.length &&
    questions.every((question, index) => selectedOption(question, answers[index]) !== undefined)
  )
}
