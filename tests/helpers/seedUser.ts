import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

export const TEST_PASSWORD = 'e2e-Password-123'

/** 每个 Playwright 项目（desktop / mobile）使用独立账号，避免并行执行时互相删除 */
export function testUserEmail(projectName: string): string {
  return `e2e-admin-${projectName}@example.test`
}

/** 为端到端测试创建（或重建）后台测试账号 */
export async function seedTestUser(email: string): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: email } } })
  await payload.create({ collection: 'users', data: { email, password: TEST_PASSWORD } })
}

/** 清理测试账号 */
export async function cleanupTestUser(email: string): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: email } } })
}
