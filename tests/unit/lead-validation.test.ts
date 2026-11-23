import { describe, expect, it } from 'vitest'

import {
  leadSubmissionSchema,
  normalizePhone,
  toFieldErrors,
  truncateText,
} from '@/lib/validation/lead'

const base = { name: '张同学', phone: '13800138000', consent: 'on' }

describe('留资表单校验', () => {
  it('合法数据通过，空的可选字段被去掉', () => {
    const r = leadSubmissionSchema.parse({ ...base, city: '', message: '  ', discipline: '' })
    expect(r).toMatchObject({
      name: '张同学',
      phone: '13800138000',
      intent: 'trial',
      position: 'unknown',
    })
    expect(r.city).toBeUndefined()
    expect(r.message).toBeUndefined()
    expect(r.discipline).toBeUndefined()
  })

  it('姓名、手机号首尾空格会被去掉', () => {
    const r = leadSubmissionSchema.parse({ ...base, name: '  李女士 ', phone: ' 13912345678 ' })
    expect(r.name).toBe('李女士')
    expect(r.phone).toBe('13912345678')
  })

  it.each(['12345678901', '1380013800', '138001380000', '23800138000', '1380013800a', ''])(
    '拒绝不合法的手机号：%s',
    (phone) => {
      const r = leadSubmissionSchema.safeParse({ ...base, phone })
      expect(r.success).toBe(false)
      if (!r.success) expect(toFieldErrors(r.error).phone).toBeTruthy()
    },
  )

  it.each(['13000000000', '19912345678', '16612345678'])('接受各号段手机号：%s', (phone) => {
    expect(leadSubmissionSchema.safeParse({ ...base, phone }).success).toBe(true)
  })

  it('必须勾选隐私政策', () => {
    const r = leadSubmissionSchema.safeParse({ name: '张同学', phone: '13800138000' })
    expect(r.success).toBe(false)
    if (!r.success) expect(toFieldErrors(r.error).consent).toContain('隐私政策')
  })

  it('姓名为空或超过 30 字时给出中文提示', () => {
    const empty = leadSubmissionSchema.safeParse({ ...base, name: '   ' })
    const long = leadSubmissionSchema.safeParse({ ...base, name: '张'.repeat(31) })
    expect(!empty.success && toFieldErrors(empty.error).name).toBe('请填写姓名')
    expect(!long.success && toFieldErrors(long.error).name).toMatch(/30/)
  })

  it('非法的意向类型与按钮位置回退为默认值，不影响提交', () => {
    const r = leadSubmissionSchema.parse({ ...base, intent: 'hack', position: '<script>' })
    expect(r.intent).toBe('trial')
    expect(r.position).toBe('unknown')
  })

  it('关联 ID 取正整数，非法值视为未选择而不阻止提交', () => {
    expect(leadSubmissionSchema.parse({ ...base, discipline: '12', course: '3' })).toMatchObject({
      discipline: 12,
      course: 3,
    })
    const r = leadSubmissionSchema.safeParse({
      ...base,
      discipline: '-1',
      course: 'abc',
      tutorial: '1.5',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.discipline).toBeUndefined()
      expect(r.data.course).toBeUndefined()
      expect(r.data.tutorial).toBeUndefined()
    }
  })

  it('访客填写的留言超长时给出字段错误', () => {
    const r = leadSubmissionSchema.safeParse({ ...base, message: '字'.repeat(501) })
    expect(r.success).toBe(false)
    if (!r.success) expect(toFieldErrors(r.error).message).toBeTruthy()
  })

  it('自动采集的来源字段超长时截断，不拒绝提交', () => {
    const longUrl = `https://www.example.com/?clickid=${'x'.repeat(800)}`
    const r = leadSubmissionSchema.parse({
      ...base,
      pageUrl: longUrl,
      landingUrl: longUrl,
      referrer: longUrl,
      utmSource: 'u'.repeat(150),
      utmMedium: 'm'.repeat(150),
      utmCampaign: '春季'.repeat(80),
      utmTerm: 't'.repeat(150),
      utmContent: 'c'.repeat(150),
      quizResult: JSON.stringify({ answers: 'a'.repeat(5000) }),
      position: `home_hero_${'x'.repeat(60)}`,
    })
    expect(r.pageUrl).toHaveLength(500)
    expect(r.landingUrl).toHaveLength(500)
    expect(r.referrer).toHaveLength(500)
    expect(r.pageUrl?.startsWith('https://www.example.com/?clickid=')).toBe(true)
    for (const key of ['utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent'] as const) {
      expect(r[key]).toHaveLength(100)
    }
    expect(r.quizResult).toHaveLength(4000)
    expect(r.position).toHaveLength(40)
    expect(r.position.startsWith('home_hero_')).toBe(true)
  })

  it('自动采集字段缺失、为空或不是字符串时按未填写处理', () => {
    const r = leadSubmissionSchema.parse({ ...base, pageUrl: '   ', referrer: 42, utmSource: null })
    expect(r.pageUrl).toBeUndefined()
    expect(r.referrer).toBeUndefined()
    expect(r.utmSource).toBeUndefined()
    expect(r.landingUrl).toBeUndefined()
  })

  it('截断时不会把 emoji 等代理对拆成半个字符', () => {
    expect(truncateText('ab😀', 3)).toBe('ab')
    expect(truncateText('ab😀', 4)).toBe('ab😀')
    expect(truncateText('abc', 10)).toBe('abc')
  })

  it('蜜罐与填写用时字段被保留供服务端判断', () => {
    const r = leadSubmissionSchema.parse({ ...base, website: 'spam', fillMs: '8123' })
    expect(r.website).toBe('spam')
    expect(r.fillMs).toBe(8123)
  })

  it.each([
    ['缺失', undefined, 0],
    ['空字符串', '', 0],
    ['非数字', 'abc', 0],
    ['负数', '-500', 0],
    ['无穷大', 'Infinity', 0],
    ['小数取整', '2500.8', 2500],
    ['数字类型', 3000, 3000],
    ['超出安全整数范围的字符串', '1e20', 0],
    ['超出安全整数范围的数字', 1e300, 0],
    ['布尔值', true, 0],
  ])('填写用时为%s（%s）时记为 %s', (_label, fillMs, expected) => {
    const input = fillMs === undefined ? base : { ...base, fillMs }
    expect(leadSubmissionSchema.parse(input).fillMs).toBe(expected)
  })
  it('不再接受旧的 startedAt 时间戳字段', () => {
    const r = leadSubmissionSchema.parse({ ...base, startedAt: '1700000000000' })
    expect('startedAt' in r).toBe(false)
    expect(r.fillMs).toBe(0)
  })
})

describe('手机号规范化', () => {
  it.each([
    ['138 0013 8000', '13800138000'],
    ['138-0013-8000', '13800138000'],
    ['+86 13800138000', '13800138000'],
    ['+86-138-0013-8000', '13800138000'],
    ['8613800138000', '13800138000'],
    ['86 138 0013 8000', '13800138000'],
    ['\u3000138\u30000013\u30008000 ', '13800138000'],
  ])('%s 规范化为 %s 并通过校验', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
    const r = leadSubmissionSchema.safeParse({ ...base, phone: input })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.phone).toBe(expected)
  })

  it('只在其后恰好是 11 位数字时去掉 86 前缀', () => {
    expect(normalizePhone('86123')).toBe('86123')
    expect(normalizePhone('+861380013800')).toBe('+861380013800')
  })

  it.each(['+86 1380013800', '+1 13800138000', '138 0013 800a', '0086 23800138000'])(
    '规范化后仍不合法的手机号被拒绝：%s',
    (phone) => {
      const r = leadSubmissionSchema.safeParse({ ...base, phone })
      expect(r.success).toBe(false)
      if (!r.success) expect(toFieldErrors(r.error).phone).toBeTruthy()
    },
  )
})
