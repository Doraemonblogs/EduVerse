import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

export const TEST_PASSWORD = 'e2e-Password-123'

export type TestRole = 'admin' | 'editor' | 'consultant'

/** 每个 Playwright 项目（desktop / mobile）× 角色使用独立账号，避免并行执行时互相删除 */
export function testUserEmail(projectName: string, role: TestRole = 'admin'): string {
  return `e2e-${role}-${projectName}@example.test`
}

/**
 * 为端到端测试创建（或重建）后台测试账号。
 * 注意：库中没有任何账号时，第一个账号会被自动设为管理员，因此需要先创建管理员。
 */
export async function seedTestUser(email: string, role: TestRole = 'admin'): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: email } } })
  await payload.create({
    collection: 'users',
    data: { email, password: TEST_PASSWORD, name: `E2E ${role}`, role },
  })
}

/** 清理测试账号 */
export async function cleanupTestUser(email: string): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: email } } })
}
