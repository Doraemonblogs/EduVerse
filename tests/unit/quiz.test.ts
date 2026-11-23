import { afterEach, describe, expect, it, vi } from 'vitest'

import { QUIZ_SETTINGS_DEFAULTS } from '@/globals/quiz-settings-defaults'
import { isQuizAvailable, toQuizQuestion, toQuizSettings } from '@/lib/quiz/mappers'
import {
  buildQuizResult,
  parseQuizResult,
  QUIZ_RESULT_LIMITS,
  QUIZ_RESULT_VERSION,
  type QuizResultRecord,
  serializeQuizResult,
} from '@/lib/quiz/result'
import { isQuizComplete, pickRecommendation, scoreQuiz } from '@/lib/quiz/score'
import {
  QUIZ_REPORT_STORAGE_KEY,
  readQuizReportUnlocked,
  rememberQuizReportUnlocked,
} from '@/lib/quiz/storage'
import type { QuizQuestionData } from '@/lib/quiz/types'
import { SOURCE_FIELD_MAX } from '@/lib/validation/lead'
import type { QuizQuestion } from '@/payload-types'

/** 专业方向 ID（按后台排序：10 → 20 → 30） */
const A = 10
const B = 20
const C = 30
const ORDER = [A, B, C]

const option = (label: string, scores: [number, number][]) => ({
  label,
  scores: scores.map(([disciplineId, weight]) => ({ disciplineId, weight })),
})

const QUESTIONS: QuizQuestionData[] = [
  {
    id: 101,
    question: '第一题',
    options: [
      option('偏 A', [[A, 3]]),
      option('偏 B', [[B, 3]]),
      option('A 与 C', [
        [A, 1],
        [C, 2],
      ]),
    ],
  },
  {
    id: 102,
    question: '第二题',
    options: [option('偏 B', [[B, 2]]), option('偏 C', [[C, 3]]), option('不加分', [])],
  },
]

describe('scoreQuiz：职业测试计分', () => {
  it('按专业方向累计选中选项的分值，从高到低排序', () => {
    const scores = scoreQuiz(QUESTIONS, [2, 1], ORDER)
    expect(scores.map((s) => [s.disciplineId, s.score])).toEqual([
      [C, 5],
      [A, 1],
      [B, 0],
    ])
  })

  it('同分时按专业方向的后台排序（disciplineIds 中的先后），与选项、题目顺序无关', () => {
    // A 3 分、B 3 分（同分）：A 排序靠前
    expect(scoreQuiz(QUESTIONS, [0, null], ORDER)[0].disciplineId).toBe(A)
    expect(scoreQuiz(QUESTIONS, [1, null], ORDER)[0].disciplineId).toBe(B)
    const tie = scoreQuiz(
      [
        {
          options: [
            option('B 先列出', [
              [B, 2],
              [A, 2],
            ]),
          ],
        },
      ],
      [0],
      ORDER,
    )
    expect(tie.map((s) => s.disciplineId)).toEqual([A, B, C])
    // 后台排序变了（B 在前），同分结果随之变化
    expect(scoreQuiz(QUESTIONS, [0, 2], [B, A, C])[0].disciplineId).toBe(A)
    expect(
      scoreQuiz(
        [
          {
            options: [
              option('同分', [
                [A, 1],
                [B, 1],
              ]),
            ],
          },
        ],
        [0],
        [B, A, C],
      )[0].disciplineId,
    ).toBe(B)
  })

  it('百分比是占全部得分的比例（四舍五入，同分同百分比）；ratio 是相对最高分的比例', () => {
    const scores = scoreQuiz(QUESTIONS, [2, 1], ORDER)
    // C 5/6、A 1/6、B 0
    expect(scores.map((s) => s.percent)).toEqual([83, 17, 0])
    expect(scores.map((s) => s.ratio)).toEqual([1, 0.2, 0])

    const even = scoreQuiz(
      [
        {
          options: [
            option('三方同分', [
              [A, 1],
              [B, 1],
              [C, 1],
            ]),
          ],
        },
      ],
      [0],
      ORDER,
    )
    expect(even.map((s) => s.percent)).toEqual([33, 33, 33])
    expect(even.every((s) => s.ratio === 1)).toBe(true)
  })

  it('只计 disciplineIds 中的方向（未发布方向的分值不计）；未作答、下标越界、非整数、非法分值都忽略', () => {
    const questions = [
      {
        options: [
          option('含未发布方向', [
            [99, 5],
            [A, 1],
          ]),
          option('非法分值', [
            [B, -3],
            [C, Number.NaN],
          ]),
        ],
      },
      { options: [option('B', [[B, 1]])] },
      { options: [option('C', [[C, 1]])] },
      { options: [option('A', [[A, 1]])] },
    ]
    const scores = scoreQuiz(questions, [0, 5, 0.5, undefined], ORDER)
    expect(scores.map((s) => s.disciplineId)).toEqual([A, B, C])
    expect(scores.map((s) => s.score)).toEqual([1, 0, 0])
    expect(scores.some((s) => s.disciplineId === 99)).toBe(false)
    expect(scoreQuiz(questions, [1], ORDER).map((s) => s.score)).toEqual([0, 0, 0])
  })

  it('一分都没有时：百分比与 ratio 都是 0，按后台排序；没有推荐方向', () => {
    const scores = scoreQuiz(QUESTIONS, [null, 2], ORDER)
    expect(scores.map((s) => [s.disciplineId, s.percent, s.ratio])).toEqual([
      [A, 0, 0],
      [B, 0, 0],
      [C, 0, 0],
    ])
    expect(pickRecommendation(scores)).toBeNull()
    expect(pickRecommendation([])).toBeNull()
  })

  it('推荐方向是得分最高的方向', () => {
    expect(pickRecommendation(scoreQuiz(QUESTIONS, [2, 1], ORDER))?.disciplineId).toBe(C)
  })

  it('没有已发布方向时返回空数组', () => {
    expect(scoreQuiz(QUESTIONS, [0, 0], [])).toEqual([])
  })
})

