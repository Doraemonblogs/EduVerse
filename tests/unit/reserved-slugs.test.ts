import type { Field, PayloadRequest, TextFieldSingleValidation } from 'payload'
import { describe, expect, it } from 'vitest'

import { Pages, RESERVED_PAGE_SLUGS } from '@/collections/Pages'
import { createSlugValidation } from '@/fields/slug'
import { isReservedSlug, RESERVED_ROUTE_SEGMENTS, validateReservedSlug } from '@/lib/reserved-slugs'
import { toSlug } from '@/lib/slugify'

type ValidateOptions = Parameters<TextFieldSingleValidation>[1]

/** validations.text 只读取 required、长度限制与 req.payload.config / req.t */
function validateOptions(required = true): ValidateOptions {
  const req = {
    payload: { config: {} },
    t: (key: string) => key,
  } as unknown as PayloadRequest
  return { required, req } as unknown as ValidateOptions
}

function findField(fields: Field[], name: string): Field | undefined {
  for (const field of fields) {
    if ('name' in field && field.name === name) return field
    if ('fields' in field) {
      const found = findField(field.fields, name)
      if (found) return found
    }
    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        const found = findField(tab.fields, name)
        if (found) return found
      }
    }
  }
  return undefined
}

function pageSlugValidate(): TextFieldSingleValidation {
  const field = findField(Pages.fields, 'slug')
  if (!field || field.type !== 'text' || field.hasMany || !field.validate) {
    throw new Error('pages 集合缺少带校验的 slug 文本字段')
  }
  return field.validate
}

describe('isReservedSlug', () => {
  it('前台固定路由与后台 / 接口的一级路径都被占用', () => {
    for (const slug of ['admin', 'api', 'courses', 'majors', 'careers', 'search', 'works']) {
      expect(isReservedSlug(slug), slug).toBe(true)
    }
  })

  it('普通页面 slug 与固定页面 slug 不受影响', () => {
    for (const slug of Object.values(RESERVED_PAGE_SLUGS)) {
      expect(isReservedSlug(slug), slug).toBe(false)
    }
    expect(isReservedSlug('careers-guide')).toBe(false)
    expect(isReservedSlug('course')).toBe(false)
  })

  it('非字符串与空值不算占用', () => {
    expect(isReservedSlug(undefined)).toBe(false)
    expect(isReservedSlug(null)).toBe(false)
    expect(isReservedSlug('')).toBe(false)
    expect(isReservedSlug(['courses'])).toBe(false)
  })

  it('清单里的每一项都符合 slug 规则（否则永远匹配不到）', () => {
    for (const segment of RESERVED_ROUTE_SEGMENTS) {
      expect(toSlug(segment)).toBe(segment)
    }
  })
})

describe('validateReservedSlug', () => {
  it('被占用时返回带路径的中文提示', () => {
    expect(validateReservedSlug('careers')).toBe('该 URL（/careers）已被系统栏目占用，请换一个')
  })

  it('未被占用或为空时通过，交给其它校验处理', () => {
    expect(validateReservedSlug('about')).toBe(true)
    expect(validateReservedSlug('')).toBe(true)
    expect(validateReservedSlug(undefined)).toBe(true)
  })
})

describe('createSlugValidation', () => {
  const options = validateOptions()

  it('必填与格式校验先于额外校验执行', () => {
    const validate = createSlugValidation(() => '不应执行到这里')
    expect(validate('', options)).not.toBe(true)
    expect(validate('Bad Slug', options)).toMatch(/小写/)
  })

  it('格式正确时返回额外校验的结果；未传额外校验时直接通过', () => {
    expect(createSlugValidation(() => '已占用')('ok-slug', options)).toBe('已占用')
    expect(createSlugValidation()('ok-slug', options)).toBe(true)
  })
})

describe('pages 集合的 slug 校验', () => {
  const validate = pageSlugValidate()
  const options = validateOptions()

  it('拒绝被固定路由占用的 slug，提示换一个', async () => {
    for (const slug of ['careers', 'search', 'courses', 'admin']) {
      expect(await validate(slug, options), slug).toMatch(/已被系统栏目占用/)
    }
  })

  it('英文标题自动生成的同名 slug 同样被拦截', async () => {
    expect(await validate(toSlug('Search'), options)).toMatch(/已被系统栏目占用/)
  })

  it('固定页面 slug 与普通 slug 正常通过，格式错误仍按格式提示', async () => {
    expect(await validate(RESERVED_PAGE_SLUGS.about, options)).toBe(true)
    expect(await validate('zhao-pin', options)).toBe(true)
    expect(await validate('Careers', options)).toMatch(/小写/)
  })
})
