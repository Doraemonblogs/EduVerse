/**
 * 构建前清除 Next 数据缓存（unstable_cache 持久化在 .next/…/fetch-cache，跨构建保留）。
 *
 * 缓存键只由回调源码与 keyParts 决定：数据层只改了被调用的映射函数（视图模型字段变化）时键不变，
 * 新构建会读到旧结构的数据，直到对应标签被后台保存触发失效。每次构建从空缓存开始即可避免。
 * 纯 Node 脚本，不依赖 tsx 等开发依赖。
 */
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

await Promise.all(
  ['.next/cache/fetch-cache', '.next/dev/cache/fetch-cache'].map((dir) =>
    rm(path.join(root, dir), { recursive: true, force: true }),
  ),
)
