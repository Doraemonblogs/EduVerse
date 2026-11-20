import type { CollectionConfig, Field } from 'payload'

import { leadAdminField, readLeads, updateLeads } from '@/access/leads'
import { adminFieldOnly, hasRole, isAdmin } from '@/access/roles'

import { ADMIN_GROUPS } from './groups'

export const LEAD_STATUS_OPTIONS = [
  { label: '新线索', value: 'new' },
  { label: '已联系', value: 'contacted' },
  { label: '已到访', value: 'visited' },
  { label: '已报名', value: 'enrolled' },
  { label: '无效', value: 'invalid' },
]

export const LEAD_INTENT_OPTIONS = [
  { label: '预约试听', value: 'trial' },
  { label: '咨询学费', value: 'tuition' },
  { label: '领取资料', value: 'materials' },
  { label: '职业测试', value: 'quiz' },
  { label: '教程解锁', value: 'tutorial' },
  { label: '在线咨询', value: 'consult' },
]

/** 中国大陆手机号：1 开头，第二位 3–9，共 11 位（不维护精确号段表，避免误拒新号段） */
export const MAINLAND_PHONE_PATTERN = /^1[3-9]\d{9}$/

/** 系统写入、后台只读的字段（来源、同意记录等） */
const readOnly = (field: Field): Field =>
  ({
    ...field,
    access: { create: leadAdminField, update: leadAdminField },
    admin: { ...('admin' in field ? field.admin : {}), readOnly: true },
  }) as Field

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: '线索', plural: '线索' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'intent', 'status', 'assignedTo', 'createdAt'],
    listSearchableFields: ['name', 'phone'],
    group: ADMIN_GROUPS.leads,
    hidden: ({ user }) => !hasRole(user, 'admin', 'consultant'),
    description: '访客在前台提交的留资。课程顾问只能看到分配给自己的线索。',
  },
  defaultSort: '-createdAt',
  access: {
    // 前台留资只能通过服务端 Action（overrideAccess）写入，不开放公开的 REST create
    create: isAdmin,
    read: readLeads,
    update: updateLeads,
    delete: isAdmin,
  },
  indexes: [{ fields: ['phone', 'createdAt'] }],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req, operation }) => {
        const now = new Date().toISOString()
        const userId = req.user?.id
        const original = operation === 'update' ? originalDoc : undefined

        // 跟进记录：已有条目保留原作者与时间（防止通过接口篡改），新条目自动写入当前用户与时间
        if (Array.isArray(data.followUps)) {
          const existing = new Map<string, { author?: unknown; createdAt?: unknown }>(
            (original?.followUps ?? []).map(
              (item: { id?: string; author?: unknown; createdAt?: unknown }) => [
                String(item.id),
                item,
              ],
            ),
          )
          data.followUps = data.followUps.map((item: Record<string, unknown>) => {
            const prev = item.id ? existing.get(String(item.id)) : undefined
            return prev
              ? { ...item, author: prev.author, createdAt: prev.createdAt }
              : { ...item, author: userId, createdAt: now }
          })
        }

        // 状态变更历史：始终以数据库中的记录为准，忽略提交的值，状态变化时追加一条
        const history = [...(original?.statusHistory ?? [])]
        if (original && data.status && data.status !== original.status) {
          history.push({ from: original.status, to: data.status, by: userId, at: now })
        }
        data.statusHistory = history
        return data
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '线索信息',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'name', type: 'text', label: '姓名', required: true, maxLength: 30 },
                {
                  name: 'phone',
                  type: 'text',
                  label: '手机号',
                  required: true,
                  index: true,
                  validate: (value: string | null | undefined) =>
                    !value || MAINLAND_PHONE_PATTERN.test(value)
                      ? true
                      : '请输入 11 位中国大陆手机号',
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'discipline',
                  type: 'relationship',
                  relationTo: 'disciplines',
                  label: '意向专业',
                },
                { name: 'city', type: 'text', label: '所在城市', maxLength: 30 },
              ],
            },
            {
              name: 'intent',
              type: 'select',
              label: '意向类型',
              required: true,
              defaultValue: 'trial',
              options: LEAD_INTENT_OPTIONS,
            },
            { name: 'message', type: 'textarea', label: '留言', maxLength: 500 },
          ],
        },
        {
          label: '跟进',
          fields: [
            {
              name: 'followUps',
              type: 'array',
              label: '跟进记录',
              labels: { singular: '跟进', plural: '跟进记录' },
              fields: [
                { name: 'content', type: 'textarea', label: '跟进内容', required: true },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'author',
                      type: 'relationship',
                      relationTo: 'users',
                      label: '记录人',
                      admin: { readOnly: true },
                    },
                    { name: 'createdAt', type: 'date', label: '时间', admin: { readOnly: true } },
                  ],
                },
              ],
            },
            {
              name: 'statusHistory',
              type: 'array',
              label: '状态变更记录',
              admin: { readOnly: true },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'from', type: 'select', label: '原状态', options: LEAD_STATUS_OPTIONS },
                    { name: 'to', type: 'select', label: '新状态', options: LEAD_STATUS_OPTIONS },
                    { name: 'by', type: 'relationship', relationTo: 'users', label: '操作人' },
                    { name: 'at', type: 'date', label: '时间' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: '来源',
          fields: [
            readOnly({
              name: 'source',
              type: 'group',
              label: '来源',
              fields: [
                { name: 'pageUrl', type: 'text', label: '提交页面' },
                {
                  name: 'position',
                  type: 'text',
                  label: '按钮位置',
                  admin: { description: '如 home_hero、course_sticky' },
                },
                { name: 'landingUrl', type: 'text', label: '首次落地页' },
                { name: 'referrer', type: 'text', label: '来源网址（referrer）' },
                {
                  type: 'row',
                  fields: [
                    { name: 'utmSource', type: 'text', label: 'utm_source' },
                    { name: 'utmMedium', type: 'text', label: 'utm_medium' },
                    { name: 'utmCampaign', type: 'text', label: 'utm_campaign' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'utmTerm', type: 'text', label: 'utm_term' },
                    { name: 'utmContent', type: 'text', label: 'utm_content' },
                  ],
                },
              ],
            }),
            readOnly({
              name: 'context',
              type: 'group',
              label: '上下文',
              fields: [
                { name: 'course', type: 'relationship', relationTo: 'courses', label: '相关课程' },
                {
                  name: 'tutorial',
                  type: 'relationship',
                  relationTo: 'tutorials',
                  label: '相关教程',
                },
                { name: 'quizResult', type: 'json', label: '职业测试结果' },
              ],
            }),
            {
              ...readOnly({
                name: 'client',
                type: 'group',
                label: '客户端',
                fields: [
                  { name: 'ip', type: 'text', label: 'IP', index: true },
                  { name: 'userAgent', type: 'text', label: 'User-Agent' },
                ],
              }),
              // IP 与设备信息仅管理员可见（个人信息最小化）
              access: { read: adminFieldOnly, create: leadAdminField, update: leadAdminField },
            } as Field,
            readOnly({
              name: 'consent',
              type: 'group',
              label: '隐私政策同意记录',
              fields: [
                { name: 'agreed', type: 'checkbox', label: '已同意', defaultValue: false },
                { name: 'policyVersion', type: 'text', label: '隐私政策版本' },
                { name: 'agreedAt', type: 'date', label: '同意时间' },
              ],
            }),
          ],
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: '状态',
      required: true,
      defaultValue: 'new',
      index: true,
      options: LEAD_STATUS_OPTIONS,
      admin: { position: 'sidebar' },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      label: '负责顾问',
      index: true,
      filterOptions: { role: { equals: 'consultant' } },
      access: { create: leadAdminField, update: leadAdminField },
      admin: { position: 'sidebar' },
    },
    readOnly({
      name: 'isDuplicate',
      type: 'checkbox',
      label: '重复线索',
      defaultValue: false,
      admin: { position: 'sidebar', description: '30 天内同一手机号再次提交' },
    }),
    readOnly({
      name: 'duplicateOf',
      type: 'relationship',
      relationTo: 'leads',
      label: '原线索',
      admin: { position: 'sidebar' },
    }),
    {
      name: 'webhookDeliveries',
      type: 'array',
      label: '群机器人推送记录',
      access: { read: adminFieldOnly, create: leadAdminField, update: leadAdminField },
      admin: { readOnly: true, position: 'sidebar' },
      fields: [
        { name: 'target', type: 'text', label: '目标' },
        { name: 'status', type: 'text', label: '结果' },
        { name: 'attempts', type: 'number', label: '尝试次数' },
        { name: 'lastError', type: 'text', label: '错误信息' },
        { name: 'at', type: 'date', label: '时间' },
      ],
    },
  ],
}
