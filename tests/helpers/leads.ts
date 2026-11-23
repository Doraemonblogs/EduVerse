import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

/** 端到端测试用：按手机号查询 / 清理线索（开发库） */
export async function findLeadByPhone(phone: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'leads',
    where: { phone: { equals: phone } },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
}

export async function deleteLeadsByPhone(phone: string) {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'leads', where: { phone: { equals: phone } } })
}

/** 生成测试手机号（199 号段 + 时间戳尾数），并发项目之间不重复 */
export function testPhone(seed: number): string {
  return `199${String(Date.now() + seed).slice(-8)}`
}

/**
 * 每个测试使用不同的模拟客户端 IP，避免触发按 IP 限频（服务需以 TRUST_PROXY=true 启动）。
 * 作为唯一的 X-Forwarded-For 值发送：服务端取最后一个地址，单个值即为该地址。
 */
export function testIp(seed: number): string {
  return `198.18.${Math.floor(seed / 250) % 250}.${(seed % 250) + 1}`
}
