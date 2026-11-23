'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { useHydrated } from '@/components/common/use-hydrated'
import { type LeadFormConfig } from '@/components/lead/types'
import { buildQuizResult, serializeQuizResult } from '@/lib/quiz/result'
import { pickRecommendation, scoreQuiz } from '@/lib/quiz/score'
import { readQuizReportUnlocked, rememberQuizReportUnlocked } from '@/lib/quiz/storage'
import { type QuizData, type QuizSettingsData } from '@/lib/quiz/types'

import { QuizGate } from './quiz-gate'
import { QuizIntro } from './quiz-intro'
import { QuizQuestion } from './quiz-question'
import { QuizReport } from './quiz-report'
import {
  initialQuizState,
  quizReducer,
  restoredQuizState,
  type QuizRunnerAction,
  type QuizRunnerState,
} from './quiz-runner-model'
import { type QuizScoreRow } from './quiz-score-chart'
import {
  clearSavedQuizAnswers,
  parseQuizAnswers,
  readSavedQuizAnswers,
  saveQuizAnswers,
  serializeQuizAnswers,
} from './quiz-session'
import { QuizSummary } from './quiz-summary'

const SUMMARY_TITLE_ID = 'quiz-summary-title'
const REPORT_TITLE_ID = 'quiz-report-title'