describe('isQuizComplete', () => {
  it('每道题都选了范围内的选项才算完成', () => {
    expect(isQuizComplete(QUESTIONS, [0, 2])).toBe(true)
    expect(isQuizComplete(QUESTIONS, [0, null])).toBe(false)
    expect(isQuizComplete(QUESTIONS, [0])).toBe(false)
    expect(isQuizComplete(QUESTIONS, [0, 3])).toBe(false)
    expect(isQuizComplete(QUESTIONS, [0, 1, 1])).toBe(false)
    expect(isQuizComplete(QUESTIONS, [-1, 0])).toBe(false)
    expect(isQuizComplete([], [])).toBe(false)
  })
})

describe('测试结果序列化（线索 quizResult）', () => {
  const disciplines = [
    { id: A, name: '三维动画' },
    { id: B, name: '游戏美术' },
    { id: C, name: 'UI/UX 设计' },
  ]

  function record(answers: (number | null)[] = [2, 1]) {
    const scores = scoreQuiz(QUESTIONS, answers, ORDER)
    return buildQuizResult({
      questions: QUESTIONS,
      answers,
      scores,
      recommendedId: pickRecommendation(scores)?.disciplineId ?? null,
      disciplines,
    })
  }

  it('记录推荐方向、各方向得分与答案（题目 ID + 选项下标），序列化后可解析回同样的内容', () => {
    const value = record()
    expect(value).toEqual({
      version: QUIZ_RESULT_VERSION,
      recommended: { id: C, name: 'UI/UX 设计' },
      scores: [
        { id: C, name: 'UI/UX 设计', score: 5, percent: 83 },
        { id: A, name: '三维动画', score: 1, percent: 17 },
        { id: B, name: '游戏美术', score: 0, percent: 0 },
      ],
      answers: [
        { question: 101, option: 2 },
        { question: 102, option: 1 },
      ],
    })
    const json = serializeQuizResult(value)
    expect(json.length).toBeLessThanOrEqual(SOURCE_FIELD_MAX.quizResult)
    expect(JSON.parse(json)).toEqual(value)
    expect(parseQuizResult(json)).toEqual(value)
    // 线索里存的是已解析的 JSON 值
    expect(parseQuizResult(JSON.parse(json))).toEqual(value)
  })

  it('没有推荐方向时 recommended 为 null；未作答的题目不写入答案', () => {
    const value = record([null, 2])
    expect(value.recommended).toBeNull()
    expect(value.answers).toEqual([{ question: 102, option: 2 }])
    expect(parseQuizResult(serializeQuizResult(value))).toEqual(value)
  })

  it('超过长度上限时逐步精简，结果始终是可解析的 JSON 且不超长', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      name: `一个名称很长很长很长很长很长的专业方向 ${i + 1}`,
    }))
    const questions = Array.from({ length: 120 }, (_, i) => ({ id: 1000 + i }))
    const scores = many.map((d, i) => ({
      disciplineId: d.id,
      score: i < 30 ? 60 - i : 0,
      percent: i < 30 ? 3 : 0,
      ratio: 0.5,
    }))
    const value = buildQuizResult({
      questions,
      answers: questions.map(() => 1),
      scores,
      recommendedId: 1,
      disciplines: many,
    })

    const full = JSON.stringify(value)
    expect(full.length).toBeGreaterThan(SOURCE_FIELD_MAX.quizResult)
    const json = serializeQuizResult(value)
    expect(json.length).toBeLessThanOrEqual(SOURCE_FIELD_MAX.quizResult)
    const parsed = parseQuizResult(json)
    expect(parsed?.recommended).toEqual({ id: 1, name: many[0].name })
    // 推荐方向（第一名）始终保留
    expect(parsed?.scores?.[0]?.id).toBe(1)

    // 上限很小时退到只有版本号与推荐方向 ID
    const tiny = serializeQuizResult(value, 40)
    expect(tiny.length).toBeLessThanOrEqual(40)
    expect(parseQuizResult(tiny)).toEqual({ version: QUIZ_RESULT_VERSION, recommended: { id: 1 } })
    expect(serializeQuizResult(value, 5)).toBe('')
  })

  it('格式不对的内容解析为 null', () => {
    for (const value of [
      '',
      '{',
      'null',
      '[]',
      JSON.stringify({ version: 2, recommended: null }),
      JSON.stringify({ version: 1 }),
      JSON.stringify({ version: 1, recommended: { id: -1 } }),
      JSON.stringify({
        version: 1,
        recommended: null,
        scores: [{ id: 1, score: 1, percent: 120 }],
      }),
      42,
      null,
    ]) {
      expect(parseQuizResult(value), String(value)).toBeNull()
    }
  })

  it('结构有上限：方向名称过长、方向得分或答案条数过多时解析为 null；未知的键被去掉', () => {
    const base = { version: QUIZ_RESULT_VERSION, recommended: { id: 1, name: '方向' } }
    const score = (id: number) => ({ id, score: 1, percent: 1 })
    const answer = (question: number) => ({ question, option: 0 })
    const longName = '名'.repeat(QUIZ_RESULT_LIMITS.name + 1)
    for (const value of [
      { ...base, recommended: { id: 1, name: longName } },
      { ...base, scores: [{ ...score(1), name: longName }] },
      {
        ...base,
        scores: Array.from({ length: QUIZ_RESULT_LIMITS.scores + 1 }, (_, i) => score(i + 1)),
      },
      {
        ...base,
        answers: Array.from({ length: QUIZ_RESULT_LIMITS.answers + 1 }, (_, i) => answer(i + 1)),
      },
    ]) {
      expect(parseQuizResult(JSON.stringify(value))).toBeNull()
    }
    // 上限以内照常接受
    const atLimit = {
      ...base,
      scores: Array.from({ length: QUIZ_RESULT_LIMITS.scores }, (_, i) => score(i + 1)),
      answers: Array.from({ length: QUIZ_RESULT_LIMITS.answers }, (_, i) => answer(i + 1)),
    }
    expect(parseQuizResult(atLimit)).toEqual(atLimit)
    expect(
      parseQuizResult({
        ...base,
        note: '请联系 138xxxx',
        recommended: { id: 1, name: '方向', extra: 1 },
        scores: [{ ...score(1), html: '<b>' }],
      }),
    ).toEqual({ ...base, scores: [score(1)] })
  })

  it('组装与序列化的结果总能通过服务端的结构校验：方向过多只留前几名，名称过长截断', () => {
    // 方向数超过上限：只保留得分排序的前 QUIZ_RESULT_LIMITS.scores 名
    const many = Array.from({ length: QUIZ_RESULT_LIMITS.scores + 5 }, (_, i) => ({
      id: i + 1,
      name: `方向${i + 1}`,
    }))
    const scores = many.map((d) => ({ disciplineId: d.id, score: 1, percent: 2, ratio: 0.5 }))
    const value = buildQuizResult({
      questions: QUESTIONS,
      answers: [0, 0],
      scores,
      recommendedId: 1,
      disciplines: many,
    })
    expect(value.scores?.map((item) => item.id)).toEqual(
      many.slice(0, QUIZ_RESULT_LIMITS.scores).map((d) => d.id),
    )
    expect(parseQuizResult(serializeQuizResult(value))).toEqual(value)

    // 方向名称超长：截断到上限，得分与答案照常保留
    const longName = '名'.repeat(QUIZ_RESULT_LIMITS.name + 20)
    const named = buildQuizResult({
      questions: QUESTIONS,
      answers: [0, 0],
      scores: [{ disciplineId: 1, score: 3, percent: 100, ratio: 1 }],
      recommendedId: 1,
      disciplines: [{ id: 1, name: longName }],
    })
    const shortName = longName.slice(0, QUIZ_RESULT_LIMITS.name)
    expect(parseQuizResult(serializeQuizResult(named))).toEqual({
      version: QUIZ_RESULT_VERSION,
      recommended: { id: 1, name: shortName },
      scores: [{ id: 1, name: shortName, score: 3, percent: 100 }],
      answers: [
        { question: 101, option: 0 },
        { question: 102, option: 0 },
      ],
    })

    // 手工拼出的超限记录：序列化时跳过不符合格式的候选，退到能通过校验的最小形式
    const forged: QuizResultRecord = {
      version: QUIZ_RESULT_VERSION,
      recommended: { id: 1, name: longName },
      scores: [{ id: 1, score: 3, percent: 100 }],
    }
    expect(parseQuizResult(serializeQuizResult(forged))).toEqual({
      version: QUIZ_RESULT_VERSION,
      recommended: { id: 1 },
    })
  })
})

