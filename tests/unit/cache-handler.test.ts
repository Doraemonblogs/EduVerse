import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { nodeFs } from 'next/dist/server/lib/node-fs-methods'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import BoundedFileSystemCache, {
  BoundedCacheControls,
  boundSharedCacheControls,
  isNotFoundPage,
  MAX_CACHE_CONTROL_ENTRIES,
} from '../../cache-handler.mjs'

/**
 * cache-handler.mjs 继承 Next 内部的文件系统缓存：这里用真实的实现写临时目录，
 * 升级 Next 后内部结构变了（例如不再读 flushToDisk）会在这里失败。
 */

type SetArgs = Parameters<BoundedFileSystemCache['set']>

const ROUTE_KEY = `/route-cache/APP_PAGE/${'a'.repeat(64)}/$/courses/x1234`

function appPage(status: number): SetArgs[1] {
  return {
    kind: 'APP_PAGE',
    html: '<html></html>',
    rscData: Buffer.from('rsc'),
    headers: { 'x-next-cache-tags': 'collection:courses' },
    postponed: undefined,
    status,
    segmentData: undefined,
  } as SetArgs[1]
}

const PAGE_CONTEXT = {
  cacheControl: { revalidate: 3600, expire: 31536000 },
  isFallback: false,
  isRoutePPREnabled: false,
} as SetArgs[2]

async function listFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true })
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
  } catch {
    return []
  }
}

describe('isNotFoundPage', () => {
  it('只识别状态码 404 的 App Router 页面', () => {
    expect(isNotFoundPage({ kind: 'APP_PAGE', status: 404 })).toBe(true)
    expect(isNotFoundPage({ kind: 'APP_PAGE', status: 200 })).toBe(false)
    expect(isNotFoundPage({ kind: 'APP_PAGE' })).toBe(false)
    expect(isNotFoundPage({ kind: 'APP_ROUTE', status: 404 })).toBe(false)
    expect(isNotFoundPage({ kind: 'FETCH', status: 404 })).toBe(false)
    expect(isNotFoundPage(null)).toBe(false)
    expect(isNotFoundPage(undefined)).toBe(false)
  })
})

describe('BoundedFileSystemCache', () => {
  let root: string
  let serverDistDir: string

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'eduverse-cache-'))
    serverDistDir = path.join(root, 'server')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function createCache() {
    return new BoundedFileSystemCache({
      fs: nodeFs,
      flushToDisk: true,
      serverDistDir,
      revalidatedTags: [],
      maxMemoryCacheSize: 16 * 1024 * 1024,
      _requestHeaders: {},
    })
  }

  it('404 页面只进内存：不写入 route-cache，之后仍能从内存读到', async () => {
    const cache = createCache()
    await cache.set(ROUTE_KEY, appPage(404), PAGE_CONTEXT)

    expect(await listFiles(path.join(serverDistDir, 'route-cache'))).toEqual([])
    const cached = await cache.get(ROUTE_KEY, {
      kind: 'APP_PAGE',
      isFallback: false,
      isRoutePPREnabled: false,
    } as Parameters<BoundedFileSystemCache['get']>[1])
    expect(cached?.value).toMatchObject({ kind: 'APP_PAGE', status: 404 })
  })

  it('正常页面照常写盘；写过 404 之后也不影响后续写盘', async () => {
    const cache = createCache()
    await cache.set(`${ROUTE_KEY}-missing`, appPage(404), PAGE_CONTEXT)
    await cache.set(ROUTE_KEY, appPage(200), PAGE_CONTEXT)

    const files = await listFiles(path.join(serverDistDir, 'route-cache'))
    expect(files).toEqual(expect.arrayContaining(['x1234.html', 'x1234.rsc', 'x1234.meta']))
    expect(files.some((name) => name.startsWith('x1234-missing'))).toBe(false)
  })
})

describe('“每个路径的缓存时效”表有上限（SharedCacheControls）', () => {
  // 与 Next 服务端加载的是同一个模块实例（.external 模块不打包，按 node_modules 路径共享）
  const require = createRequire(import.meta.url)
  // 类型声明里 cacheControls 是 private：这里按运行时形态声明测试用到的成员
  type SharedCacheControlsClass = {
    cacheControls: Map<string, unknown>
    new (prerenderManifest: unknown): { set(route: string, cacheControl: unknown): void }
  }
  const { SharedCacheControls } =
    require('next/dist/server/lib/incremental-cache/shared-cache-controls.external.js') as {
      SharedCacheControls: SharedCacheControlsClass
    }

  it('BoundedCacheControls：超过上限时删除最早写入的条目，重复写入的键移到最新', () => {
    const map = new BoundedCacheControls(3, [
      ['a', 1],
      ['b', 2],
    ])
    map.set('c', 3)
    map.set('a', 10) // a 移到最新
    map.set('d', 4) // 超出：删除最早的 b
    expect([...map.keys()]).toEqual(['c', 'a', 'd'])
    expect(map.get('a')).toBe(10)
    expect(map.size).toBe(3)
  })

  it('加载缓存处理器后，Next 的静态表被换成有上限的版本（重复调用不重复替换）', () => {
    const table = boundSharedCacheControls()
    expect(table).toBeInstanceOf(BoundedCacheControls)
    expect(SharedCacheControls.cacheControls).toBe(table)
    expect(boundSharedCacheControls()).toBe(table)
    expect(MAX_CACHE_CONTROL_ENTRIES).toBeGreaterThanOrEqual(1000)
  })

  it('经 SharedCacheControls 写入大量随机路径后，条目数不超过上限，保留的是最近写入的路径', () => {
    const table = boundSharedCacheControls()
    table.clear()
    const manifest = {
      version: 4,
      routes: {},
      dynamicRoutes: {},
      notFoundRoutes: [],
      preview: { previewModeId: '', previewModeSigningKey: '', previewModeEncryptionKey: '' },
    }
    const controls = new SharedCacheControls(manifest)
    const keyFor = (i: number) => `/route-cache/APP_PAGE/${'b'.repeat(64)}/$/courses/x${i}`
    for (let i = 0; i < MAX_CACHE_CONTROL_ENTRIES + 500; i += 1) {
      controls.set(keyFor(i), { revalidate: 3600, expire: 31536000 })
    }
    expect(SharedCacheControls.cacheControls.size).toBe(MAX_CACHE_CONTROL_ENTRIES)
    expect(SharedCacheControls.cacheControls.has(keyFor(0))).toBe(false)
    expect(SharedCacheControls.cacheControls.has(keyFor(MAX_CACHE_CONTROL_ENTRIES + 499))).toBe(
      true,
    )
    table.clear()
  })

  it('Next 读取缓存页面时优先使用条目自身保存的 cacheControl（淘汰表中条目不影响时效；升级 Next 后形态变化时这里失败）', () => {
    const source = readFileSync(
      require.resolve('next/dist/server/lib/incremental-cache/index.js'),
      'utf8',
    )
    expect(source).toMatch(
      /if \(\(?cacheData == null \? void 0 : cacheData\.cacheControl\)?\) \{\s*cacheControl = cacheData\.cacheControl;\s*this\.cacheControls\.set\(storageKey, cacheControl\);/,
    )
  })
})
