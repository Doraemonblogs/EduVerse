import { z } from 'zod'

import { SOURCE_FIELD_MAX, truncateText } from '@/lib/validation/lead'

import type { QuizAnswer } from './score'
import type { QuizScoreItem } from './types'

/**
 * 职业测试结果的序列化（线索 context.quizResult，纯函数）。
 *
 * 留资表单把它作为隐藏字段 quizResult 提交；服务端（submitLead）只对意向为“职业测试”的线索按 quizResultSchema
 * 校验后存入（后台“职业测试结果”，未知的键被去掉），格式不对或其它意向的线索不存。
 * 结构（键名可读，课程顾问在后台直接查看）：
 * ```json
 * {
 *   "version": 1,
 *   "recommended": { "id": 3, "name": "三维动画与影视动画" },
 *   "scores": [{ "id": 3, "name": "三维动画与影视动画", "score": 12, "percent": 28 }, …],
 *   "answers": [{ "question": 41, "option": 0 }, …]
 * }
 * ```
 * 序列化结果保证不超过校验上限（SOURCE_FIELD_MAX.quizResult，超出会被服务端截断成无法解析的 JSON）：
 * 过长时依次去掉分项里的方向名称 → 只保留得分大于 0 的方向 → 只保留前 3 名 → 去掉答案 → 去掉推荐方向名称；
 * 同时保证结果符合 quizResultSchema 的上限（名称长度、方向数、答案数），否则服务端会整条丢弃。
 */

export const QUIZ_RESULT_VERSION = 1

/** 结构上限（服务端校验）：方向名称长度、方向得分条数、答案条数 */
export const QUIZ_RESULT_LIMITS = { name: 100, scores: 50, answers: 200 } as const

const idSchema = z.number().int().positive()
const nameSchema = z.string().max(QUIZ_RESULT_LIMITS.name).optional()

export const quizResultSchema = z.object({
  version: z.literal(QUIZ_RESULT_VERSION),
  recommended: z.object({ id: idSchema, name: nameSchema }).nullable(),
  scores: z
    .array(
      z.object({
        id: idSchema,
        name: nameSchema,
        score: z.number().nonnegative(),
        percent: z.number().int().min(0).max(100),
      }),
    )
    .max(QUIZ_RESULT_LIMITS.scores)
    .optional(),
  answers: z
    .array(z.object({ question: idSchema, option: z.number().int().nonnegative() }))
    .max(QUIZ_RESULT_LIMITS.answers)
    .optional(),
})

export type QuizResultRecord = z.infer<typeof quizResultSchema>

type BuildInput = {
  /** 题目（顺序与 answers 一一对应），只需要 ID */
  questions: readonly { id: number }[]
  answers: readonly QuizAnswer[]
  /** scoreQuiz() 的结果（已排序） */
  scores: readonly QuizScoreItem[]
  /** 推荐方向的 ID（pickRecommendation()?.disciplineId）；没有推荐时为 null */
  recommendedId: number | null
  /** 专业方向名称（用于让后台记录可读） */
  disciplines: readonly { id: number; name: string }[]
}

/**
 * 由答题结果组装线索记录（未作答的题目不写入 answers）。
 * 符合结构上限：方向名称截断到 QUIZ_RESULT_LIMITS.name，方向得分只保留前 QUIZ_RESULT_LIMITS.scores 名。
 */
export function buildQuizResult({
  questions,
  answers,
  scores,
  recommendedId,
  disciplines,
}: BuildInput): QuizResultRecord {
  const names = new Map(
    disciplines.map((d) => [d.id, truncateText(d.name, QUIZ_RESULT_LIMITS.name)]),
  )
  return {
    version: QUIZ_RESULT_VERSION,
    recommended:
      recommendedId === null ? null : { id: recommendedId, name: names.get(recommendedId) },
    scores: scores.slice(0, QUIZ_RESULT_LIMITS.scores).map((item) => ({
      id: item.disciplineId,
      name: names.get(item.disciplineId),
      score: item.score,
      percent: item.percent,
    })),
    answers: questions.flatMap((question, index) => {
      const option = answers[index]
      return typeof option === 'number' && Number.isInteger(option) && option >= 0
        ? [{ question: question.id, option }]
        : []
    }),
  }
}

/** 逐步精简的候选（从完整到最小），取第一个符合格式且不超长的 */
function candidates(record: QuizResultRecord): QuizResultRecord[] {
  const scores = record.scores ?? []
  const unnamed = scores.map((item) => ({ ...item, name: undefined }))
  const positive = unnamed.filter((item) => item.score > 0)
  const top3 = positive.slice(0, 3)
  const recommendedId = record.recommended ? { id: record.recommended.id } : null
  return [
    record,
    { ...record, scores: unnamed },
    { ...record, scores: positive },
    { ...record, scores: top3 },
    { ...record, scores: top3, answers: undefined },
    { version: record.version, recommended: record.recommended },
    { version: record.version, recommended: recommendedId },
  ]
}

/**
 * 序列化为留资表单的隐藏字段 quizResult（JSON 字符串），长度不超过 max（默认为校验上限），
 * 并且能通过服务端的 quizResultSchema 校验。
 * 连最小形式都不行（不会发生：最小形式只有版本号与推荐方向 ID）时返回空字符串（不提交测试结果）。
 */
export function serializeQuizResult(
  record: QuizResultRecord,
  max: number = SOURCE_FIELD_MAX.quizResult,
): string {
  for (const candidate of candidates(record)) {
    const json = JSON.stringify(candidate)
    if (json.length <= max && quizResultSchema.safeParse(candidate).success) return json
  }
  return ''
}

/**
 * 解析测试结果：接受 JSON 字符串或已解析的对象（线索 context.quizResult 存的是 JSON 值）。
 * 格式不对时返回 null。
 */
export function parseQuizResult(value: unknown): QuizResultRecord | null {
  let data = value
  if (typeof value === 'string') {
    try {
      data = JSON.parse(value)
    } catch {
      return null
    }
  }
  const parsed = quizResultSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}
