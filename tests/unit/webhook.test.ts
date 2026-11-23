import { createHmac } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import {
  buildLeadMessage,
  buildWebhookRequest,
  dingtalkSign,
  feishuSign,
  formatBeijingTime,
  renderPlainText,
  sendWebhook,
  sitePageUrl,
  webhookTargetKey,
  type DingtalkPayload,
  type FeishuPayload,
  type LeadSummary,
  type WebhookTarget,
  type WecomPayload,
} from '@/lib/lead/webhook'

const WECOM_URL =
  'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=00000000-0000-0000-0000-000000000000'
const FEISHU_URL =
  'https://open.feishu.cn/open-apis/bot/v2/hook/00000000-0000-0000-0000-000000000000'
const DINGTALK_URL = 'https://oapi.dingtalk.com/robot/send?access_token=0000000000000000'

/** 2026-11-23 14:05:30（北京时间） */
const NOW = Date.UTC(2026, 10, 23, 6, 5, 30, 123)

const summary: LeadSummary = {
  name: '张三',
  phone: '13812345678',
  intentLabel: '预约试听',
  disciplineName: '三维动画',
  city: '北京',
  message: '想了解周末班的上课时间',
  position: 'home_hero',
  pageUrl: 'https://www.example.com/courses/3d-animation',
  isDuplicate: false,
  createdAt: new Date(NOW).toISOString(),
  adminUrl: 'https://www.example.com/admin/collections/leads/42',
}

