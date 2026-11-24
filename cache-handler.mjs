/**
 * Next.js 增量缓存处理器（next.config.ts 的 cacheHandler，只在生产构建 / 运行时启用）。
 *
 * 与内置的文件系统缓存完全相同（ISR 页面、数据缓存、按标签失效、内存 LRU 都沿用 Next 的实现），只有一处不同：
 * **404 页面的渲染结果只放进内存 LRU（cacheMaxMemorySize），不写入磁盘。**
 *
 * 原因（M7 评审 / M8 §7）：课程、讲师、作品等详情路由带 generateStaticParams，不在清单里的路径会按需渲染并作为 ISR
 * 结果缓存——404 也一样，每个随机路径在 .next/server/route-cache 下写一组文件（约 25KB），磁盘上永不淘汰，
 * 用随机 slug 刷请求可以把磁盘写满。404 只进内存后，磁盘上的页面缓存以已发布内容的数量为上限；
 * 内存里的 404 条目同样带缓存标签，后台发布同名内容时随标签失效。
 *
 * 另外给 Next 进程内的“每个路径的缓存时效”表设上限（见下方 BoundedCacheControls）。
 *
 * 依赖 Next 内部模块（file-system-cache、shared-cache-controls），升级 Next 时由 tests/unit/cache-handler.test.ts 兜底检查。
 */
import fileSystemCacheModule from 'next/dist/server/lib/incremental-cache/file-system-cache.js'
import sharedCacheControlsModule from 'next/dist/server/lib/incremental-cache/shared-cache-controls.external.js'

/** @typedef {import('next/dist/server/lib/incremental-cache/file-system-cache').default} FileSystemCacheInstance */

/** @type {typeof import('next/dist/server/lib/incremental-cache/file-system-cache').default} */
const FileSystemCache = fileSystemCacheModule.default ?? fileSystemCacheModule

/**
 * “每个路径的缓存时效”表的条目上限。
 *
 * Next 的 IncrementalCache 每写入一个页面缓存，就在静态的 SharedCacheControls.cacheControls（一个 Map）里记下该路径的
 * revalidate / expire，读取内存里的缓存页面时也会再记一次；这个 Map 不淘汰，键含完整请求路径。
 * 随机路径的 404 虽然不写盘，仍会让它随请求数无限增长（M8 评审）。条目只是缓存：缺少时 Next 改用缓存条目自身保存的
 * cacheControl（内存 LRU 与磁盘 meta 都存了一份）或构建清单里的路由时效，因此按插入顺序淘汰最早的条目是安全的。
 */
export const MAX_CACHE_CONTROL_ENTRIES = 10_000

/**
 * 有上限的 Map：超过上限时删除最早写入的条目；重复写入同一个键时把它移到最新。
 * @template K, V
 * @extends {Map<K, V>}
 */
export class BoundedCacheControls extends Map {
  /**
   * @param {number} limit
   * @param {Iterable<[K, V]>} [entries]
   */
  constructor(limit, entries) {
    super()
    /** @type {number} */
    this.limit = limit
    if (entries) for (const [key, value] of entries) this.set(key, value)
  }

  /**
   * @param {K} key
   * @param {V} value
   * @returns {this}
   */
  set(key, value) {
    if (this.has(key)) this.delete(key)
    super.set(key, value)
    while (this.size > this.limit) {
      const oldest = this.keys().next()
      if (oldest.done) break
      this.delete(oldest.value)
    }
    return this
  }
}

/** @type {{ cacheControls: Map<string, unknown> }} */
const SharedCacheControls = (sharedCacheControlsModule.default ?? sharedCacheControlsModule)
  .SharedCacheControls

/** 把 Next 的静态表换成有上限的版本（保留已有条目；重复加载本模块时不重复替换） */
export function boundSharedCacheControls(limit = MAX_CACHE_CONTROL_ENTRIES) {
  if (!(SharedCacheControls.cacheControls instanceof BoundedCacheControls)) {
    SharedCacheControls.cacheControls = new BoundedCacheControls(
      limit,
      SharedCacheControls.cacheControls,
    )
  }
  return SharedCacheControls.cacheControls
}

boundSharedCacheControls()

/**
 * 是否为 404 页面的缓存值（App Router 页面渲染结果，状态码 404）
 * @param {unknown} data
 * @returns {boolean}
 */
export function isNotFoundPage(data) {
  if (typeof data !== 'object' || data === null) return false
  const value = /** @type {{ kind?: unknown, status?: unknown }} */ (data)
  return value.kind === 'APP_PAGE' && value.status === 404
}

export default class BoundedFileSystemCache extends FileSystemCache {
  /**
   * @param {string} key
   * @param {Parameters<FileSystemCacheInstance['set']>[1]} data
   * @param {Parameters<FileSystemCacheInstance['set']>[2]} ctx
   * @returns {Promise<void>}
   */
  async set(key, data, ctx) {
    if (!isNotFoundPage(data)) return super.set(key, data, ctx)
    // 内置实现先写内存 LRU，再按 flushToDisk 决定是否写盘：这一次关掉写盘。
    // 缓存处理器实例按请求创建，临时改动不影响其它请求（flushToDisk 是内置实现的实例字段）
    const flushToDisk = this.flushToDisk
    this.flushToDisk = false
    try {
      await super.set(key, data, ctx)
    } finally {
      this.flushToDisk = flushToDisk
    }
  }
}
