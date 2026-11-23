import { describe, expect, it, vi } from 'vitest'

import { BurstLimiter, KeyedMutex } from '@/lib/lead/burst-limiter'
import { getClientIp, warnIfProxyUntrusted } from '@/lib/lead/client-info'
import { maskPhone } from '@/lib/lead/mask'
import { buildLandingInfo, shouldReplaceLanding } from '@/lib/lead/source'
import { canTransition } from '@/lib/lead/status'

describe('进程内突发限流', () => {
  it('窗口内超过上限被拒绝，窗口过后恢复', () => {
    const limiter = new BurstLimiter(3, 60_000)
    const t0 = 1_000_000
    expect([0, 1, 2].map((i) => limiter.take('1.1.1.1', t0 + i))).toEqual([true, true, true])
    expect(limiter.take('1.1.1.1', t0 + 10)).toBe(false)
    expect(limiter.take('2.2.2.2', t0 + 10)).toBe(true)
    expect(limiter.take('1.1.1.1', t0 + 60_001)).toBe(true)
  })

  it('键过多时清理过期记录', () => {
    const limiter = new BurstLimiter(1, 1000, 2)
    limiter.take('a', 0)
    limiter.take('b', 0)
    limiter.take('c', 5000)
    expect(limiter.take('a', 5001)).toBe(true)
  })

  it('release 撤销最近一次放行：名额退回，没有剩余记录时删除该键', () => {
    const limiter = new BurstLimiter(2, 60_000)
    expect(limiter.take('42', 0)).toBe(true)
    expect(limiter.take('42', 1)).toBe(true)
    limiter.release('42')
    expect(limiter.size).toBe(1)
    expect(limiter.take('42', 2)).toBe(true)
    expect(limiter.take('42', 3)).toBe(false)

    // 请求的目标不存在：放行后立即撤销，不在内存里留下键
    for (let id = 1; id <= 100; id++) {
      const key = `missing-${id}`
      expect(limiter.take(key, 10)).toBe(true)
      limiter.release(key)
    }
    expect(limiter.size).toBe(1)
    // 撤销不存在的键不报错
    limiter.release('never-seen')
    expect(limiter.size).toBe(1)
  })

  it('窗口内涌入大量不同的键：键数不超过上限，按最近活动从早到晚丢弃，仍在活动的键保留限流记录', () => {
    const limiter = new BurstLimiter(1, 60_000, 100)
    expect(limiter.take('active', 0)).toBe(true)
    for (let i = 0; i < 1_000; i++) {
      limiter.take(`flood-${i}`, 1)
      // 仍在请求的键每次都移到末尾，不会被当作最早的键丢弃
      if (i % 50 === 0) expect(limiter.take('active', 1)).toBe(false)
      expect(limiter.size).toBeLessThanOrEqual(100)
    }
    expect(limiter.take('active', 2)).toBe(false)
    // 最早的键已被丢弃，再次出现时重新计数
    expect(limiter.take('flood-0', 3)).toBe(true)
  })

  it('超出上限时一次清理到上限的 90%，之后的请求不会每次都全表扫描', () => {
    const limiter = new BurstLimiter(1, 60_000, 100)
    for (let i = 0; i < 100; i++) limiter.take(`k-${i}`, 0)
    expect(limiter.size).toBe(100)
    // 第 101 个键触发清理（窗口内的键都未过期）：一次降到 90 个
    limiter.take('k-100', 0)
    expect(limiter.size).toBe(90)
    // 之后键数逐个增长，直到再次超过上限才清理（清理分摊到约 10 次请求一次）
    for (let i = 101; i <= 110; i++) {
      limiter.take(`k-${i}`, 0)
      expect(limiter.size).toBe(90 + (i - 100))
    }
    limiter.take('k-111', 0)
    expect(limiter.size).toBe(90)
  })
})

describe('同一键串行执行', () => {
  const deferred = () => {
    let resolve: () => void = () => {}
    const promise = new Promise<void>((r) => {
      resolve = r
    })
    return { promise, resolve }
  }

  it('同一个键的任务排队执行，后一个在前一个结束后才开始', async () => {
    const mutex = new KeyedMutex()
    const gate = deferred()
    const order: string[] = []
    const first = mutex.run('13800138000', async () => {
      order.push('first:start')
      await gate.promise
      order.push('first:end')
      return 1
    })
    const second = mutex.run('13800138000', async () => {
      order.push('second:start')
      return 2
    })
    await Promise.resolve()
    expect(order).toEqual(['first:start'])
    gate.resolve()
    expect(await Promise.all([first, second])).toEqual([1, 2])
    expect(order).toEqual(['first:start', 'first:end', 'second:start'])
  })

  it('不同键互不阻塞', async () => {
    const mutex = new KeyedMutex()
    const gate = deferred()
    const blocked = mutex.run('a', () => gate.promise)
    expect(await mutex.run('b', async () => 'b')).toBe('b')
    gate.resolve()
    await blocked
  })

  it('前一个任务失败不影响后续任务，结束后释放键', async () => {
    const mutex = new KeyedMutex()
    const failed = mutex.run('k', async () => {
      throw new Error('写入失败')
    })
    const next = mutex.run('k', async () => 'ok')
    await expect(failed).rejects.toThrow('写入失败')
    expect(await next).toBe('ok')
    await new Promise((r) => setTimeout(r, 0))
    expect(mutex.size).toBe(0)
  })
})

