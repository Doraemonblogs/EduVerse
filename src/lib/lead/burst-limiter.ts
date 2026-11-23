/** 超出键数上限时清理到上限的多少（留出余量，避免每次请求都触发全表扫描） */
const PRUNE_TARGET = 0.9

/**
 * 进程内突发限流（滑动窗口）：拦截短时间内的连续提交，减轻数据库压力。
 * 单实例部署足够（PRD Q5）；多实例时以数据库限频为准。
 *
 * 内存与耗时有上限：键的数量超过 maxKeys 时先清理已过窗口的键，仍然超出则按“最近一次活动”从早到晚丢弃，
 * 一次清理到 maxKeys 的 90%（PRUNE_TARGET），之后要再新增约 10% 的键才会再次清理——
 * 全表扫描分摊到许多次请求上，键再多也不会每次请求都扫描一遍。
 * 被丢弃的键再次出现时重新计数（限流略宽松，可以接受；线索另有数据库层面的限频）。
 */
export class BurstLimiter {
  /** 键 → 窗口内的请求时间；Map 按写入顺序，每次请求都把键移到末尾（最近活动的在后） */
  private readonly hits = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** 记录一次请求；超过限制返回 false */
  take(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs)
    const allowed = recent.length < this.limit
    if (allowed) recent.push(now)
    this.hits.delete(key)
    this.hits.set(key, recent)
    if (this.hits.size > this.maxKeys) this.prune(now)
    return allowed
  }

  /**
   * 撤销该键最近一次放行（take 返回 true、但请求最终没有生效时调用，如目标不存在、处理失败），不占用名额；
   * 没有剩余记录时删除该键——由不存在的目标构成的键不会留在内存里。
   */
  release(key: string): void {
    const times = this.hits.get(key)
    if (!times) return
    times.pop()
    if (times.length === 0) this.hits.delete(key)
  }

  /** 当前记录的键数量 */
  get size(): number {
    return this.hits.size
  }

  private prune(now: number) {
    const target = Math.max(1, Math.floor(this.maxKeys * PRUNE_TARGET))
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key)
    }
    for (const key of this.hits.keys()) {
      if (this.hits.size <= target) break
      this.hits.delete(key)
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
