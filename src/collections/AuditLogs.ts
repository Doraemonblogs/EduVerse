import type { CollectionConfig } from 'payload'

import { hiddenFromNonAdmin, isAdmin } from '@/access/roles'
import { type AuditLog } from '@/payload-types'

import { ADMIN_GROUPS } from './groups'

/**
 * 写入日志时的操作人快照。user 关联在删除账号后会被数据库置空（ON DELETE SET NULL），
 * 快照保证离职顾问、临时账号被删除后仍能追溯是谁导出的。
 */
export type AuditLogActorSnapshot = Pick<AuditLog, 'userEmail' | 'userName' | 'userRole'>

/** 从当前用户生成操作人快照 */
export function auditLogActor(user: {
  email?: string | null
  name?: string | null
  role?: string | null
}): AuditLogActorSnapshot {
  return { userEmail: user.email ?? null, userName: user.name ?? null, userRole: user.role ?? null }
}

/**
 * 操作日志：记录导出线索等涉及个人信息的敏感操作（谁、何时、多少条、什么条件）。
 * 只能由服务端写入，管理员只读，不可修改或删除。操作人同时记关联与快照（见 AuditLogActorSnapshot）。
 */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: '操作日志', plural: '操作日志' },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'user', 'userEmail', 'count', 'createdAt'],
    group: ADMIN_GROUPS.system,
    hidden: hiddenFromNonAdmin,
    description: '涉及个人信息的敏感操作记录（如导出线索），只读。',
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'action',
      type: 'select',
      label: '操作',
      required: true,
      index: true,
      options: [{ label: '导出线索', value: 'export_leads' }],
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: '操作人',
      index: true,
      admin: { description: '账号被删除后为空，以下方的操作人快照为准' },
    },
    {
      name: 'userEmail',
      type: 'text',
      label: '操作人邮箱（快照）',
      index: true,
      admin: { readOnly: true },
    },
    { name: 'userName', type: 'text', label: '操作人姓名（快照）', admin: { readOnly: true } },
    { name: 'userRole', type: 'text', label: '操作人角色（快照）', admin: { readOnly: true } },
    { name: 'count', type: 'number', label: '涉及条数' },
    {
      name: 'filters',
      type: 'json',
      label: '筛选条件',
      // 只读展示，不用默认的 Monaco 编辑器（会从境外 CDN 加载脚本）
      admin: {
        components: { Field: '@/components/admin/json-readonly-field#JsonReadOnlyField' },
      },
    },
    { name: 'ip', type: 'text', label: 'IP' },
  ],
}
