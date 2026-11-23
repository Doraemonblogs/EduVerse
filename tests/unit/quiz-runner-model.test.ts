import { describe, expect, it } from 'vitest'

import {
  initialQuizState,
  quizProgress,
  quizReducer,
  restoredQuizState,
  type QuizRunnerAction,
  type QuizRunnerState,
} from '@/components/quiz/quiz-runner-model'

/** 三道题，选项数分别为 4、3、2 */
const COUNTS = [4, 3, 2]

function run(actions: QuizRunnerAction[], state = initialQuizState(COUNTS.length)) {
  return actions.reduce<QuizRunnerState>((s, a) => quizReducer(s, a, COUNTS), state)
}

describe('职业测试答题流程（quizReducer）', () => {
  it('初始为开始页，全部未作答，focusKey 为 0', () => {
    expect(initialQuizState(3)).toEqual({
      screen: { kind: 'intro' },
      answers: [null, null, null],
      showHint: false,
      round: 0,
      focusKey: 0,
    })
  })

  it('开始后进入第 1 题，并记一次换屏（focusKey + 1）', () => {
    const state = run([{ type: 'start' }])
    expect(state.screen).toEqual({ kind: 'question', index: 0 })
    expect(state.focusKey).toBe(1)
  })

  it('没有题目时不能开始', () => {
    const empty = initialQuizState(0)
    expect(quizReducer(empty, { type: 'start' }, [])).toBe(empty)
  })

  it('未选择时“下一题”只显示提示，停留在本题、不记换屏；选择后提示消失', () => {
    const blocked = run([{ type: 'start' }, { type: 'next' }])
    expect(blocked.screen).toEqual({ kind: 'question', index: 0 })
    expect(blocked.showHint).toBe(true)
    expect(blocked.focusKey).toBe(1)

    const chosen = quizReducer(blocked, { type: 'select', option: 2 }, COUNTS)
    expect(chosen.showHint).toBe(false)
    expect(chosen.answers).toEqual([2, null, null])
  })

  it('越界、非整数的选项忽略', () => {
    const started = run([{ type: 'start' }])
    for (const option of [-1, 4, 1.5, Number.NaN]) {
      expect(quizReducer(started, { type: 'select', option }, COUNTS)).toBe(started)
    }
  })

  it('不在答题屏时选择、上一题、下一题都不改变状态', () => {
    const intro = initialQuizState(3)
    for (const action of [
      { type: 'select', option: 0 },
      { type: 'next' },
      { type: 'previous' },
    ] satisfies QuizRunnerAction[]) {
      expect(quizReducer(intro, action, COUNTS)).toBe(intro)
    }
  })

  it('逐题作答到最后一题后进入结果页；上一题保留已选答案', () => {
    const second = run([{ type: 'start' }, { type: 'select', option: 1 }, { type: 'next' }])
    expect(second.screen).toEqual({ kind: 'question', index: 1 })

    const back = quizReducer(second, { type: 'previous' }, COUNTS)
    expect(back.screen).toEqual({ kind: 'question', index: 0 })
    expect(back.answers[0]).toBe(1)

    const done = run(
      [
        { type: 'next' },
        { type: 'select', option: 2 },
        { type: 'next' },
        { type: 'select', option: 0 },
        { type: 'next' },
      ],
      back,
    )
    expect(done.screen).toEqual({ kind: 'result' })
    expect(done.answers).toEqual([1, 2, 0])
    // 开始、下一题、上一题、下一题 ×3：每次换屏都计数
    expect(done.focusKey).toBe(6)
  })

  it('第 1 题上“上一题”无效（不回到开始页）', () => {
    const first = run([{ type: 'start' }])
    expect(quizReducer(first, { type: 'previous' }, COUNTS)).toBe(first)
  })

  it('重新测试：清空答案、回到第 1 题，轮次加一', () => {
    const done = run([
      { type: 'start' },
      { type: 'select', option: 0 },
      { type: 'next' },
      { type: 'select', option: 0 },
      { type: 'next' },
      { type: 'select', option: 1 },
      { type: 'next' },
    ])
    const again = quizReducer(done, { type: 'restart' }, COUNTS)
    expect(again.screen).toEqual({ kind: 'question', index: 0 })
    expect(again.answers).toEqual([null, null, null])
    expect(again.round).toBe(1)
    expect(again.focusKey).toBe(done.focusKey + 1)
  })

  it('从会话记录恢复：直接是结果页，不记换屏（不抢页面加载时的焦点）', () => {
    expect(restoredQuizState([1, 2, 0])).toEqual({
      screen: { kind: 'result' },
      answers: [1, 2, 0],
      showHint: false,
      round: 0,
      focusKey: 0,
    })
    // 恢复的结果页上重新测试：回到第 1 题
    const again = quizReducer(initialQuizState(3), { type: 'restart' }, COUNTS)
    expect(again.screen).toEqual({ kind: 'question', index: 0 })
    expect(again.focusKey).toBe(1)
  })
})

describe('进度（quizProgress）', () => {
  it('第 n 题为 n / 总数；开始页与结果页为 0', () => {
    expect(quizProgress({ kind: 'question', index: 0 }, 10)).toBeCloseTo(0.1)
    expect(quizProgress({ kind: 'question', index: 9 }, 10)).toBe(1)
    expect(quizProgress({ kind: 'intro' }, 10)).toBe(0)
    expect(quizProgress({ kind: 'result' }, 10)).toBe(0)
    expect(quizProgress({ kind: 'question', index: 0 }, 0)).toBe(0)
  })
})
