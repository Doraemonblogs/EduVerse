/**
 * 按参数缓存的详情查询守卫（课程 / 专业方向 / 作品 / 讲师 / 文章 / 校区 / 通用页面）。
 *
 * 生产环境的数据缓存（unstable_cache）持久化在 .next/cache/fetch-cache，磁盘上不淘汰；详情查询以 slug / ID 为键，
 * 不存在的 slug 查到 null 也会被缓存，用随机路径刷请求可以让缓存无限增长。
 * 这里先查“已发布清单”（不带参数的单条缓存，与详情同样随集合标签失效），只有清单中的键才进入按参数缓存的详情查询，
 * 缓存条目数因此以已发布内容的数量为上限。清单与详情使用相同（或更宽）的发布条件，不会误判已发布的内容。
 *
 * 纯函数，不依赖 Next / Payload，便于单元测试。
 */
export async function loadIfKnown<K, T>(
  key: K,
  knownKeys: () => Promise<readonly K[]>,
  load: (key: K) => Promise<T | null>,
): Promise<T | null> {
  const keys = await knownKeys()
  if (!keys.includes(key)) return null
  return load(key)
}
