import type { Access, FieldAccess } from 'payload'

import { hasRole } from './roles'

/** 线索读取：管理员全部；顾问只能看分配给自己的；编辑与访客不可见 */
export const readLeads: Access = ({ req: { user } }) => {
  if (hasRole(user, 'admin')) return true
  if (user && hasRole(user, 'consultant')) return { assignedTo: { equals: user.id } }
  return false
}

/** 线索更新：同读取范围（顾问只能改自己的线索，且受字段级权限限制） */
export const updateLeads: Access = readLeads

/** 分配顾问、来源、同意记录等字段只有管理员能改 */
export const leadAdminField: FieldAccess = ({ req }) => hasRole(req.user, 'admin')