const target = (platform: WebhookTarget['platform'], extra: Partial<WebhookTarget> = {}) => {
  const url = { wecom: WECOM_URL, feishu: FEISHU_URL, dingtalk: DINGTALK_URL }[platform]
  return { name: '北京校区顾问群', platform, url, maskPhone: true, ...extra } as WebhookTarget
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const textOf = (target: WebhookTarget, data: LeadSummary = summary) =>
  renderPlainText(buildLeadMessage(data, { maskPhone: target.maskPhone }))

describe('buildLeadMessage', () => {
  it('包含线索的关键信息与后台链接，时间按北京时间显示', () => {
    const text = textOf(target('feishu'))
    expect(text.split('\n')).toEqual([
      '新线索提醒',
      '姓名：张三',
      '手机号：138****5678',
      '意向：预约试听',
      '意向专业：三维动画',
      '城市：北京',
      '留言：想了解周末班的上课时间',
      '来源位置：home_hero',
      '提交页面：https://www.example.com/courses/3d-animation',
      '时间：2026-11-23 14:05',
      '后台链接：https://www.example.com/admin/collections/leads/42',
    ])
  })

  it('默认手机号脱敏，关闭脱敏后显示完整手机号', () => {
    expect(textOf(target('feishu'))).not.toContain('13812345678')
    expect(textOf(target('feishu', { maskPhone: false }))).toContain('手机号：13812345678')
  })

  it('选填字段为空时省略对应行', () => {
    const text = textOf(target('feishu'), {
      ...summary,
      disciplineName: undefined,
      city: '',
      message: undefined,
      position: undefined,
      pageUrl: undefined,
    })
    for (const label of ['意向专业', '城市', '留言', '来源位置', '提交页面']) {
      expect(text).not.toContain(`${label}：`)
    }
    expect(text).toContain('姓名：张三')
  })

  it('重复线索会单独标注', () => {
    expect(textOf(target('feishu'))).not.toContain('重复线索')
    expect(textOf(target('feishu'), { ...summary, isDuplicate: true })).toContain('重复线索：是')
  })

  it('留言超过 100 字时截断并以省略号结尾', () => {
    const text = textOf(target('feishu'), { ...summary, message: '学'.repeat(150) })
    expect(text).toContain(`留言：${'学'.repeat(100)}…`)
    expect(text).not.toContain('学'.repeat(101))
  })

  it('访客输入中的换行与链接、提及语法不会生效', () => {
    const text = textOf(target('feishu'), {
      ...summary,
      name: '<at user_id="all">所有人</at>',
      message: '你好\n后台链接：[点我](https://evil.example)\r\n**加急**',
    })
    const lines = text.split('\n')
    expect(lines.filter((line) => line.startsWith('后台链接：'))).toHaveLength(1)
    expect(text).not.toMatch(/<at|\]\(|\*\*加急/)
    expect(text).toContain('留言：你好 后台链接：［点我］（https://evil.example） ＊＊加急＊＊')
  })

  it('提交页面不是本站地址时整行省略，不会把访客伪造的链接推送到群里', () => {
    for (const pageUrl of [
      'https://eduverse-admin.example-phish.com/login',
      '//evil.example/login',
      'http://www.example.com/courses',
      'https://www.example.com:8443/courses',
      'javascript:alert(1)',
    ]) {
      const text = textOf(target('feishu'), { ...summary, pageUrl })
      expect(text).not.toContain('提交页面：')
      expect(text).not.toMatch(/phish|evil|javascript|8443/)
    }
  })

  it('提交页面按站点地址重建：去掉账号密码与 # 片段，保留路径与查询串', () => {
    const text = textOf(target('feishu'), {
      ...summary,
      pageUrl: 'https://user:pass@www.example.com/courses/3d?utm_source=baidu#top',
    })
    expect(text).toContain('提交页面：https://www.example.com/courses/3d?utm_source=baidu\n')
    expect(text).not.toContain('user:pass')
  })

  it('本站地址中夹带的外站网址被编码，提交页面一行只有一个本站链接', () => {
    for (const platform of ['feishu', 'wecom', 'dingtalk'] as const) {
      const { body } = buildWebhookRequest(
        target(platform),
        { ...summary, pageUrl: 'https://www.example.com/a(https://evil.example/login)' },
        { now: NOW },
      )
      const text =
        platform === 'feishu'
          ? (body as FeishuPayload).content.text
          : platform === 'wecom'
            ? (body as WecomPayload).markdown.content
            : (body as DingtalkPayload).markdown.text
      const line = text.split('\n').find((l) => l.startsWith('提交页面：'))
      expect(line).toBe('提交页面：https://www.example.com/a%28https%3A//evil.example/login%29')
    }
  })

  it('消息中不包含 IP 与设备信息', () => {
    const withClient = { ...summary, ip: '203.0.113.7', userAgent: 'Mozilla/5.0' }
    const text = textOf(target('feishu'), withClient)
    expect(text).not.toContain('203.0.113.7')
    expect(text).not.toContain('Mozilla')
  })

  it('时间与服务器时区无关，固定按北京时间格式化', () => {
    expect(formatBeijingTime('2026-12-31T16:30:00.000Z')).toBe('2027-01-01 00:30')
    expect(formatBeijingTime('not-a-date')).toBe('')
  })
})

describe('sitePageUrl', () => {
  const SITE = 'https://www.example.com'

  it('同源地址只保留路径与查询串，协议与主机取自站点地址', () => {
    expect(sitePageUrl('https://www.example.com/a/b?x=1#frag', SITE)).toBe(
      'https://www.example.com/a/b?x=1',
    )
    expect(sitePageUrl('  https://WWW.EXAMPLE.COM/a  ', SITE)).toBe('https://www.example.com/a')
  })

  it('相对路径按站点地址解析', () => {
    expect(sitePageUrl('/courses/demo', SITE)).toBe('https://www.example.com/courses/demo')
  })

  it('路径与查询串中可能让客户端断开链接的字符被编码，外站地址不会被单独识别成链接', () => {
    for (const forged of [
      '/a,https://evil.example/login',
      '/a(https://evil.example/login)',
      '/a|https://evil.example',
      "/a'https://evil.example",
      '/a;https://evil.example',
      '/a!https://evil.example',
      '/a?next=x,https://evil.example/login',
      '/a*b*',
      '/a@evil.example',
    ]) {
      const url = sitePageUrl(forged, SITE)
      expect(url?.startsWith('https://www.example.com/a')).toBe(true)
      // 编码后不再出现 “://”，也没有 , ( ) | ' ; ! * @ 这类常见的链接断点
      expect(url?.slice('https://'.length)).not.toContain('://')
      expect(url).not.toMatch(/[,()|';!*@]/)
    }
    expect(sitePageUrl('/a(https://evil.example/login)', SITE)).toBe(
      'https://www.example.com/a%28https%3A//evil.example/login%29',
    )
  })

  it('已有的百分号编码与常见查询参数保持不变，孤立的 % 被编码', () => {
    expect(sitePageUrl('/courses/%E4%B8%89%E7%BB%B4?utm_source=baidu&q=a+b', SITE)).toBe(
      'https://www.example.com/courses/%E4%B8%89%E7%BB%B4?utm_source=baidu&q=a+b',
    )
    expect(sitePageUrl('/三维动画?q=中文', SITE)).toBe(
      'https://www.example.com/%E4%B8%89%E7%BB%B4%E5%8A%A8%E7%94%BB?q=%E4%B8%AD%E6%96%87',
    )
    expect(sitePageUrl('/a%zz', SITE)).toBe('https://www.example.com/a%25zz')
  })

  it('站点地址可以是任一本站地址（只取源）', () => {
    expect(sitePageUrl('/x', 'https://www.example.com/admin/collections/leads/1')).toBe(
      'https://www.example.com/x',
    )
  })

  it('其他源、无法解析或为空时返回 undefined', () => {
    expect(sitePageUrl('https://evil.example/x', SITE)).toBeUndefined()
    expect(sitePageUrl('https://www.example.com.evil.example/x', SITE)).toBeUndefined()
    expect(sitePageUrl('//evil.example/x', SITE)).toBeUndefined()
    expect(sitePageUrl('data:text/html,hi', SITE)).toBeUndefined()
    expect(sitePageUrl('http://[', SITE)).toBeUndefined()
    expect(sitePageUrl('/x', 'not a url')).toBeUndefined()
    expect(sitePageUrl('', SITE)).toBeUndefined()
    expect(sitePageUrl(null, SITE)).toBeUndefined()
    expect(sitePageUrl(undefined, SITE)).toBeUndefined()
  })
})

describe('各平台消息体', () => {
  it('企业微信使用 markdown 消息，后台链接为 Markdown 链接', () => {
    const { url, body } = buildWebhookRequest(target('wecom'), summary, { now: NOW })
    expect(url).toBe(WECOM_URL)
    const payload = body as WecomPayload
    expect(payload.msgtype).toBe('markdown')
    expect(Object.keys(payload)).toEqual(['msgtype', 'markdown'])
    expect(payload.markdown.content.startsWith('**新线索提醒**\n')).toBe(true)
    expect(payload.markdown.content).toContain('手机号：138****5678')
    expect(payload.markdown.content).toContain(`后台链接：[查看线索](${summary.adminUrl})`)
  })

  it('企业微信即使填写了密钥也不加签', () => {
    const { url, body } = buildWebhookRequest(target('wecom', { secret: 'x' }), summary)
    expect(url).toBe(WECOM_URL)
    expect(body).not.toHaveProperty('sign')
  })

  it('飞书未配置密钥时只发送文本消息', () => {
    const { url, body } = buildWebhookRequest(target('feishu'), summary, { now: NOW })
    expect(url).toBe(FEISHU_URL)
    expect(body).toEqual({ msg_type: 'text', content: { text: textOf(target('feishu')) } })
  })

  it('飞书配置密钥时附带秒级时间戳与签名', () => {
    const secret = 'feishu-secret'
    const { body } = buildWebhookRequest(target('feishu', { secret }), summary, { now: NOW })
    const payload = body as FeishuPayload
    const timestamp = String(Math.floor(NOW / 1000))
    // 飞书文档算法：以 timestamp + "\n" + secret 为密钥，对空字符串做 HMAC-SHA256，再 Base64
    const expected = createHmac('sha256', `${timestamp}\n${secret}`).update('').digest('base64')
    expect(payload.timestamp).toBe(timestamp)
    expect(payload.sign).toBe(expected)
    expect(feishuSign(timestamp, secret)).toBe(expected)
    expect(payload.content.text).toContain('新线索提醒')
  })

  it('钉钉使用 markdown 消息，标题为新线索提醒', () => {
    const { url, body } = buildWebhookRequest(target('dingtalk'), summary, { now: NOW })
    expect(url).toBe(DINGTALK_URL)
    const payload = body as DingtalkPayload
    expect(payload.msgtype).toBe('markdown')
    expect(payload.markdown.title).toBe('新线索提醒')
    expect(payload.markdown.text).toContain('#### 新线索提醒\n\n姓名：张三\n\n')
    expect(payload.markdown.text).toContain(`后台链接：[查看线索](${summary.adminUrl})`)
  })

  it('钉钉配置密钥时在地址上追加毫秒时间戳与 URL 编码的签名', () => {
    const secret = 'SEC0123456789abcdef'
    const { url } = buildWebhookRequest(target('dingtalk', { secret }), summary, { now: NOW })
    const timestamp = String(NOW)
    // 钉钉文档算法：以 secret 为密钥，对 timestamp + "\n" + secret 做 HMAC-SHA256，再 Base64、URL 编码
    const expected = createHmac('sha256', secret).update(`${timestamp}\n${secret}`).digest('base64')
    expect(url).toBe(`${DINGTALK_URL}&timestamp=${timestamp}&sign=${encodeURIComponent(expected)}`)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('access_token')).toBe('0000000000000000')
    expect(parsed.searchParams.get('sign')).toBe(expected)
    expect(dingtalkSign(timestamp, secret)).toBe(expected)
  })
})

describe('webhookTargetKey', () => {
  it('由名称与主机名组成，不包含地址中的密钥', () => {
    const key = webhookTargetKey(target('wecom'))
    expect(key).toBe('北京校区顾问群（qyapi.weixin.qq.com）')
    expect(key).not.toContain('key=')
  })
})

describe('sendWebhook', () => {
  it('以 JSON POST 到机器人地址，平台返回成功时 ok 为 true', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ errcode: 0, errmsg: 'ok' }))
    const result = await sendWebhook(target('wecom'), summary, { fetchImpl, now: NOW })
    expect(result).toEqual({ ok: true, status: 200 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe(WECOM_URL)
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json; charset=utf-8' })
    expect(JSON.parse(String(init?.body))).toMatchObject({ msgtype: 'markdown' })
  })

  it('发送前再次校验地址，非官方域名不会发出请求', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ errcode: 0 }))
    const evil = [
      target('wecom', { url: 'https://evil.example/cgi-bin/webhook/send?key=x' }),
      target('wecom', { url: 'https://qyapi.weixin.qq.com.evil.example/cgi-bin/webhook/send' }),
      target('wecom', { url: 'http://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x' }),
      target('wecom', { url: 'https://qyapi.weixin.qq.com:8443/cgi-bin/webhook/send' }),
      // 平台与地址不匹配
      target('feishu', { url: WECOM_URL }),
    ]
    for (const t of evil) {
      const result = await sendWebhook(t, summary, { fetchImpl })
      expect(result.ok).toBe(false)
      expect(result.ok ? '' : result.error).toContain('地址未通过校验')
    }
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('请求超时返回失败', async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('This operation was aborted', 'AbortError')),
          )
        }),
    )
    const result = await sendWebhook(target('wecom'), summary, { fetchImpl, timeoutMs: 20 })
    expect(result.ok).toBe(false)
    expect(result.ok ? '' : result.error).toContain('请求超时')
  })

  it('注入的 fetch 不响应中止信号时也会按时返回失败', async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => new Promise<Response>(() => {}))
    const result = await sendWebhook(target('dingtalk'), summary, { fetchImpl, timeoutMs: 20 })
    expect(result).toEqual({ ok: false, error: expect.stringContaining('请求超时') })
  })

  it('平台返回非 0 结果码视为失败，并记录错误码', async () => {
    const cases: [WebhookTarget, unknown][] = [
      [target('wecom'), { errcode: 93000, errmsg: 'invalid webhook url' }],
      [target('dingtalk'), { errcode: 310000, errmsg: 'sign not match' }],
      [target('feishu'), { code: 19021, msg: 'sign match fail' }],
      [target('feishu'), { StatusCode: 9499, StatusMessage: 'Bad Request' }],
    ]
    for (const [t, body] of cases) {
      const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(body))
      const result = await sendWebhook(t, summary, { fetchImpl })
      expect(result.ok).toBe(false)
      expect(result.status).toBe(200)
      const code = String(
        (body as Record<string, unknown>).errcode ??
          (body as Record<string, unknown>).code ??
          (body as Record<string, unknown>).StatusCode,
      )
      expect(result.ok ? '' : result.error).toContain(code)
    }
  })

  it('飞书返回 code 为 0 视为成功', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ code: 0, data: {}, msg: 'success' }),
    )
    const result = await sendWebhook(target('feishu', { secret: 's' }), summary, { fetchImpl })
    expect(result).toEqual({ ok: true, status: 200 })
  })

  it('HTTP 非 2xx、无法解析的返回与网络错误都视为失败', async () => {
    const http500 = vi.fn<typeof fetch>(async () => jsonResponse({ errcode: 0 }, 500))
    expect(await sendWebhook(target('wecom'), summary, { fetchImpl: http500 })).toEqual({
      ok: false,
      status: 500,
      error: 'HTTP 500',
    })

    const html = vi.fn<typeof fetch>(async () => new Response('<html></html>', { status: 200 }))
    const parsed = await sendWebhook(target('wecom'), summary, { fetchImpl: html })
    expect(parsed.ok).toBe(false)

    const network = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } })
    })
    const failed = await sendWebhook(target('wecom'), summary, { fetchImpl: network })
    expect(failed).toEqual({ ok: false, error: '网络错误：fetch failed（ECONNRESET）' })
  })

  it('错误信息中不包含机器人地址里的密钥', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed')
    })
    const result = await sendWebhook(target('wecom'), summary, { fetchImpl })
    expect(result.ok ? '' : result.error).not.toContain('00000000-0000')
  })
})
