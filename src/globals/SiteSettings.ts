import type { GlobalConfig } from 'payload'

import { adminFieldOnly, anyone, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { ADMIN_GROUPS } from '@/collections/groups'
import { seoFields } from '@/fields/seo'
import { revalidateGlobal } from '@/hooks/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: '站点设置',
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromConsultant },
  access: { read: anyone, update: isStaffEditor },
  hooks: { afterChange: revalidateGlobal('site-settings') },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '品牌',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'brandName', type: 'text', label: '品牌名称', required: true },
                {
                  name: 'shortName',
                  type: 'text',
                  label: '简称',
                  admin: { description: '如 EduVerse' },
                },
              ],
            },
            {
              name: 'brandDescription',
              type: 'textarea',
              label: '品牌简介',
              admin: { description: '页脚与关于我们等位置使用' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'logo',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Logo（浅色背景用）',
                  admin: { description: '留空时显示文字标' },
                },
                {
                  name: 'logoOnDark',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Logo（深色背景用）',
                },
              ],
            },
          ],
        },
        {
          label: '联系方式',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'hotline', type: 'text', label: '咨询热线', required: true },
                {
                  name: 'workHours',
                  type: 'text',
                  label: '服务时间',
                  admin: { description: '如：9:00–21:00（节假日不休）' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'email', type: 'email', label: '邮箱' },
                { name: 'wechatId', type: 'text', label: '微信号' },
              ],
            },
            {
              name: 'wechatQr',
              type: 'upload',
              relationTo: 'media',
              label: '微信二维码',
              admin: { description: '悬浮栏、页脚、留资成功页展示' },
            },
            { name: 'address', type: 'text', label: '总部地址' },
          ],
        },
        {
          label: '备案信息',
          fields: [
            {
              name: 'icp',
              type: 'group',
              label: 'ICP 备案',
              fields: [
                {
                  name: 'number',
                  type: 'text',
                  label: '备案号',
                  admin: { description: '如：京ICP备00000000号-1' },
                },
                {
                  name: 'link',
                  type: 'text',
                  label: '链接',
                  defaultValue: 'https://beian.miit.gov.cn/',
                },
              ],
            },
            {
              name: 'psb',
              type: 'group',
              label: '公安备案',
              fields: [
                {
                  name: 'number',
                  type: 'text',
                  label: '备案号',
                  admin: { description: '如：京公网安备 11000000000000号' },
                },
                {
                  name: 'code',
                  type: 'text',
                  label: '备案编码',
                  admin: { description: '纯数字编码，用于生成查询链接' },
                  validate: (value: string | null | undefined) =>
                    !value || /^\d{8,20}$/.test(value) ? true : '备案编码应为纯数字',
                },
              ],
            },
          ],
        },
        {
          label: '统计与客服',
          description: '这些设置会向页面注入第三方代码，仅管理员可查看与修改。',
          fields: [
            {
              name: 'baiduTongjiId',
              type: 'text',
              label: '百度统计 ID',
              access: { read: adminFieldOnly, update: adminFieldOnly },
              admin: { description: 'hm.js? 后面的 32 位字符串' },
              validate: (value: string | null | undefined) =>
                !value || /^[a-f0-9]{32}$/i.test(value)
                  ? true
                  : '百度统计 ID 应为 32 位十六进制字符串',
            },
            {
              name: 'baiduSiteVerification',
              type: 'text',
              label: '百度站长验证码',
              access: { read: adminFieldOnly, update: adminFieldOnly },
              admin: { description: '百度搜索资源平台 HTML 标签验证中的 content 值' },
            },
            {
              name: 'customerService',
              type: 'group',
              label: '在线客服（第三方）',
              access: { read: adminFieldOnly, update: adminFieldOnly },
              fields: [
                { name: 'enabled', type: 'checkbox', label: '启用', defaultValue: false },
                {
                  name: 'scriptUrl',
                  type: 'text',
                  label: '客服脚本地址',
                  admin: {
                    description: '第三方客服提供的 https 脚本地址；页面空闲后再加载，避免影响性能',
                  },
                  validate: (value: string | null | undefined) =>
                    !value || /^https:\/\//.test(value) ? true : '必须是 https:// 开头的地址',
                },
                {
                  name: 'chatUrl',
                  type: 'text',
                  label: '客服对话链接',
                  admin: { description: '点击“在线咨询”时打开的链接（脚本不可用时的兜底）' },
                },
              ],
            },
          ],
        },
        {
          label: '默认 SEO',
          fields: [
            {
              name: 'titleTemplate',
              type: 'text',
              label: '标题模板',
              defaultValue: '%s - EduVerse 数艺学院',
              admin: { description: '%s 会替换为页面标题' },
            },
            {
              name: 'defaultSeo',
              type: 'group',
              label: '默认 TDK',
              admin: { description: '页面没有单独设置时使用' },
              fields: seoFields.filter((f) => 'name' in f && f.name !== 'noindex'),
            },
          ],
        },
        {
          label: '合规',
          fields: [
            {
              name: 'salaryDisclaimer',
              type: 'textarea',
              label: '薪资数据免责声明',
              required: true,
              defaultValue:
                '以上薪资数据仅供参考，不作为培训效果承诺。实际收入因个人能力、城市与企业而异。',
            },
            {
              name: 'showStories',
              type: 'checkbox',
              label: '展示学员故事模块',
              defaultValue: true,
              admin: {
                description:
                  '全站总开关。关闭后首页、就业服务等位置的学员故事全部隐藏（广告法第二十四条风险控制）。',
              },
            },
            {
              name: 'privacyPolicyVersion',
              type: 'text',
              label: '隐私政策版本号',
              required: true,
              defaultValue: '2026-11-20',
              admin: { description: '修改隐私政策后更新此版本号，留资记录会保存用户同意时的版本' },
            },
          ],
        },
      ],
    },
  ],
}
