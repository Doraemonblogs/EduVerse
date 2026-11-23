import { HTML_LIMITED_BOT_UA_RE } from 'next/dist/shared/lib/router/utils/html-bots'
import { describe, expect, it } from 'vitest'

import nextConfig, { HTML_LIMITED_BOTS } from '../../next.config'

/** Next 运行时的判定方式：只取 source，按不区分大小写匹配（next/dist/server/lib/streaming-metadata.js） */
const servesBlockingMetadata = (userAgent: string) =>
  new RegExp(HTML_LIMITED_BOTS.source, 'i').test(userAgent)

describe('next.config htmlLimitedBots（需要在 <head> 中输出元数据的爬虫）', () => {
  it('保留 Next 默认列表的全部内容（升级 Next 后默认列表变化时这里会失败，需同步复制）', () => {
    expect(HTML_LIMITED_BOTS.source.startsWith(`${HTML_LIMITED_BOT_UA_RE.source}|`)).toBe(true)
  })

  it('配置已生效（经过 withPayload 包装后仍在导出的配置中）', () => {
    expect(nextConfig.htmlLimitedBots).toBe(HTML_LIMITED_BOTS)
  })

  it('国内搜索引擎爬虫：百度、搜狗（默认列表）与 360、神马、头条（新增）都按阻塞式输出元数据', () => {
    for (const userAgent of [
      'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
      'Mozilla/5.0 (Linux;u;Android 4.2.2;zh-cn;) AppleWebKit/534.46 (KHTML,like Gecko) Version/5.1 Mobile Safari/10600.6.3 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
      'Sogou web spider/4.0(+http://www.sogou.com/docs/help/webmasters.htm#07)',
      'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0); 360Spider',
      'Mozilla/5.0 (compatible; HaosouSpider; http://www.haosou.com/help/help_3_2.html)',
      'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.81 YisouSpider/5.0 Safari/537.36',
      'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    ]) {
      expect(servesBlockingMetadata(userAgent), userAgent).toBe(true)
    }
  })

  it('普通浏览器与微信内置浏览器仍使用流式渲染', () => {
    for (const userAgent of [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50(0x1800323a) NetType/WIFI Language/zh_CN',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
    ]) {
      expect(servesBlockingMetadata(userAgent), userAgent).toBe(false)
    }
  })
})
