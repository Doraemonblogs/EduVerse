import {
  ValidationError,
  validations,
  type CollectionConfig,
  type Field,
  type FieldAccess,
  type FieldHook,
  type TextFieldSingleValidation,
} from 'payload'

import { leadAdminField, readLeads, updateLeads } from '@/access/leads'
import { adminFieldOnly, hasRole, isAdmin } from '@/access/roles'
import { exportLeadsEndpoint } from '@/endpoints/export-leads'
import { canTransition, STATUS_LABELS, type LeadStatus } from '@/lib/lead/status'
import { MAINLAND_PHONE_PATTERN, normalizePhone } from '@/lib/validation/lead'

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

/**
 * 手机号：先执行内置校验（required），再校验大陆号段格式
 * （与前台表单共用 `src/lib/validation/lead.ts` 的 MAINLAND_PHONE_PATTERN，不维护精确号段表，避免误拒新号段）
 */
const validatePhone: TextFieldSingleValidation = (value, options) => {
  const base = validations.text(value, options)
  if (base !== true) return base
  return !value || MAINLAND_PHONE_PATTERN.test(value) ? true : '请输入 11 位中国大陆手机号'
}

/** 后台录入的手机号与前台一致：去掉空格、连字符与 +86 前缀后再校验、入库 */
const normalizePhoneValue: FieldHook = ({ value }) =>
  typeof value === 'string' ? normalizePhone(value) : value

/** 系统写入的字段：任何人（包括管理员）都不能通过后台或 API 修改，只有 overrideAccess 的服务端代码能写 */
const systemOnly: FieldAccess = () => false

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
    components: {
      // 列表页右上角菜单：按当前筛选条件导出 CSV
      listMenuItems: ['@/components/admin/export-leads-button#ExportLeadsButton'],
    },
  },
  endpoints: [exportLeadsEndpoint],
  defaultSort: '-createdAt',
  access: {
    // 前台留资只能通过服务端 Action（overrideAccess）写入，不开放公开的 REST create
    create: isAdmin,
    read: readLeads,
    update: updateLeads,
    delete: isAdmin,
  },
  indexes: [{ fields: ['phone', 'createdAt'] }, { fields: ['client.ip', 'createdAt'] }],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req, operation }) => {
        const now = new Date().toISOString()
        const userId = req.user?.id
        const original = operation === 'update' ? originalDoc : undefined

        // 跟进记录：作者与时间始终由服务端写入；非管理员只能追加，已有记录不可修改或删除。
        // 只要提交里带了 followUps（包括 null、数字等非数组值）就执行：非数组按“没有新增”处理，
        // 否则 Payload 会把这类值当作空数组，直接清空已有记录。
        if ('followUps' in data) {
          type FollowUp = {
            id?: string | null
            content?: string
            author?: unknown
            createdAt?: unknown
          }
          const stored: FollowUp[] = original?.followUps ?? []
          const storedById = new Map(stored.map((row) => [String(row.id), row]))
          const submitted: FollowUp[] = Array.isArray(data.followUps) ? data.followUps : []
          const isNew = (row: FollowUp) => !row.id || !storedById.has(String(row.id))
          const stamp = (row: FollowUp) => ({ ...row, author: userId, createdAt: now })

          data.followUps = hasRole(req.user, 'admin')
            ? submitted.map((row) => {
                const prev = isNew(row) ? undefined : storedById.get(String(row.id))
                return prev
                  ? { ...row, author: prev.author, createdAt: prev.createdAt }
                  : stamp(row)
              })
            : [...stored, ...submitted.filter(isNew).map(stamp)]
        }

        // 状态流转：课程顾问只能向前推进（或标为无效），回退与重新激活只能由管理员操作
        if (original && data.status && data.status !== original.status) {
          const from = original.status as LeadStatus
          const to = data.status as LeadStatus
          if (!canTransition(from, to, hasRole(req.user, 'admin'))) {
            throw new ValidationError({
              collection: 'leads',
              errors: [
                {
                  path: 'status',
                  message: `不能从“${STATUS_LABELS[from]}”改为“${STATUS_LABELS[to]}”，如需回退请联系管理员`,
                },
              ],
            })
          }
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
                  validate: validatePhone,
                  hooks: { beforeValidate: [normalizePhoneValue] },
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
      // 只由推送任务（overrideAccess）写入：后台保存时表单会带上打开页面时的旧记录，
      // 若允许写入会覆盖任务刚记下的结果，导致重试时重复推送
      access: { read: adminFieldOnly, create: systemOnly, update: systemOnly },
      admin: { readOnly: true, position: 'sidebar' },
      fields: [
        { name: 'target', type: 'text', label: '目标' },
        {
          name: 'status',
          type: 'select',
          label: '结果',
          options: [
            { label: '推送成功', value: 'success' },
            { label: '推送失败', value: 'failed' },
          ],
        },
        { name: 'attempts', type: 'number', label: '尝试次数' },
        { name: 'lastError', type: 'text', label: '错误信息' },
        { name: 'at', type: 'date', label: '时间' },
      ],
    },
  ],
}
