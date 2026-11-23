import { QUIZ_SETTINGS_DEFAULTS } from '@/globals/quiz-settings-defaults'
import { relationId } from '@/lib/course/mappers'
import type { QuizQuestion, QuizSetting } from '@/payload-types'

import type { QuizData, QuizQuestionData, QuizSettingsData } from './types'

/**
 * Payload 文档 → 职业测试视图模型（纯函数，供 src/lib/data/quiz.ts 使用，可单测）。
 */

/**
 * 设置里的可选文本（与 src/lib/data/courses.ts 的 optionalText 规则一致）：
 * 从未保存过（undefined）用默认值；后台清空（null / 空字符串）则不显示。
 */
function optionalTextOr(value: string | null | undefined, fallback: string): string | null {
  if (value === undefined) return fallback
  return value?.trim() || null
}

export type QuizQuestionSource = Pick<QuizQuestion, 'id' | 'question' | 'options'>

/**
 * 题目：选项的加分只保留 publishedIds 中的专业方向（未发布 / 已删除方向的分值丢弃），
 * 分值必须是非负有限数；没有选项的题目返回 null（无法作答，不展示）。
 */
export function toQuizQuestion(
  doc: QuizQuestionSource,
  publishedIds: ReadonlySet<number>,
): QuizQuestionData | null {
  const options = (doc.options ?? [])
    .map((option) => ({
      label: option.label.trim(),
      scores: (option.scores ?? []).flatMap((score) => {
        const disciplineId = relationId(score.discipline)
        const weight = Number(score.weight)
        return disciplineId !== null &&
          publishedIds.has(disciplineId) &&
          Number.isFinite(weight) &&
          weight >= 0
          ? [{ disciplineId, weight }]
          : []
      }),
    }))
    .filter((option) => option.label)
  const question = doc.question.trim()
  if (!question || options.length === 0) return null
  return { id: doc.id, question, options }
}

/** 职业测试设置：必填文字缺失时用默认值；可选文字从未保存用默认值、后台清空则为 null */
export function toQuizSettings(
  doc: Partial<Pick<QuizSetting, 'intro' | 'result' | 'seo'>>,
): QuizSettingsData {
  const D = QUIZ_SETTINGS_DEFAULTS
  const intro = doc.intro
  const result = doc.result
  const steps =
    result?.nextSteps === undefined
      ? D.result.nextSteps.map((step) => ({ ...step }))
      : (result.nextSteps ?? [])
          .map((step) => ({
            title: step.title?.trim() ?? '',
            description: step.description?.trim() || null,
          }))
          .filter((step) => step.title)
  return {
    intro: {
      title: intro?.title?.trim() || D.intro.title,
      description: optionalTextOr(intro?.description, D.intro.description),
      startLabel: intro?.startLabel?.trim() || D.intro.startLabel,
    },
    result: {
      summaryTitle: result?.summaryTitle?.trim() || D.result.summaryTitle,
      gatedTitle: result?.gatedTitle?.trim() || D.result.gatedTitle,
      gatedDescription: optionalTextOr(result?.gatedDescription, D.result.gatedDescription),
      unlockLabel: result?.unlockLabel?.trim() || D.result.unlockLabel,
      reportTitle: result?.reportTitle?.trim() || D.result.reportTitle,
      disclaimer: optionalTextOr(result?.disclaimer, D.result.disclaimer),
      nextStepsTitle: result?.nextStepsTitle?.trim() || D.result.nextStepsTitle,
      nextSteps: steps,
    },
    seo: doc.seo ?? null,
  }
}

/** 测试能否进行：至少一道题、至少一个已发布的专业方向（否则页面显示空状态） */
export function isQuizAvailable(data: Pick<QuizData, 'questions' | 'disciplines'>): boolean {
  return data.questions.length > 0 && data.disciplines.length > 0
}
