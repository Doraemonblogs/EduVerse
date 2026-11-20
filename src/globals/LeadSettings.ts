import type { FieldHook, GlobalConfig, TextFieldSingleValidation } from 'payload'

import { hiddenFromNonAdmin, isAdmin } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { revalidateGlobal } from '@/hooks/revalidate'

/** 群机器人官方 Webhook 域名：只允许向这三个主机推送（防 SSRF） */
export const WEBHOOK_HOSTS = {
  wecom: 'qyapi.weixin.qq.com',
  feishu: 'open.feishu.cn',
  dingtalk: 'oapi.dingtalk.com',
} as const

export type WebhookPlatform = keyof typeof WEBHOOK_HOSTS

export const WEBHOOK_PLATFORM_OPTIONS: { label: string; value: WebhookPlatform }[] = [
  { label: '企业微信', value: 'wecom' },
  { label: '飞书', value: 'feishu' },
  { label: '钉钉', value: 'dingtalk' },
]

export function isWebhookPlatform(value: unknown): value is WebhookPlatform {
  return typeof value === 'string' && Object.hasOwn(WEBHOOK_HOSTS, value)
}

/**
 * 校验群机器人 Webhook 地址（防 SSRF）：必须是 https、默认端口、不含用户信息，
 * 且主机名与所选平台的官方域名完全一致。
 * 先按原始字符串检查 `https://<官方域名>/` 前缀（排除 @、:端口、相似域名、反斜杠等写法），
 * 再用 URL 解析结果复核，避免不同解析器的差异。推送前应以同样方式再校验一次。
 */
export function validateWebhookUrl(platform: unknown, url: unknown): true | string {
  if (typeof url !== 'string' || !url) return '请填写 Webhook 地址'
  if (!isWebhookPlatform(platform)) return '请先选择推送平台'

  const host = WEBHOOK_HOSTS[platform]
  const platformLabel = WEBHOOK_PLATFORM_OPTIONS.find((o) => o.value === platform)?.label ?? ''
  const error = `地址必须以 https://${host}/ 开头（${platformLabel}官方 Webhook 域名）`

  if (!url.startsWith(`https://${host}/`) || /[\s\\]/.test(url)) return error

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return error
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== host ||
    parsed.port !== '' ||
    parsed.username !== '' ||
    parsed.password !== ''
  ) {
    return error
  }
  return true
}

const validateUrlField: TextFieldSingleValidation = (value, { siblingData }) =>
  validateWebhookUrl((siblingData as { platform?: unknown } | undefined)?.platform, value)

/** 去掉粘贴时带入的首尾空白 */
const trimValue: FieldHook = ({ value }) => (typeof value === 'string' ? value.trim() : value)

export const LeadSettings: GlobalConfig = {
  slug: 'lead-settings',
  label: '留资设置',
  admin: {
    group: ADMIN_GROUPS.settings,
    hidden: hiddenFromNonAdmin,
    description: '留资表单的推送、防刷与提示文案。包含机器人密钥，仅管理员可查看与修改。',
  },
  access: { read: isAdmin, update: isAdmin },
  hooks: { afterChange: revalidateGlobal('lead-settings') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '群机器人推送',
          description: '新线索提交后推送到企业微信 / 飞书 / 钉钉群。',
          fields: [
            {
              name: 'webhooks',
              type: 'array',
              label: '群机器人',
              labels: { singular: '机器人', plural: '群机器人' },
              maxRows: 10,
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                      label: '名称',
                      required: true,
                      admin: { description: '便于识别，如：北京校区顾问群' },
                    },
                    {
                      name: 'platform',
                      type: 'select',
                      label: '平台',
                      required: true,
                      defaultValue: 'wecom',
                      options: WEBHOOK_PLATFORM_OPTIONS,
                    },
                  ],
                },
                {
                  name: 'url',
                  type: 'text',
                  label: 'Webhook 地址',
                  required: true,
                  validate: validateUrlField,
                  hooks: { beforeValidate: [trimValue] },
                  admin: {
                    description: `在群设置 → 群机器人中复制。仅允许 https 官方域名：企业微信 ${WEBHOOK_HOSTS.wecom}、飞书 ${WEBHOOK_HOSTS.feishu}、钉钉 ${WEBHOOK_HOSTS.dingtalk}`,
                  },
                },
                {
                  name: 'secret',
                  type: 'text',
                  label: '加签密钥',
                  hooks: { beforeValidate: [trimValue] },
                  admin: {
                    condition: (_, siblingData) => siblingData?.platform !== 'wecom',
                    description: '飞书「签名校验」或钉钉「加签」生成的密钥；未开启可留空',
                  },
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'enabled', type: 'checkbox', label: '启用', defaultValue: true },
                    {
                      name: 'maskPhone',
                      type: 'checkbox',
                      label: '手机号脱敏',
                      defaultValue: true,
                      admin: { description: '推送时手机号脱敏，如 138****1234' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: '防刷',
          description: '超出限制的提交会被拒绝并提示稍后再试；重复线索仍会入库并标记。',
          fields: [
            {
              name: 'rateLimits',
              type: 'group',
              label: '频率限制',
              admin: {
                description:
                  'IP 阈值宜宽松（公司、校园网常共用出口 IP，避免误伤），手机号阈值宜严格。',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'ipPer10Min',
                      type: 'number',
                      label: '同一 IP 每 10 分钟最多提交',
                      required: true,
                      defaultValue: 5,
                      min: 1,
                    },
                    {
                      name: 'ipPerDay',
                      type: 'number',
                      label: '同一 IP 每天最多提交',
                      required: true,
                      defaultValue: 30,
                      min: 1,
                    },
                    {
                      name: 'phonePerDay',
                      type: 'number',
                      label: '同一手机号每天最多提交',
                      required: true,
                      defaultValue: 3,
                      min: 1,
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'duplicateWindowDays',
                      type: 'number',
                      label: '重复线索判定窗口（天）',
                      required: true,
                      defaultValue: 30,
                      min: 1,
                      admin: { description: '该天数内同一手机号再次提交，标记为重复线索' },
                    },
                    {
                      name: 'minFillSeconds',
                      type: 'number',
                      label: '最短填写时间（秒）',
                      required: true,
                      defaultValue: 2,
                      min: 0,
                      admin: {
                        description: '从打开表单到提交少于该时间视为机器提交；0 表示不检查',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: '表单与提示',
          fields: [
            {
              name: 'cityOptions',
              type: 'array',
              label: '城市选项',
              labels: { singular: '城市', plural: '城市选项' },
              admin: { description: '留资表单“所在城市”的下拉选项；留空则改为手动填写' },
              fields: [{ name: 'name', type: 'text', label: '城市', required: true }],
            },
            {
              name: 'successTitle',
              type: 'text',
              label: '提交成功标题',
              required: true,
              defaultValue: '提交成功',
            },
            {
              name: 'successMessage',
              type: 'textarea',
              label: '提交成功说明',
              required: true,
              defaultValue: '课程顾问会在 1 个工作日内与你联系。你也可以添加微信，先领取课程资料。',
            },
            {
              name: 'wechatQr',
              type: 'upload',
              relationTo: 'media',
              label: '成功页微信二维码',
              admin: { description: '留空则使用站点设置中的微信二维码' },
            },
          ],
        },
      ],
    },
  ],
}
