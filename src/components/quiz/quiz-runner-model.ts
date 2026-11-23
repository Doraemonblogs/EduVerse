import { type QuizAnswer } from '@/lib/quiz/score'

/**
 * 职业测试答题流程（纯函数状态机，QuizRunner 用 useReducer 驱动，可单测）。
 *
 * 开始页 → 每屏一题（未选择不能进入下一题）→ 结果页；上一题保留已选答案；重新测试清空答案、直接回到第 1 题。
 * `focusKey` 在每次由访客操作引起的换屏时加一：组件据此移动焦点、把答题区滚入视口
 * （从会话记录恢复结果页时不加，不抢页面加载时的焦点）。
 */

export type QuizScreen =
  { kind: 'intro' } | { kind: 'question'; index: number } | { kind: 'result' }

export type QuizRunnerState = {
  screen: QuizScreen
  /** 每道题选中的选项下标（与题目顺序一一对应），未作答为 null */
  answers: QuizAnswer[]
  /** 未选择就尝试进入下一题时显示提示 */
  showHint: boolean
  /** 第几轮测试（重新测试时加一）：结果页以它为 key，推荐方向变化时留资表单重新挂载 */
  round: number
  /** 访客操作引起的换屏次数（见文件说明） */
  focusKey: number
}

export type QuizRunnerAction =
  | { type: 'start' }
  | { type: 'select'; option: number }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'restart' }

/** 初始状态：开始页，全部未作答 */
export function initialQuizState(total: number): QuizRunnerState {
  return {
    screen: { kind: 'intro' },
    answers: Array.from({ length: total }, () => null),
    showHint: false,
    round: 0,
    focusKey: 0,
  }
}

/** 从会话记录恢复：直接显示结果页（答案须已由调用方校验完整） */
export function restoredQuizState(answers: readonly number[]): QuizRunnerState {
  return {
    screen: { kind: 'result' },
    answers: [...answers],
    showHint: false,
    round: 0,
    focusKey: 0,
  }
}

function answered(state: QuizRunnerState, index: number): boolean {
  return typeof state.answers[index] === 'number'
}

function moveTo(state: QuizRunnerState, screen: QuizScreen): QuizRunnerState {
  return { ...state, screen, showHint: false, focusKey: state.focusKey + 1 }
}

/**
 * 状态转移。optionCounts 是每道题的选项数（越界的选择忽略）。
 * 不合法的操作（如开始页上点“下一题”）原样返回当前状态。
 */
export function quizReducer(
  state: QuizRunnerState,
  action: QuizRunnerAction,
  optionCounts: readonly number[],
): QuizRunnerState {
  const total = optionCounts.length
  const { screen } = state

  switch (action.type) {
    case 'start':
      return screen.kind === 'intro' && total > 0
        ? moveTo(state, { kind: 'question', index: 0 })
        : state

    case 'select': {
      if (screen.kind !== 'question') return state
      const count = optionCounts[screen.index] ?? 0
      if (!Number.isInteger(action.option) || action.option < 0 || action.option >= count) {
        return state
      }
      const answers = [...state.answers]
      answers[screen.index] = action.option
      return { ...state, answers, showHint: false }
    }

    case 'next': {
      if (screen.kind !== 'question') return state
      if (!answered(state, screen.index)) return { ...state, showHint: true }
      return screen.index + 1 >= total
        ? moveTo(state, { kind: 'result' })
        : moveTo(state, { kind: 'question', index: screen.index + 1 })
    }

    case 'previous':
      return screen.kind === 'question' && screen.index > 0
        ? moveTo(state, { kind: 'question', index: screen.index - 1 })
        : state

    case 'restart':
      if (total === 0) return state
      return {
        screen: { kind: 'question', index: 0 },
        answers: Array.from({ length: total }, () => null),
        showHint: false,
        round: state.round + 1,
        focusKey: state.focusKey + 1,
      }
  }
}

/** 进度条比例（0–1）：第 n 题显示 n / 总数；非答题屏为 0 */
export function quizProgress(screen: QuizScreen, total: number): number {
  if (screen.kind !== 'question' || total <= 0) return 0
  return Math.min(1, (screen.index + 1) / total)
}
