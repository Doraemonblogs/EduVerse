// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import { QUIZ_ANSWERS_STORAGE_KEY } from '@/components/quiz/quiz-session'
import { zh } from '@/i18n/zh'
import type { LeadActionState } from '@/lib/lead/actions'
import { toQuizSettings } from '@/lib/quiz/mappers'
import { parseQuizResult } from '@/lib/quiz/result'
import { QUIZ_REPORT_STORAGE_KEY } from '@/lib/quiz/storage'
import type { QuizDiscipline, QuizQuestionData } from '@/lib/quiz/types'

import { courseCard, disciplineRef } from '../helpers/course-fixtures'

/**
 * 职业测试 QuizRunner 的客户端行为（jsdom，Server Action 用 mock 代替）：
 * 答题流程、结果摘要、留资区的隐藏字段、留资成功后展开完整报告与焦点、会话记录恢复、重新测试、无法推荐。
 * 真实浏览器中的键盘、滚动、线索入库与版式由 e2e（tests/e2e/quiz.e2e.spec.ts）覆盖。
 */
const submitLeadAction = vi.hoisted(() =>
  vi.fn<(previous: LeadActionState, formData: FormData) => Promise<LeadActionState>>(),
)
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction }))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const { LeadDialogProvider } = await import('@/components/lead/lead-dialog')
const { QuizRunner } = await import('@/components/quiz/quiz-runner')

const t = zh.quiz
const settings = toQuizSettings({})

