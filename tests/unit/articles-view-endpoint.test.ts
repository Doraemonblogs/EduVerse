import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { createArticleViewHandler } from '@/endpoints/article-view'
import { ViewDeduper } from '@/lib/articles/view'
import { BurstLimiter } from '@/lib/lead/burst-limiter'

/**
 * 阅读量接口在数据库出错（500）与文章不存在（404）时撤销放行：不占用限流 / 去重名额，也不在内存里留下键。
 * 用假的请求对象模拟数据库结果，不连数据库（真实数据库的 404 路径见集成测试）。
 */

type ExecuteResult = { rowCount: number | null }

function createRequest(id: string, execute: () => Promise<ExecuteResult>, ip?: string) {
  const errors: unknown[] = []
  const req = {
    routeParams: { id },
    headers: new Headers(ip ? { 'x-forwarded-for': ip } : {}),
    payload: {
      db: { tableNameMap: new Map([['articles', 'articles']]), drizzle: { execute } },
      logger: { error: (...args: unknown[]) => errors.push(args) },
    },
  }
  return { req: req as unknown as PayloadRequest, errors }
}

const updated = async (): Promise<ExecuteResult> => ({ rowCount: 1 })
const missing = async (): Promise<ExecuteResult> => ({ rowCount: 0 })
const broken = async (): Promise<ExecuteResult> => {
  throw new Error('connection terminated')
}

async function send(
  handler: ReturnType<typeof createArticleViewHandler>,
  id: string,
  execute: () => Promise<ExecuteResult>,
  ip?: string,
) {
  const { req, errors } = createRequest(id, execute, ip)
  const response = await handler(req)
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
    errors,
  }
}

describe('阅读量接口：计数没有生效时撤销放行', () => {
  it('无法识别 IP、数据库出错（500）：撤销限流名额，不留下键，错误只写日志不返回给前台', async () => {
    const unknownIpLimiter = new BurstLimiter(1, 60_000)
    const handler = createArticleViewHandler({
      deduper: new ViewDeduper(),
      unknownIpLimiter,
      trustProxy: false,
    })

    const failed = await send(handler, '42', broken)
    expect(failed.status).toBe(500)
    expect(failed.body).toEqual({ error: 'failed' })
    expect(failed.errors).toHaveLength(1)
    expect(unknownIpLimiter.size).toBe(0)

    // 名额已退回：同一分钟里这篇文章仍可计数一次（限额 1）
    expect((await send(handler, '42', updated)).body).toEqual({ counted: true })
    expect((await send(handler, '42', updated)).body).toEqual({ counted: false })
    expect(unknownIpLimiter.size).toBe(1)
  })

  it('无法识别 IP、请求大量不存在的文章（404）：限流器里不留下键', async () => {
    const unknownIpLimiter = new BurstLimiter(60, 60_000)
    const handler = createArticleViewHandler({
      deduper: new ViewDeduper(),
      unknownIpLimiter,
      trustProxy: false,
    })
    for (let id = 1_000_000; id < 1_000_200; id++) {
      expect((await send(handler, String(id), missing)).status).toBe(404)
    }
    expect(unknownIpLimiter.size).toBe(0)
  })

  it('能识别 IP、数据库出错（500）或文章不存在（404）：撤销去重记录，之后同一访客仍可计数', async () => {
    const deduper = new ViewDeduper()
    const handler = createArticleViewHandler({ deduper, trustProxy: true })

    expect((await send(handler, '42', broken, '203.0.113.50')).status).toBe(500)
    expect(deduper.size).toBe(0)
    expect((await send(handler, '43', missing, '203.0.113.50')).status).toBe(404)
    expect(deduper.size).toBe(0)

    expect((await send(handler, '42', updated, '203.0.113.50')).body).toEqual({ counted: true })
    expect((await send(handler, '42', updated, '203.0.113.50')).body).toEqual({ counted: false })
    expect(deduper.size).toBe(1)
  })
})