describe('客户端 IP', () => {
  const headers = new Headers({
    'x-forwarded-for': 'spoof, 203.0.113.9',
    'x-real-ip': '198.51.100.2',
  })

  it('未声明可信代理时不读取可伪造的转发头', () => {
    expect(getClientIp(headers, false)).toBe('unknown')
  })

  it('可信代理时取 X-Forwarded-For 最后一个地址（代理追加的真实对端），忽略客户端伪造的前缀', () => {
    expect(getClientIp(headers, true)).toBe('203.0.113.9')
    expect(
      getClientIp(new Headers({ 'x-forwarded-for': '198.18.0.1, 10.0.0.8,  192.0.2.7 ' }), true),
    ).toBe('192.0.2.7')
  })

  it('只有一个 X-Forwarded-For 地址时直接使用', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '198.18.0.21' }), true)).toBe('198.18.0.21')
    expect(getClientIp(new Headers({ 'x-forwarded-for': '2001:db8::1' }), true)).toBe('2001:db8::1')
  })

  it('没有 X-Forwarded-For 时退回 X-Real-IP', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '198.51.100.2' }), true)).toBe('198.51.100.2')
  })

  it.each(['unknown', 'spoof', '203.0.113.9, not-an-ip', '1.2.3.4:5678', '999.1.1.1', ''])(
    '取到的值不是合法 IP 时视为未知：%s',
    (value) => {
      expect(getClientIp(new Headers({ 'x-forwarded-for': value }), true)).toBe('unknown')
    },
  )

  it('X-Real-IP 不是合法 IP 时视为未知', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': 'unknown' }), true)).toBe('unknown')
    expect(getClientIp(new Headers(), true)).toBe('unknown')
  })
})

describe('未信任代理的提醒', () => {
  it('只在生产环境且未设置 TRUST_PROXY=true 时提醒，每个进程只提醒一次', () => {
    const logger = { warn: vi.fn<(message: string) => void>() }
    expect(warnIfProxyUntrusted(logger, { NODE_ENV: 'development' })).toBe(false)
    expect(warnIfProxyUntrusted(logger, { NODE_ENV: 'production', TRUST_PROXY: 'true' })).toBe(
      false,
    )
    expect(logger.warn).not.toHaveBeenCalled()

    expect(warnIfProxyUntrusted(logger, { NODE_ENV: 'production' })).toBe(true)
    expect(warnIfProxyUntrusted(logger, { NODE_ENV: 'production', TRUST_PROXY: 'false' })).toBe(
      false,
    )
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn.mock.calls[0]?.[0]).toContain('TRUST_PROXY')
  })
})

describe('手机号脱敏', () => {
  it('保留前三后四位', () => {
    expect(maskPhone('13812345678')).toBe('138****5678')
  })
  it('非 11 位数字原样返回', () => {
    expect(maskPhone('400-000-0000')).toBe('400-000-0000')
  })
})

describe('来源追踪', () => {
  it('提取 UTM 参数与外部来源', () => {
    const info = buildLandingInfo(
      'https://www.example.com/courses?utm_source=baidu&utm_medium=cpc&utm_campaign=3d',
      'https://www.baidu.com/s?wd=3d',
    )
    expect(info).toMatchObject({
      landingUrl: 'https://www.example.com/courses?utm_source=baidu&utm_medium=cpc&utm_campaign=3d',
      referrer: 'https://www.baidu.com/s?wd=3d',
      utmSource: 'baidu',
      utmMedium: 'cpc',
      utmCampaign: '3d',
    })
  })

  it('站内跳转不记为外部来源', () => {
    expect(buildLandingInfo('https://a.com/x', 'https://a.com/y').referrer).toBe('')
  })

  it('同一会话保留首次触达，带新的投放参数进入时更新', () => {
    const first = buildLandingInfo('https://a.com/?utm_source=baidu', '')
    expect(shouldReplaceLanding(null, first)).toBe(true)
    expect(shouldReplaceLanding(first, buildLandingInfo('https://a.com/works', ''))).toBe(false)
    expect(
      shouldReplaceLanding(first, buildLandingInfo('https://a.com/?utm_source=wechat', '')),
    ).toBe(true)
  })
})

describe('线索状态流转', () => {
  it('课程顾问只能向前推进或标为无效', () => {
    expect(canTransition('new', 'contacted', false)).toBe(true)
    expect(canTransition('new', 'enrolled', false)).toBe(true)
    expect(canTransition('visited', 'invalid', false)).toBe(true)
    expect(canTransition('contacted', 'new', false)).toBe(false)
    expect(canTransition('enrolled', 'visited', false)).toBe(false)
    expect(canTransition('invalid', 'new', false)).toBe(false)
  })

  it('管理员可以回退与重新激活', () => {
    expect(canTransition('enrolled', 'contacted', true)).toBe(true)
    expect(canTransition('invalid', 'new', true)).toBe(true)
  })
})
