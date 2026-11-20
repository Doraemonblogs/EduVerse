import { describe, expect, it } from 'vitest'

import { validateWebhookUrl, WEBHOOK_HOSTS } from '@/globals/LeadSettings'

const WECOM_URL =
  'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=00000000-0000-0000-0000-000000000000'
const FEISHU_URL =
  'https://open.feishu.cn/open-apis/bot/v2/hook/00000000-0000-0000-0000-000000000000'
const DINGTALK_URL = 'https://oapi.dingtalk.com/robot/send?access_token=0000000000000000'

describe('validateWebhookUrl', () => {
  it('三家平台的官方 https 地址校验通过', () => {
    expect(validateWebhookUrl('wecom', WECOM_URL)).toBe(true)
    expect(validateWebhookUrl('feishu', FEISHU_URL)).toBe(true)
    expect(validateWebhookUrl('dingtalk', DINGTALK_URL)).toBe(true)
  })

  it('主机名与所选平台不一致时拒绝', () => {
    expect(validateWebhookUrl('wecom', FEISHU_URL)).not.toBe(true)
    expect(validateWebhookUrl('feishu', DINGTALK_URL)).not.toBe(true)
    expect(validateWebhookUrl('dingtalk', WECOM_URL)).not.toBe(true)
    expect(validateWebhookUrl('wecom', 'https://evil.com/cgi-bin/webhook/send?key=x')).not.toBe(
      true,
    )
  })

  it('拒绝非 https 协议', () => {
    expect(validateWebhookUrl('wecom', WECOM_URL.replace('https://', 'http://'))).not.toBe(true)
    expect(validateWebhookUrl('wecom', `//${WEBHOOK_HOSTS.wecom}/cgi-bin/webhook/send`)).not.toBe(
      true,
    )
    expect(validateWebhookUrl('wecom', `ftp://${WEBHOOK_HOSTS.wecom}/`)).not.toBe(true)
  })

  it('拒绝相似域名与把官方域名放在路径里的地址', () => {
    expect(
      validateWebhookUrl('wecom', 'https://qyapi.weixin.qq.com.evil.com/cgi-bin/webhook/send'),
    ).not.toBe(true)
    expect(validateWebhookUrl('wecom', 'https://evil.com/qyapi.weixin.qq.com')).not.toBe(true)
    expect(validateWebhookUrl('wecom', 'https://evil.com/https://qyapi.weixin.qq.com/')).not.toBe(
      true,
    )
    expect(
      validateWebhookUrl('wecom', 'https://evilqyapi.weixin.qq.com/cgi-bin/webhook/send'),
    ).not.toBe(true)
    expect(
      validateWebhookUrl('feishu', 'https://open.feishu.cn.evil.com/open-apis/bot/v2/hook/x'),
    ).not.toBe(true)
    expect(
      validateWebhookUrl('wecom', 'https://qyapi.weixin.qq.com./cgi-bin/webhook/send'),
    ).not.toBe(true)
  })

  it('拒绝用户信息（@）、反斜杠与非默认端口等绕过写法', () => {
    expect(validateWebhookUrl('wecom', 'https://qyapi.weixin.qq.com@evil.com/')).not.toBe(true)
    expect(validateWebhookUrl('wecom', 'https://qyapi.weixin.qq.com:443@evil.com/')).not.toBe(true)
    expect(
      validateWebhookUrl('wecom', 'https://user:pass@qyapi.weixin.qq.com/cgi-bin/webhook/send'),
    ).not.toBe(true)
    expect(validateWebhookUrl('wecom', 'https://qyapi.weixin.qq.com\\@evil.com/')).not.toBe(true)
    expect(
      validateWebhookUrl('wecom', 'https://qyapi.weixin.qq.com:8443/cgi-bin/webhook/send'),
    ).not.toBe(true)
    expect(validateWebhookUrl('wecom', 'https://127.0.0.1/cgi-bin/webhook/send')).not.toBe(true)
  })

  it('拒绝含空白字符的地址', () => {
    expect(validateWebhookUrl('wecom', ` ${WECOM_URL}`)).not.toBe(true)
    expect(validateWebhookUrl('wecom', `${WECOM_URL}\n`)).not.toBe(true)
  })

  it('平台未知或地址为空时返回错误提示', () => {
    expect(validateWebhookUrl('slack', WECOM_URL)).toBe('请先选择推送平台')
    expect(validateWebhookUrl('constructor', WECOM_URL)).toBe('请先选择推送平台')
    expect(validateWebhookUrl(undefined, WECOM_URL)).toBe('请先选择推送平台')
    expect(validateWebhookUrl('wecom', '')).toBe('请填写 Webhook 地址')
    expect(validateWebhookUrl('wecom', null)).toBe('请填写 Webhook 地址')
  })

  it('错误提示中写明所选平台的官方域名', () => {
    expect(validateWebhookUrl('dingtalk', 'https://evil.com/')).toContain(WEBHOOK_HOSTS.dingtalk)
  })
})
