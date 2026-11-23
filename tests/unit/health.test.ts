import { afterEach, describe, expect, it, vi } from 'vitest'

import { healthResponse, runHealthCheck } from '@/lib/health'

afterEach(() => {
  vi.useRealTimers()
})

describe('runHealthCheck', () => {
  it('探测成功即为正常', async () => {
    await expect(runHealthCheck(async () => 'ok', 1000)).resolves.toEqual({ ok: true })
  })

  it('探测抛错视为异常，并带回错误供记录日志', async () => {
    const error = new Error('connection refused')
    await expect(
      runHealthCheck(async () => {
        throw error
      }, 1000),
    ).resolves.toEqual({ ok: false, error })
  })

  it('探测超时视为异常，不等待探测结束', async () => {
    vi.useFakeTimers()
    const pending = runHealthCheck(() => new Promise(() => {}), 3000)
    await vi.advanceTimersByTimeAsync(3000)
    const result = await pending
    expect(result.ok).toBe(false)
    expect(result.ok ? null : String(result.error)).toContain('3000ms')
  })

  it('成功后清除超时计时器，不残留定时任务', async () => {
    vi.useFakeTimers()
    await runHealthCheck(async () => undefined, 3000)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('healthResponse', () => {
  it('正常：200 + { status: ok }，不缓存', async () => {
    const response = healthResponse(true)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  it('异常：503 + { status: unavailable }，不暴露错误详情', async () => {
    const response = healthResponse(false)
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ status: 'unavailable' })
  })
})