describe('职业测试数据映射', () => {
  const doc = (
    options: QuizQuestion['options'],
    question = ' 题目 ',
  ): Pick<QuizQuestion, 'id' | 'question' | 'options'> => ({ id: 1, question, options })

  it('选项的加分只保留已发布方向（关联已填充或只有 ID 都可以），分值必须是非负有限数', () => {
    const question = toQuizQuestion(
      doc([
        {
          label: ' 选项一 ',
          scores: [
            { discipline: A, weight: 2 },
            { discipline: 99, weight: 5 },
            { discipline: { id: B } as never, weight: 1 },
            { discipline: C, weight: -1 },
          ],
        },
        { label: '选项二', scores: [{ discipline: 99, weight: 3 }] },
      ]),
      new Set([A, B, C]),
    )
    expect(question).toEqual({
      id: 1,
      question: '题目',
      options: [
        {
          label: '选项一',
          scores: [
            { disciplineId: A, weight: 2 },
            { disciplineId: B, weight: 1 },
          ],
        },
        // 所有加分都来自未发布方向的选项照常保留（只是不加分）
        { label: '选项二', scores: [] },
      ],
    })
  })

  it('没有选项（或选项文字为空）、题目为空时返回 null', () => {
    expect(toQuizQuestion(doc([]), new Set([A]))).toBeNull()
    expect(toQuizQuestion(doc([{ label: '  ', scores: [] }]), new Set([A]))).toBeNull()
    expect(toQuizQuestion(doc([{ label: '选项', scores: [] }], '  '), new Set([A]))).toBeNull()
  })

  it('设置从未保存时全部用默认值', () => {
    const settings = toQuizSettings({})
    expect(settings.intro.title).toBe(QUIZ_SETTINGS_DEFAULTS.intro.title)
    expect(settings.intro.description).toBe(QUIZ_SETTINGS_DEFAULTS.intro.description)
    expect(settings.result.reportTitle).toBe(QUIZ_SETTINGS_DEFAULTS.result.reportTitle)
    expect(settings.result.disclaimer).toBe(QUIZ_SETTINGS_DEFAULTS.result.disclaimer)
    expect(settings.result.nextSteps).toEqual(QUIZ_SETTINGS_DEFAULTS.result.nextSteps)
    expect(settings.seo).toBeNull()
  })

  it('必填文字为空时用默认值；可选文字被清空时不显示；下一步建议去掉空标题', () => {
    const settings = toQuizSettings({
      intro: { title: ' ', description: null, startLabel: '马上开始' },
      result: {
        summaryTitle: '推荐',
        gatedTitle: '',
        gatedDescription: '  ',
        unlockLabel: '解锁',
        reportTitle: '',
        disclaimer: null,
        nextStepsTitle: '接下来',
        nextSteps: [
          { title: ' 看作品 ', description: ' ' },
          { title: ' ', description: '没有标题的建议' },
        ],
      },
      seo: { title: 'SEO 标题' },
    })
    expect(settings.intro).toEqual({
      title: QUIZ_SETTINGS_DEFAULTS.intro.title,
      description: null,
      startLabel: '马上开始',
    })
    expect(settings.result.gatedTitle).toBe(QUIZ_SETTINGS_DEFAULTS.result.gatedTitle)
    expect(settings.result.gatedDescription).toBeNull()
    expect(settings.result.reportTitle).toBe(QUIZ_SETTINGS_DEFAULTS.result.reportTitle)
    expect(settings.result.disclaimer).toBeNull()
    expect(settings.result.nextStepsTitle).toBe('接下来')
    expect(settings.result.nextSteps).toEqual([{ title: '看作品', description: null }])
    expect(settings.seo).toEqual({ title: 'SEO 标题' })
  })

  it('至少一道题、一个已发布方向时才能测试', () => {
    expect(isQuizAvailable({ questions: QUESTIONS, disciplines: [] })).toBe(false)
    expect(isQuizAvailable({ questions: [], disciplines: [{} as never] })).toBe(false)
    expect(isQuizAvailable({ questions: QUESTIONS, disciplines: [{} as never] })).toBe(true)
  })
})

