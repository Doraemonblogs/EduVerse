import Script from 'next/script'

import { isStaticPreview } from '@/config/site'
import { getThirdPartyConfig } from '@/lib/data/site'

/**
 * 第三方脚本（百度统计、在线客服）：只在后台配置后加载，且延迟到页面空闲后（lazyOnload），
 * 不阻塞首屏渲染。静态预览站不加载任何第三方脚本。
 */
export async function ThirdPartyScripts() {
  if (isStaticPreview) return null
  const config = await getThirdPartyConfig()
  const baiduId =
    config.baiduTongjiId && /^[a-f0-9]{32}$/i.test(config.baiduTongjiId)
      ? config.baiduTongjiId
      : null
  const serviceScript =
    config.customerService.enabled && config.customerService.scriptUrl?.startsWith('https://')
      ? config.customerService.scriptUrl
      : null

  return (
    <>
      {baiduId ? (
        <>
          <Script id="baidu-tongji-init" strategy="lazyOnload">
            {'window._hmt = window._hmt || [];'}
          </Script>
          <Script
            id="baidu-tongji"
            strategy="lazyOnload"
            src={`https://hm.baidu.com/hm.js?${baiduId}`}
          />
        </>
      ) : null}
      {serviceScript ? (
        <Script id="customer-service" strategy="lazyOnload" src={serviceScript} />
      ) : null}
    </>
  )
}
