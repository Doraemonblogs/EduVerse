import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearSavedQuizAnswers,
  parseQuizAnswers,
  QUIZ_ANSWERS_STORAGE_KEY,
  readSavedQuizAnswers,
  saveQuizAnswers,
  serializeQuizAnswers,
} from '@/components/quiz/quiz-session'

const QUESTIONS = [
  { id: 41, options: ['a', 'b', 'c', 'd'] },
  { id: 42, options: ['a', 'b', 'c'] },
  { id: 43, options: ['a', 'b'] },
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('职业测试会话记录：序列化与解析', () => {
  it('按题目 ID 记录选项下标，解析后按当前题目顺序还原', () => {
    const raw = serializeQuizAnswers(QUESTIONS, [3, 0, 1])
    expect(JSON.parse(raw!)).toEqual({
      version: 1,
      answers: [
        { question: 41, option: 3 },
        { question: 42, option: 0 },
        { question: 43, option: 1 },
      ],
    })
    expect(parseQuizAnswers(raw, QUESTIONS)).toEqual([3, 0, 1])
    // 后台调整了题目顺序：仍按题目 ID 对应
    expect(parseQuizAnswers(raw, [QUESTIONS[2]!, QUESTIONS[0]!, QUESTIONS[1]!])).toEqual([1, 3, 0])
  })

  it('有未作答或越界的答案时不记录', () => {
    expect(serializeQuizAnswers(QUESTIONS, [3, null, 1])).toBeNull()
    expect(serializeQuizAnswers(QUESTIONS, [3, 0])).toBeNull()
    expect(serializeQuizAnswers(QUESTIONS, [4, 0, 1])).toBeNull()
    expect(serializeQuizAnswers(QUESTIONS, [1.5, 0, 1])).toBeNull()
    expect(serializeQuizAnswers([], [])).toBeNull()
  })

  it('记录与当前题目对不上（新增题目、选项减少）时失效', () => {
    const raw = serializeQuizAnswers(QUESTIONS, [3, 0, 1])
    expect(parseQuizAnswers(raw, [...QUESTIONS, { id: 44, options: ['a'] }])).toBeNull()
    expect(parseQuizAnswers(raw, [{ id: 41, options: ['a', 'b'] }])).toBeNull()
    expect(parseQuizAnswers(raw, [])).toBeNull()
  })

  it('格式不对的记录（被改写、旧版本、非 JSON）一律视为没有记录', () => {
    for (const raw of [
      null,
      '',
      'not json',
      '[]',
      JSON.stringify({ version: 2, answers: [] }),
      JSON.stringify({ version: 1, answers: [{ question: 41, option: -1 }] }),
      JSON.stringify({ version: 1, answers: [{ question: '41', option: 0 }] }),
    ]) {
      expect(parseQuizAnswers(raw, QUESTIONS)).toBeNull()
    }
  })
})

describe('职业测试会话记录：sessionStorage 读写', () => {
  it('读写与清除使用约定的键', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    })
    expect(readSavedQuizAnswers()).toBeNull()
    saveQuizAnswers('{"version":1}')
    expect(store.get(QUIZ_ANSWERS_STORAGE_KEY)).toBe('{"version":1}')
    expect(readSavedQuizAnswers()).toBe('{"version":1}')
    clearSavedQuizAnswers()
    expect(store.has(QUIZ_ANSWERS_STORAGE_KEY)).toBe(false)
  })

  it('存储不可用（隐私模式、被禁用、服务端）时不抛错', () => {
    const fail = () => {
      throw new Error('SecurityError')
    }
    vi.stubGlobal('window', {
      sessionStorage: { getItem: fail, setItem: fail, removeItem: fail },
    })
    expect(readSavedQuizAnswers()).toBeNull()
    expect(() => saveQuizAnswers('x')).not.toThrow()
    expect(() => clearSavedQuizAnswers()).not.toThrow()

    vi.stubGlobal('window', undefined)
    expect(readSavedQuizAnswers()).toBeNull()
    expect(() => saveQuizAnswers('x')).not.toThrow()
  })
})
