import { describe, expect, it, vi } from 'vitest'

import { loadIfKnown } from '@/lib/data/known-key'
import { isValidSlug } from '@/lib/search-params'
import { MAX_SLUG_LENGTH, SLUG_PATTERN } from '@/lib/slug-rules'
import { validateSlug } from '@/lib/slugify'

describe('loadIfKnown：按参数缓存的详情查询守卫', () => {
  it('键在已发布清单中时查询详情并原样返回结果', async () => {
    const load = vi.fn(async (slug: string) => ({ slug }))
    await expect(loadIfKnown('ui-ux', async () => ['ui-ux', '3d'], load)).resolves.toEqual({
      slug: 'ui-ux',
    })
    expect(load).toHaveBeenCalledWith('ui-ux')
  })

  it('键不在清单中时返回 null，不调用详情查询（不会写入按参数的缓存）', async () => {
    const load = vi.fn(async (slug: string) => ({ slug }))
    await expect(loadIfKnown('random-123', async () => ['ui-ux'], load)).resolves.toBeNull()
    expect(load).not.toHaveBeenCalled()
  })

  it('数字 ID 同样适用；清单为空时一律返回 null', async () => {
    const load = vi.fn(async (id: number) => ({ id }))
    await expect(loadIfKnown(12, async () => [11, 12], load)).resolves.toEqual({ id: 12 })
    await expect(loadIfKnown(12, async () => [], load)).resolves.toBeNull()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('详情查询返回 null（清单与详情之间内容刚下线）时照常返回 null', async () => {
    await expect(
      loadIfKnown(
        'a',
        async () => ['a'],
        async () => null,
      ),
    ).resolves.toBeNull()
  })
})

describe('slug 长度上限：路由参数校验与后台校验一致', () => {
  it('80 个字符以内合法，81 个字符起判定不合法', () => {
    expect(MAX_SLUG_LENGTH).toBe(80)
    const max = 'a'.repeat(MAX_SLUG_LENGTH)
    const tooLong = 'a'.repeat(MAX_SLUG_LENGTH + 1)
    expect(isValidSlug(max)).toBe(true)
    expect(isValidSlug(tooLong)).toBe(false)
    expect(validateSlug(max)).toBe(true)
    expect(validateSlug(tooLong)).not.toBe(true)
  })

  it('格式规则与后台一致：小写字母、数字、单个连字符分隔', () => {
    for (const slug of ['ui-ux', '3d-animation', 'a1']) {
      expect(isValidSlug(slug), slug).toBe(true)
      expect(SLUG_PATTERN.test(slug), slug).toBe(true)
    }
    for (const slug of ['Bad', 'a--b', '-a', 'a-', 'a_b', 'favicon.ico', '']) {
      expect(isValidSlug(slug), slug).toBe(false)
    }
  })
})
