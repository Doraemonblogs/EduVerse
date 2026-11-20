import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload

describe('Payload Local API（测试数据库）', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('连接的是独立的测试数据库', () => {
    expect(process.env.DATABASE_URL).toMatch(/_test(\?|$)/)
  })

  it('可以查询 users 集合', async () => {
    const users = await payload.find({ collection: 'users', limit: 1 })
    expect(users.docs).toBeInstanceOf(Array)
  })

  it('后台默认语言为简体中文', () => {
    expect(payload.config.i18n.fallbackLanguage).toBe('zh')
  })
})