const config: LeadFormConfig = {
  disciplines: [
    { id: 7, name: '三维动画与影视动画' },
    { id: 9, name: '游戏美术' },
  ],
  cities: ['北京', '上海'],
  successTitle: '提交成功',
  successMessage: '课程顾问会尽快联系你',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const ANIMATION: QuizDiscipline = {
  ...disciplineRef({ id: 7, name: '三维动画与影视动画', shortName: '三维动画' }),
  tagline: '从建模到表演',
  cover: null,
  courses: [courseCard({ id: 31, title: '三维动画长期班', cover: null })],
}
const GAME: QuizDiscipline = {
  ...disciplineRef({ id: 9, name: '游戏美术', shortName: '游戏美术', slug: 'game-art' }),
  tagline: null,
  cover: null,
  courses: [],
}

const QUESTIONS: QuizQuestionData[] = [
  {
    id: 101,
    question: '你更享受哪种创作过程？',
    options: [
      { label: '一笔一笔画出来', scores: [{ disciplineId: 7, weight: 3 }] },
      { label: '设计游戏关卡', scores: [{ disciplineId: 9, weight: 3 }] },
    ],
  },
  {
    id: 102,
    question: '你平时用哪类软件？',
    options: [
      { label: '三维软件', scores: [{ disciplineId: 7, weight: 2 }] },
      { label: '游戏引擎', scores: [{ disciplineId: 9, weight: 1 }] },
    ],
  },
]

function renderRunner(questions = QUESTIONS, disciplines = [ANIMATION, GAME]) {
  return render(
    <LeadDialogProvider config={config}>
      <QuizRunner
        questions={questions}
        disciplines={disciplines}
        settings={{ intro: settings.intro, result: settings.result }}
        leadConfig={config}
      />
    </LeadDialogProvider>,
  )
}

/** 从开始页按给定选项文字答完全部题目 */
function answerAll(labels: string[]) {
  fireEvent.click(screen.getByRole('button', { name: settings.intro.startLabel }))
  labels.forEach((label, index) => {
    fireEvent.click(screen.getByRole('radio', { name: label }))
    const last = index === labels.length - 1
    fireEvent.click(screen.getByRole('button', { name: last ? t.runner.finish : t.runner.next }))
  })
}

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  submitLeadAction.mockReset()
  vi.stubGlobal('ResizeObserver', NoopResizeObserver)
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('QuizRunner', () => {
  it('开始页：题量、涵盖的方向与开始按钮；开始后每屏一题，焦点在第一个选项', () => {
    renderRunner()
    expect(screen.getByText('2 道单选题')).toBeTruthy()
    const coverage = screen.getByRole('heading', { name: t.runner.coverage }).parentElement!
    expect(
      within(coverage)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['三维动画', '游戏美术'])
    expect(document.querySelector('fieldset')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: settings.intro.startLabel }))
    expect(screen.getByRole('group', { name: QUESTIONS[0]!.question })).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(document.activeElement).toBe(screen.getAllByRole('radio')[0])
    const progress = screen.getByRole('progressbar', { name: t.runner.progressLabel })
    expect(progress.getAttribute('aria-valuetext')).toBe('第 1 / 2 题')
    expect(progress.getAttribute('aria-valuenow')).toBe('50')
  })

  it('未选择时“下一题”为 aria-disabled，触发只显示提示；选择后才能进入下一题', () => {
    renderRunner()
    fireEvent.click(screen.getByRole('button', { name: settings.intro.startLabel }))
    const next = screen.getByRole('button', { name: t.runner.next })
    expect(next.getAttribute('aria-disabled')).toBe('true')
    // 按钮基础样式在 aria-disabled 时屏蔽指针事件；这里必须恢复，点击 / 轻触才能给出提示（jsdom 不算样式，真实浏览器见 e2e）
    expect(next.className).toContain('aria-disabled:pointer-events-auto')
    expect(next.className).not.toContain('aria-disabled:pointer-events-none')
    fireEvent.click(next)
    expect(screen.getByRole('status').textContent).toBe(t.runner.chooseOne)
    expect(screen.getByRole('group', { name: QUESTIONS[0]!.question })).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: '设计游戏关卡' }))
    expect(screen.getByRole('status').textContent).toBe('')
    expect(next.getAttribute('aria-disabled')).toBe('false')
    // 在选项上按回车 = 下一题
    fireEvent.keyDown(screen.getByRole('radio', { name: '设计游戏关卡' }), { key: 'Enter' })
    expect(screen.getByRole('group', { name: QUESTIONS[1]!.question })).toBeTruthy()

    // 上一题保留答案，焦点在已选的选项上
    fireEvent.click(screen.getByRole('button', { name: t.runner.previous }))
    const chosen = screen.getByRole<HTMLInputElement>('radio', { name: '设计游戏关卡' })
    expect(chosen.checked).toBe(true)
    expect(document.activeElement).toBe(chosen)
  })

  it('结果页：摘要显示推荐方向（焦点在摘要标题），留资区带推荐方向与可解析的测试结果，完整报告未展开', () => {
    renderRunner()
    answerAll(['一笔一笔画出来', '三维软件'])

    const heading = screen.getByRole('heading', {
      level: 2,
      name: `${settings.result.summaryTitle} 三维动画与影视动画`,
    })
    expect(document.activeElement).toBe(heading)
    expect(screen.getByText('从建模到表演')).toBeTruthy()
    expect(screen.getByRole('link', { name: '了解三维动画' }).getAttribute('href')).toBe(
      '/majors/3d-animation',
    )
    expect(screen.queryByRole('heading', { name: settings.result.reportTitle })).toBeNull()

    const gate = screen.getByRole('region', { name: settings.result.gatedTitle })
    expect(gate.hasAttribute('data-page-end-cta')).toBe(true)
    const value = (name: string) =>
      gate.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value
    expect(value('intent')).toBe('quiz')
    expect(value('position')).toBe('quiz_result')
    expect(gate.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe('7')
    const record = parseQuizResult(value('quizResult'))
    expect(record).toMatchObject({
      recommended: { id: 7 },
      scores: [
        { id: 7, score: 5, percent: 100 },
        { id: 9, score: 0, percent: 0 },
      ],
      answers: [
        { question: 101, option: 0 },
        { question: 102, option: 0 },
      ],
    })
    // 完成的答案记入会话
    expect(window.sessionStorage.getItem(QUIZ_ANSWERS_STORAGE_KEY)).toContain('"question":101')
  })

  it('留资成功：同一页展开完整报告并把焦点移到报告标题，表单位置保留成功提示；记下本会话已解锁', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: Date.now() })
    renderRunner()
    answerAll(['设计游戏关卡', '游戏引擎'])

    const gate = screen.getByRole('region', { name: settings.result.gatedTitle })
    fireEvent.change(within(gate).getByLabelText(zh.lead.labels.name, { exact: false }), {
      target: { value: '张同学' },
    })
    fireEvent.change(within(gate).getByLabelText(zh.lead.labels.phone, { exact: false }), {
      target: { value: '13800138000' },
    })
    fireEvent.click(within(gate).getByRole('checkbox'))
    await act(async () => {
      fireEvent.click(within(gate).getByRole('button', { name: settings.result.unlockLabel }))
    })

    const report = await screen.findByRole('heading', {
      level: 2,
      name: settings.result.reportTitle,
    })
    expect(document.activeElement).toBe(report)
    expect(screen.getByRole('heading', { name: config.successTitle })).toBeTruthy()
    expect(screen.queryByRole('region', { name: settings.result.gatedTitle })).toBeNull()
    expect(window.sessionStorage.getItem(QUIZ_REPORT_STORAGE_KEY)).toBe('1')

    const submitted = Object.fromEntries(submitLeadAction.mock.lastCall![1].entries())
    expect(submitted).toMatchObject({ intent: 'quiz', position: 'quiz_result', discipline: '9' })

    // 推荐方向没有课程：说明 + 预约试听
    const region = screen.getByRole('region', { name: settings.result.reportTitle })
    expect(within(region).getByText(t.report.noCourses)).toBeTruthy()
    expect(within(region).getByRole('button', { name: t.result.consult })).toBeTruthy()
    // 下一步建议来自后台
    for (const step of settings.result.nextSteps) {
      expect(within(region).getByText(step.title)).toBeTruthy()
    }
  })

  it('本会话已留资后再测一轮：推荐方向没有课程时，“预约试听”弹窗带上本轮的测试结果与推荐方向', () => {
    window.sessionStorage.setItem(QUIZ_REPORT_STORAGE_KEY, '1')
    renderRunner()
    answerAll(['设计游戏关卡', '游戏引擎'])

    // 已留资：不再显示留资区，报告里的“预约试听”是这一轮唯一的留资入口
    expect(screen.queryByRole('region', { name: settings.result.gatedTitle })).toBeNull()
    const region = screen.getByRole('region', { name: settings.result.reportTitle })
    expect(within(region).getByText(t.report.noCourses)).toBeTruthy()
    fireEvent.click(within(region).getByRole('button', { name: t.result.consult }))

    const dialog = screen.getByRole('dialog')
    const value = (name: string) =>
      dialog.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value
    expect(value('intent')).toBe('quiz')
    expect(value('position')).toBe('quiz_result')
    expect(dialog.querySelector<HTMLSelectElement>('select[name="discipline"]')?.value).toBe('9')
    expect(parseQuizResult(value('quizResult'))).toMatchObject({
      recommended: { id: 9 },
      scores: [
        { id: 9, score: 4, percent: 100 },
        { id: 7, score: 0, percent: 0 },
      ],
      answers: [
        { question: 101, option: 1 },
        { question: 102, option: 1 },
      ],
    })
  })

  it('完整报告：各方向得分按高到低列出，读屏每行一句完整的话，推荐方向有文字徽标；推荐课程用课程卡片', () => {
    window.sessionStorage.setItem(QUIZ_REPORT_STORAGE_KEY, '1')
    renderRunner()
    answerAll(['一笔一笔画出来', '游戏引擎'])

    const region = screen.getByRole('region', { name: settings.result.reportTitle })
    const scores = within(region).getByRole('region', { name: t.report.scoresTitle })
    const rows = within(scores).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.querySelector('.sr-only')?.textContent).toBe('三维动画：得分占比 75%，推荐方向')
    expect(rows[0]!.textContent).toContain(t.report.recommended)
    expect(rows[1]!.querySelector('.sr-only')?.textContent).toBe('游戏美术：得分占比 25%')
    expect(rows[1]!.textContent).not.toContain(t.report.recommended)

    const courses = within(region).getByRole('region', { name: t.report.coursesTitle })
    expect(within(courses).getByRole('heading', { level: 4, name: '三维动画长期班' })).toBeTruthy()
    expect(
      within(courses).getByRole('link', { name: '查看三维动画全部课程' }).getAttribute('href'),
    ).toBe('/majors/3d-animation')
    // 本会话已留资：不再显示留资区
    expect(screen.queryByRole('region', { name: settings.result.gatedTitle })).toBeNull()
  })

  it('会话记录：再次进入直接显示上次结果，不抢焦点；重新测试清除记录、回到第 1 题', () => {
    window.sessionStorage.setItem(
      QUIZ_ANSWERS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        answers: [
          { question: 101, option: 1 },
          { question: 102, option: 1 },
        ],
      }),
    )
    renderRunner()
    const heading = screen.getByRole('heading', {
      level: 2,
      name: `${settings.result.summaryTitle} 游戏美术`,
    })
    expect(document.activeElement).not.toBe(heading)
    expect(screen.getByRole('region', { name: settings.result.gatedTitle })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: t.result.restart }))
    expect(window.sessionStorage.getItem(QUIZ_ANSWERS_STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('group', { name: QUESTIONS[0]!.question })).toBeTruthy()
    expect(screen.getAllByRole<HTMLInputElement>('radio').some((r) => r.checked)).toBe(false)
  })

  it('与当前题目对不上的会话记录被忽略，回到开始页', () => {
    window.sessionStorage.setItem(
      QUIZ_ANSWERS_STORAGE_KEY,
      JSON.stringify({ version: 1, answers: [{ question: 101, option: 1 }] }),
    )
    renderRunner()
    expect(screen.getByRole('button', { name: settings.intro.startLabel })).toBeTruthy()
  })

  it('选项都没有计分时无法推荐：说明原因，提供预约试听与重新测试，不显示留资区', () => {
    const unscored = QUESTIONS.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o, scores: [] })),
    }))
    renderRunner(unscored)
    answerAll(['一笔一笔画出来', '三维软件'])
    expect(screen.getByRole('heading', { name: t.result.noRecommendationTitle })).toBeTruthy()
    expect(screen.getByRole('button', { name: t.result.consult })).toBeTruthy()
    expect(screen.getByRole('button', { name: t.result.restart })).toBeTruthy()
    expect(screen.queryByRole('region', { name: settings.result.gatedTitle })).toBeNull()
  })
})
