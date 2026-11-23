/**
 * 进程内突发限流（滑动窗口）：拦截短时间内的连续提交，减轻数据库压力。
 * 单实例部署足够（PRD Q5）；多实例时以数据库限频为准。
 */
export class BurstLimiter {
  private readonly hits = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** 记录一次请求；超过限制返回 false */
  take(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs)
    if (recent.length >= this.limit) {
      this.hits.set(key, recent)
      return false
    }
    recent.push(now)
    this.hits.set(key, recent)
    if (this.hits.size > this.maxKeys) this.prune(now)
    return true
  }

  private prune(now: number) {
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key)
    }
  }
}

/**
 * 进程内按键串行执行（同一个键的任务排队，不同键互不影响）。
 * 用于同一手机号的“计数 / 查重 → 写入”：并发提交时后一个能看到前一个写入的线索，
 * 不会同时绕过手机号限频与重复判定。单实例部署足够（PRD Q5）。
 */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>()

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve()
    const result = previous.then(task)
    // 队尾只关心“是否结束”，不向后传递前一个任务的异常
    const tail = result.then(
      () => undefined,
      () => undefined,
    )
    this.tails.set(key, tail)
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key)
    })
    return result
  }

  /** 当前有任务在执行或排队的键数量 */
  get size(): number {
    return this.tails.size
  }
}
