/**
 * 阅读量上报（POST /api/articles/:id/view，见 src/endpoints/article-view.ts）的纯逻辑：
 * 路由参数校验与进程内去重。单实例部署足够（PRD Q5）；多实例时各进程分别去重，计数略偏高，可以接受。
 */

/** 同一访客（IP）同一文章的去重时间窗：30 分钟内只计一次 */
export const ARTICLE_VIEW_DEDUPE_MS = 30 * 60 * 1000

/** PostgreSQL integer 的上限：超出的 ID 不可能存在，也避免查询报错 */
const MAX_ID = 2_147_483_647

/**
 * 解析路由参数里的文章 ID：只接受不带前导 0 的正整数（如 "12"），
 * 其它（"0"、"012"、"1.5"、"abc"、超出整数范围、非字符串）返回 null → 接口返回 400，不查库。
 */
export function parseArticleId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value)) return null
  const id = Number(value)
  return id <= MAX_ID ? id : null
}

/**
 * 进程内的时间窗去重：同一个键在 windowMs 内只放行一次。
 * 键的数量超过 maxKeys 时先清理过期的键，仍然超出则丢弃最早的（Map 按写入顺序，放行时重新写入），
 * 内存占用有上限；被丢弃的键再次出现时会重新计数（计数略偏高，可以接受）。
 */
export class ViewDeduper {
  private readonly seen = new Map<string, number>()

  constructor(
    private readonly windowMs: number = ARTICLE_VIEW_DEDUPE_MS,
    private readonly maxKeys = 50_000,
  ) {}

  /** 是否应该计数：时间窗内第一次出现返回 true（并记录），否则 false */
  shouldCount(key: string, now = Date.now()): boolean {
    const last = this.seen.get(key)
    if (last !== undefined && now - last < this.windowMs) return false
    this.seen.delete(key)
    this.seen.set(key, now)
    if (this.seen.size > this.maxKeys) this.prune(now)
    return true
  }

  /** 撤销一次放行（计数失败、文章不存在时调用，下次请求仍可计数） */
  forget(key: string): void {
    this.seen.delete(key)
  }

  /** 当前记录的键数量（测试用） */
  get size(): number {
    return this.seen.size
  }

  private prune(now: number) {
    for (const [key, time] of this.seen) {
      if (now - time >= this.windowMs) this.seen.delete(key)
    }
    for (const key of this.seen.keys()) {
      if (this.seen.size <= this.maxKeys) break
      this.seen.delete(key)
    }
  }
}

/** 去重键：文章 ID + 访客 IP */
export function articleViewKey(articleId: number, ip: string): string {
  return `${articleId}|${ip}`
}
