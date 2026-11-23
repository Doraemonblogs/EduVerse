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

export { leadNamespace, testIp, testPhone, type LeadSpec } from './lead-identity'
