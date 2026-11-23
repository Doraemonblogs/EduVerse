import type { Payload, PayloadRequest } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { isJobRunnerRuntime, jobsAccess, jobsConfig, shouldAutoRunJobs } from '@/jobs/config'
import { NOTIFY_LEAD_RETRIES, notifyLeadTask } from '@/jobs/notify-lead'
import { STALE_JOB_AFTER_MS, staleJobsWhere } from '@/jobs/recover-stale-jobs'

type FakeUser = { id: number; role: string; active?: boolean } | null

const req = (user: FakeUser) => ({ req: { user } as unknown as PayloadRequest })

describe('任务队列接口权限', () => {
  const cases: [string, FakeUser, boolean][] = [
    ['管理员', { id: 1, role: 'admin' }, true],
    ['内容编辑', { id: 2, role: 'editor' }, false],
    ['课程顾问', { id: 3, role: 'consultant' }, false],
    ['已停用的管理员', { id: 4, role: 'admin', active: false }, false],
    ['未登录', null, false],
  ]

  it.each(cases)('run / queue / cancel：%s → %s', async (_label, user, allowed) => {
    expect(await jobsAccess.run(req(user))).toBe(allowed)
    expect(await jobsAccess.queue(req(user))).toBe(allowed)
    expect(await jobsAccess.cancel(req(user))).toBe(allowed)
  })

  it('已注册到 jobs 配置', () => {
    expect(jobsConfig.access).toBe(jobsAccess)
    expect(jobsConfig.tasks).toContain(notifyLeadTask)
  })
})

describe('线索推送重试策略', () => {
  it('最多重试 5 次，指数退避，基础间隔 1 分钟', () => {
    expect(notifyLeadTask.retries).toBe(NOTIFY_LEAD_RETRIES)
    expect(NOTIFY_LEAD_RETRIES).toEqual({
      attempts: 5,
      backoff: { type: 'exponential', delay: 60_000 },
    })
  })

  it('重试间隔约 1、2、4、8、16 分钟，覆盖钉钉 10 分钟限流', () => {
    // Payload 的指数退避：第 n 次失败后等待 2^(n-1) × delay
    const waits = Array.from(
      { length: NOTIFY_LEAD_RETRIES.attempts },
      (_, tried) => 2 ** tried * NOTIFY_LEAD_RETRIES.backoff.delay,
    )
    expect(waits.map((ms) => ms / 60_000)).toEqual([1, 2, 4, 8, 16])
    expect(waits.reduce((sum, ms) => sum + ms, 0)).toBeGreaterThan(10 * 60_000)
  })
})

describe('定时任务运行条件', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('只在 Next 服务端运行时（非构建阶段）自动执行', () => {
    expect(isJobRunnerRuntime({ NEXT_RUNTIME: 'nodejs' })).toBe(true)
    expect(
      isJobRunnerRuntime({ NEXT_RUNTIME: 'nodejs', NEXT_PHASE: 'phase-production-build' }),
    ).toBe(false)
    expect(isJobRunnerRuntime({})).toBe(false)
  })

  const fakePayload = (updateJobs: () => Promise<unknown>) => {
    const logger = { warn: vi.fn(), error: vi.fn() }
    const payload = { db: { updateJobs: vi.fn(updateJobs) }, logger } as unknown as Payload
    return { payload, updateJobs: payload.db.updateJobs, logger }
  }

  it('非服务端运行时不执行，也不查询数据库', async () => {
    vi.stubEnv('NEXT_RUNTIME', '')
    const { payload, updateJobs } = fakePayload(async () => [])
    expect(await shouldAutoRunJobs(payload)).toBe(false)
    expect(updateJobs).not.toHaveBeenCalled()
  })

  it('每个周期先用一次条件更新回收执行中断的任务，再照常执行', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('NEXT_PHASE', '')
    const { payload, updateJobs, logger } = fakePayload(async () => [{ id: 7 }, { id: 9 }])
    expect(await shouldAutoRunJobs(payload)).toBe(true)
    expect(updateJobs).toHaveBeenCalledTimes(1)
    expect(updateJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ processing: false }),
        where: expect.objectContaining({ and: expect.any(Array) }),
      }),
    )
    expect(logger.warn).toHaveBeenCalledWith({ jobIds: [7, 9] }, expect.stringContaining('2'))
  })

  it('回收出错时记录日志，本周期仍照常执行', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('NEXT_PHASE', '')
    const { payload, logger } = fakePayload(async () => {
      throw new Error('db down')
    })
    expect(await shouldAutoRunJobs(payload)).toBe(true)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})

describe('失联任务的判定条件', () => {
  it('处理中、未完成、未最终失败，且超过 10 分钟没有更新', () => {
    const now = new Date('2026-11-23T06:30:00.000Z')
    expect(STALE_JOB_AFTER_MS).toBe(10 * 60_000)
    expect(staleJobsWhere(now)).toEqual({
      and: [
        { processing: { equals: true } },
        { completedAt: { exists: false } },
        { hasError: { not_equals: true } },
        { updatedAt: { less_than: '2026-11-23T06:20:00.000Z' } },
      ],
    })
  })
})
