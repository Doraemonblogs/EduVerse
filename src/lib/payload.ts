import 'server-only'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

/** 获取 Payload 实例（内部已全局缓存，重复调用开销很小） */
export function getPayloadClient(): Promise<Payload> {
  return getPayload({ config })
}
