import { type Payload, type Where } from 'payload'

/**
 * 任务领取后多久仍未结束就视为“执行者已失联”。
 * 线索推送每个目标最多等 5 秒（并行），正常执行远小于这个时长；进程在执行中被重启或崩溃时，
 * 任务会一直停在 processing=true，Payload 3.94 不会自动回收，之后的定时任务都会跳过它。
 */
export const STALE_JOB_AFTER_MS = 10 * 60 * 1000

/** 单次最多回收的任务数（正常情况下为 0；只是给极端情况设个上限） */
export const STALE_JOB_RECOVER_LIMIT = 50

/** 失联任务：处理中、未完成、未最终失败，且超过 staleAfterMs 没有任何更新 */
export function staleJobsWhere(now: Date, staleAfterMs: number = STALE_JOB_AFTER_MS): Where {
  return {
    and: [
      { processing: { equals: true } },
      { completedAt: { exists: false } },
      { hasError: { not_equals: true } },
      { updatedAt: { less_than: new Date(now.getTime() - staleAfterMs).toISOString() } },
    ],
  }
}

export type RecoverStaleJobsOptions = {
  now?: Date
  staleAfterMs?: number
}

/**
 * 把失联任务放回队列（processing=false），交给正常的重试流程（尝试次数与退避不变）。
 * 每个定时任务周期调用一次：一次条件更新，没有失联任务时只是一次按索引列的查询。
 * 已成功推送的目标记录在线索的 webhookDeliveries 上，重新执行不会重复推送给它们。
 * 返回回收的任务 ID；出错时记录日志并返回空数组，不影响本周期正常领取任务。
 */
export async function recoverStaleJobs(
  payload: Payload,
  { now = new Date(), staleAfterMs = STALE_JOB_AFTER_MS }: RecoverStaleJobsOptions = {},
): Promise<(number | string)[]> {
  try {
    const recovered = await payload.db.updateJobs({
      where: staleJobsWhere(now, staleAfterMs),
      // 同时刷新 updatedAt：放回队列后若再次失联，要再等一个完整周期才会被回收
      data: { processing: false, updatedAt: now.toISOString() },
      limit: STALE_JOB_RECOVER_LIMIT,
      returning: true,
    })
    const ids = (recovered ?? []).map((job) => job.id)
    if (ids.length > 0) {
      payload.logger.warn({ jobIds: ids }, `已回收 ${ids.length} 个执行中断的任务，等待重新执行`)
    }
    return ids
  } catch (err) {
    payload.logger.error({ err }, '回收执行中断的任务失败')
    return []
  }
}
