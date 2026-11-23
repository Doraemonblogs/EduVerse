import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { nodeFs } from 'next/dist/server/lib/node-fs-methods'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import BoundedFileSystemCache, { isNotFoundPage } from '../../cache-handler.mjs'

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
