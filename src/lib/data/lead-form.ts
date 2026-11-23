import 'server-only'

import type { LeadFormConfig } from '@/components/lead/types'
import { imageSource } from '@/lib/media'

import { getLeadFormOptions } from './site'

/** 留资表单配置（服务端读取，传给客户端表单组件） */
export async function getLeadFormConfig(): Promise<LeadFormConfig> {
  const options = await getLeadFormOptions()
  return {
    disciplines: options.disciplines,
    cities: options.cities,
    successTitle: options.successTitle,
    successMessage: options.successMessage,
    wechatId: options.wechatId,
    wechatQr: imageSource(options.wechatQr, 'thumbnail'),
    hotline: options.hotline,
  }
}
