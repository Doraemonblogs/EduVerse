import type { CourseCardData, DisciplineRef } from '@/lib/course/types'
import type { ImageSource } from '@/lib/media'
import type { QuizSetting } from '@/payload-types'

/**
 * 职业测试（/quiz）的视图模型。
 *
 * - 全部是可 JSON 序列化的普通对象：可以直接作为 props 传给客户端组件（QuizRunner），也能进 unstable_cache；
 * - 由数据层 `src/lib/data/quiz.ts` 从 Payload 文档映射而来；
 * - 草稿已在数据层剔除：专业方向都是已发布的；选项的加分只保留已发布专业方向（未发布方向的分值直接丢弃）。
 */

/** 选项给某个专业方向的加分 */
export type QuizOptionScore = {
  disciplineId: number
  /** 分值（0–5，非负数） */
  weight: number
}

export type QuizOption = {
  label: string
  /** 只含已发布专业方向；可能为空（这个选项不给任何方向加分） */
  scores: QuizOptionScore[]
}

export type QuizQuestionData = {
  id: number
  question: string
  /** 后台顺序；答案用选项在这里的下标（0 起）表示 */
  options: QuizOption[]
}

/** 参与计分与推荐的专业方向（已发布，按后台排序：同分时排序靠前的优先） */
export type QuizDiscipline = DisciplineRef & {
  tagline: string | null
  /** 封面（card 尺寸 800 宽） */
  cover: ImageSource | null
  /**
   * 这个方向的课程卡片（最多 3 门，同课程列表排序；来自 getCourseCards，已发布且专业方向已发布）。
   * cohorts 是全部未结束的开班，渲染时用 upcomingCohorts(card.cohorts, new Date()) 过滤。
   */
  courses: CourseCardData[]
}

export type QuizData = {
  /** 题目（按后台排序 order、ID）；没有选项的题目已剔除 */
  questions: QuizQuestionData[]
  /** 已发布的专业方向（按后台排序 order、ID） */
  disciplines: QuizDiscipline[]
}

export type QuizNextStep = { title: string; description: string | null }

/** 职业测试设置（全局 quiz-settings），缺省值见 src/globals/quiz-settings-defaults.ts */
export type QuizSettingsData = {
  intro: {
    title: string
    /** 后台清空时为 null（不显示） */
    description: string | null
    startLabel: string
  }
  result: {
    /** 摘要（公开）标题，如“你的推荐方向” */
    summaryTitle: string
    /** 未留资时完整报告位置的标题，如“获取完整报告” */
    gatedTitle: string
    gatedDescription: string | null
    /** 留资表单的提交按钮文字 */
    unlockLabel: string
    /** 留资后展开的完整报告标题 */
    reportTitle: string
    /** 结果仅供参考的说明（后台清空时为 null） */
    disclaimer: string | null
    nextStepsTitle: string
    /** 下一步建议（完整报告末尾）；后台清空时为空数组 */
    nextSteps: QuizNextStep[]
  }
  /** 原样交给 buildMetadata({ seo }) */
  seo: QuizSetting['seo'] | null
}

/** 计分结果中的一个专业方向 */
export type QuizScoreItem = {
  disciplineId: number
  /** 累计分值 */
  score: number
  /** 占全部得分的百分比（整数，四舍五入；同分同百分比，合计不一定恰为 100）；总分为 0 时都是 0 */
  percent: number
  /** 相对最高分的比例（0–1），用于条形图宽度；最高分为 0 时都是 0 */
  ratio: number
}