describe('完整报告的会话记录', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubSession(throwing = false) {
    const store = new Map<string, string>()
    const fail = () => {
      throw new DOMException('denied', 'SecurityError')
    }
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => (throwing ? fail() : (store.get(key) ?? null)),
        setItem: (key: string, value: string) => (throwing ? fail() : store.set(key, value)),
      },
    })
    return store
  }

  it('留资后记录，本会话内读回为已解锁', () => {
    const store = stubSession()
    expect(readQuizReportUnlocked()).toBe(false)
    rememberQuizReportUnlocked()
    expect(store.get(QUIZ_REPORT_STORAGE_KEY)).toBe('1')
    expect(readQuizReportUnlocked()).toBe(true)
  })

  it('存储被改写成其它值时按未解锁处理', () => {
    const store = stubSession()
    store.set(QUIZ_REPORT_STORAGE_KEY, 'true')
    expect(readQuizReportUnlocked()).toBe(false)
  })

  it('存储不可用（读写抛错）或在服务端调用时不抛出，按未解锁处理', () => {
    stubSession(true)
    expect(() => rememberQuizReportUnlocked()).not.toThrow()
    expect(readQuizReportUnlocked()).toBe(false)
    vi.unstubAllGlobals()
    expect(readQuizReportUnlocked()).toBe(false)
    expect(() => rememberQuizReportUnlocked()).not.toThrow()
  })
})
