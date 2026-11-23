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
 * 依赖 Next 内部模块（file-system-cache），升级 Next 时由 tests/unit/cache-handler.test.ts 兜底检查。
 */
import fileSystemCacheModule from 'next/dist/server/lib/incremental-cache/file-system-cache.js'

/** @typedef {import('next/dist/server/lib/incremental-cache/file-system-cache').default} FileSystemCacheInstance */

/** @type {typeof import('next/dist/server/lib/incremental-cache/file-system-cache').default} */
const FileSystemCache = fileSystemCacheModule.default ?? fileSystemCacheModule

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