const subscribeNothing = () => () => {}
const serverNull = () => null
const serverFalse = () => false

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 把答题区滚到吸顶导航下方（顶部已在视口内且整体放得下时不滚动） */
function revealRunner(root: HTMLElement) {
  const rect = root.getBoundingClientRect()
  const offset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
  if (rect.top >= offset && rect.bottom <= window.innerHeight) return
  root.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

export type QuizRunnerProps = {
  questions: QuizData['questions']
  disciplines: QuizData['disciplines']
  /** 后台「职业测试设置」的开始页与结果页文案（SEO 不需要传给客户端） */
  settings: Pick<QuizSettingsData, 'intro' | 'result'>
  leadConfig: LeadFormConfig
}

/**
 * 职业测试（客户端组件）：开始页 → 每屏一题 → 结果页。
 *
 * - 开始页服务端渲染（水合前开始按钮不可用）；答题流程见 quiz-runner-model.ts，计分用 scoreQuiz（同分按专业方向后台排序）；
 * - 结果页：摘要（公开）→ 完整报告（本会话已留资时直接显示）→ 留资区（未留资；本页提交成功后保留成功提示与添加微信引导）。
 *   留资成功后在同一页展开完整报告，焦点移到报告标题；会话标记见 src/lib/quiz/storage.ts；
 * - 完成的答案记入 sessionStorage（quiz-session.ts）：同一标签页再次进入直接显示上次的结果，“重新测试”清除；
 * - 每次换屏把焦点移到新内容（题目的已选 / 第一个选项、结果摘要标题），答题区不在视口内时滚入视口。
 * 完整报告是营销引导而非访问控制：数据本身不敏感，随页面一起下发。
 */
export function QuizRunner({ questions, disciplines, settings, leadConfig }: QuizRunnerProps) {
  const hydrated = useHydrated()
  const rootRef = useRef<HTMLDivElement>(null)
  const optionCounts = useMemo(() => questions.map((q) => q.options.length), [questions])
  const [state, dispatch] = useReducer(
    (current: QuizRunnerState, action: QuizRunnerAction) =>
      quizReducer(current, action, optionCounts),
    questions.length,
    initialQuizState,
  )

  // 本会话上次完成的答案：访客还没有操作过（focusKey 为 0）时直接显示上次的结果页
  const savedRaw = useSyncExternalStore(subscribeNothing, readSavedQuizAnswers, serverNull)
  const restored = useMemo(() => parseQuizAnswers(savedRaw, questions), [savedRaw, questions])
  const view = useMemo(
    () => (state.focusKey === 0 && restored ? restoredQuizState(restored) : state),
    [state, restored],
  )

  // 完整报告：本会话已留资（sessionStorage）或刚在本页提交成功
  const storedUnlocked = useSyncExternalStore(subscribeNothing, readQuizReportUnlocked, serverFalse)
  const [unlockedHere, setUnlockedHere] = useState(false)
  /** 在哪一轮测试的结果页上提交了留资（该轮保留表单的成功提示） */
  const [submittedRound, setSubmittedRound] = useState<number | null>(null)
  const [reportFocusKey, setReportFocusKey] = useState(0)
  const unlocked = storedUnlocked || unlockedHere

  const disciplineIds = useMemo(() => disciplines.map((d) => d.id), [disciplines])
  const onResult = view.screen.kind === 'result'
  const outcome = useMemo(() => {
    if (!onResult) return null
    const scores = scoreQuiz(questions, view.answers, disciplineIds)
    const top = pickRecommendation(scores)
    const recommended = top ? (disciplines.find((d) => d.id === top.disciplineId) ?? null) : null
    const names = new Map(disciplines.map((d) => [d.id, d.shortName]))
    const rows: QuizScoreRow[] = scores.map((item) => ({
      ...item,
      name: names.get(item.disciplineId) ?? '',
    }))
    const quizResult = serializeQuizResult(
      buildQuizResult({
        questions,
        answers: view.answers,
        scores,
        recommendedId: recommended?.id ?? null,
        disciplines,
      }),
    )
    return { recommended, rows, quizResult }
  }, [onResult, questions, view.answers, disciplineIds, disciplines])

  // 完成测试：记下答案，同一标签页再次进入时直接显示结果
  useEffect(() => {
    if (state.screen.kind !== 'result' || state.focusKey === 0) return
    const value = serializeQuizAnswers(questions, state.answers)
    if (value) saveQuizAnswers(value)
  }, [state.screen.kind, state.focusKey, state.answers, questions])

  // 换屏：焦点移到新内容（题目的已选 / 第一个选项、结果摘要标题），答题区滚入视口
  const screenKind = state.screen.kind
  useEffect(() => {
    if (state.focusKey === 0) return
    const root = rootRef.current
    if (!root) return
    const target =
      screenKind === 'question'
        ? (root.querySelector<HTMLElement>('input[type="radio"]:checked') ??
          root.querySelector<HTMLElement>('input[type="radio"]'))
        : document.getElementById(SUMMARY_TITLE_ID)
    target?.focus({ preventScroll: true })
    revealRunner(root)
  }, [state.focusKey, screenKind])

  // 留资成功、完整报告展开：焦点移到报告标题（表单自身的成功提示先取得焦点，这里随后接管）
  useEffect(() => {
    if (reportFocusKey === 0) return
    document.getElementById(REPORT_TITLE_ID)?.focus()
  }, [reportFocusKey])

  const restart = useCallback(() => {
    clearSavedQuizAnswers()
    dispatch({ type: 'restart' })
  }, [])

  const handleLeadSuccess = useCallback(() => {
    rememberQuizReportUnlocked()
    setUnlockedHere(true)
    setSubmittedRound(view.round)
    setReportFocusKey((key) => key + 1)
  }, [view.round])

  const { screen } = view

  return (
    <div ref={rootRef}>
      {screen.kind === 'intro' ? (
        <QuizIntro
          startLabel={settings.intro.startLabel}
          questionCount={questions.length}
          disciplines={disciplines}
          ready={hydrated}
          onStart={() => dispatch({ type: 'start' })}
        />
      ) : null}

      {screen.kind === 'question' && questions[screen.index] ? (
        <div className="mx-auto max-w-3xl">
          <QuizQuestion
            key={questions[screen.index].id}
            question={questions[screen.index]}
            index={screen.index}
            total={questions.length}
            answer={view.answers[screen.index]}
            showHint={view.showHint}
            onSelect={(option) => dispatch({ type: 'select', option })}
            onNext={() => dispatch({ type: 'next' })}
            onPrevious={() => dispatch({ type: 'previous' })}
          />
        </div>
      ) : null}

      {screen.kind === 'result' && outcome ? (
        <div key={view.round} className="flex flex-col gap-12 md:gap-16">
          <QuizSummary
            summaryTitle={settings.result.summaryTitle}
            recommended={outcome.recommended}
            quizResult={outcome.quizResult}
            titleId={SUMMARY_TITLE_ID}
            onRestart={restart}
          />
          {outcome.recommended && unlocked ? (
            <QuizReport
              result={settings.result}
              rows={outcome.rows}
              recommended={outcome.recommended}
              quizResult={outcome.quizResult}
              titleId={REPORT_TITLE_ID}
            />
          ) : null}
          {outcome.recommended && (!unlocked || submittedRound === view.round) ? (
            <QuizGate
              result={settings.result}
              config={leadConfig}
              disciplineId={outcome.recommended.id}
              quizResult={outcome.quizResult}
              submitted={unlocked}
              onSuccess={handleLeadSuccess}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
