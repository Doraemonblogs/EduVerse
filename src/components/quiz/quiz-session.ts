import { z } from 'zod'

import { type QuizAnswer } from '@/lib/quiz/score'

/**
 * 本会话最近一次完成的测试答案（sessionStorage）：同一标签页内再次进入 /quiz 时直接显示上次的结果页
 * （本会话已留资时连同完整报告，见 src/lib/quiz/storage.ts），“重新测试”时清除。
 *
 * - 按题目 ID 记录选项下标，恢复时对照当前题目逐题校验：题目增删、选项减少后记录失效，回到开始页；
 * - 存储里的内容视为外部输入，用 zod 校验；每次读写都包 try/catch（隐私模式、存储被禁用时会抛错）；
 * - 只在客户端调用（事件处理、effect、useSyncExternalStore 的客户端快照）。
 */

/** sessionStorage 键 */
export const QUIZ_ANSWERS_STORAGE_KEY = 'eduverse:quiz-answers'

const VERSION = 1

const savedSchema = z.object({
  version: z.literal(VERSION),
  answers: z
    .array(
      z.object({
        question: z.number().int().positive(),
        option: z.number().int().nonnegative(),
      }),
    )
    .max(200),
})

/** 恢复时只需要题目 ID 与选项数 */
type QuestionShape = { id: number; options: readonly unknown[] }

/** 序列化一次完成的答案；有未作答的题目时返回 null（不记录未完成的测试） */
export function serializeQuizAnswers(
  questions: readonly QuestionShape[],
  answers: readonly QuizAnswer[],
): string | null {
  const entries: { question: number; option: number }[] = []
  for (const [index, question] of questions.entries()) {
    const option = answers[index]
    if (typeof option !== 'number' || !Number.isInteger(option) || option < 0) return null
    if (option >= question.options.length) return null
    entries.push({ question: question.id, option })
  }
  return entries.length > 0 ? JSON.stringify({ version: VERSION, answers: entries }) : null
}

/**
 * 解析会话记录，按当前题目顺序还原答案（选项下标数组）。
 * 记录缺失、格式不对、缺少某道当前题目的答案或下标越界时返回 null。
 */
export function parseQuizAnswers(
  raw: string | null | undefined,
  questions: readonly QuestionShape[],
): number[] | null {
  if (!raw || questions.length === 0) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = savedSchema.safeParse(data)
  if (!parsed.success) return null
  const byQuestion = new Map(parsed.data.answers.map((entry) => [entry.question, entry.option]))
  const answers: number[] = []
  for (const question of questions) {
    const option = byQuestion.get(question.id)
    if (option === undefined || option >= question.options.length) return null
    answers.push(option)
  }
  return answers
}

/** 读取原始记录（客户端快照；存储不可用时为 null） */
export function readSavedQuizAnswers(): string | null {
  try {
    return window.sessionStorage.getItem(QUIZ_ANSWERS_STORAGE_KEY)
  } catch {
    return null
  }
}

/** 记录本次完成的答案；存储不可用时静默忽略（只是下次进入不能恢复） */
export function saveQuizAnswers(value: string): void {
  try {
    window.sessionStorage.setItem(QUIZ_ANSWERS_STORAGE_KEY, value)
  } catch {
    // 存储不可用：不影响本次答题
  }
}

/** 清除记录（重新测试） */
export function clearSavedQuizAnswers(): void {
  try {
    window.sessionStorage.removeItem(QUIZ_ANSWERS_STORAGE_KEY)
  } catch {
    // 存储不可用：本来也没有记录
  }
}
