import type { Access, FieldAccess } from 'payload'

/**
 * 后台角色：
 * - admin 管理员：全部权限
 * - editor 内容编辑：维护内容与媒体，看不到线索与用户
 * - consultant 课程顾问：只能看、跟进分配给自己的线索
 */
export const ROLE_OPTIONS = [
  { label: '管理员', value: 'admin' },
  { label: '内容编辑', value: 'editor' },
  { label: '课程顾问', value: 'consultant' },
] as const

export type Role = (typeof ROLE_OPTIONS)[number]['value']

type MaybeUser =
  { id?: number | string; role?: string | null; active?: boolean | null } | null | undefined

/** 已停用的账号（active=false）不具备任何角色 */
export function hasRole(user: MaybeUser, ...roles: Role[]): boolean {
  if (!user || user.active === false) return false
  return Boolean(user.role && (roles as string[]).includes(user.role))
}

/** 任何人（包括未登录访客）——用于公开内容的读取 */
export const anyone: Access = () => true

export const isAdmin: Access = ({ req }) => hasRole(req.user, 'admin')

export const isStaffEditor: Access = ({ req }) => hasRole(req.user, 'admin', 'editor')

/**
 * 带草稿的内容：管理员与编辑能看到草稿；访客与顾问只能读已发布的。
 * 注意：Local API 默认 overrideAccess=true，前台数据层必须显式按 _status 过滤。
 */
export const publishedOrEditor: Access = ({ req }) =>
  hasRole(req.user, 'admin', 'editor') ? true : { _status: { equals: 'published' } }

/** 字段级：仅管理员 */
export const adminFieldOnly: FieldAccess = ({ req }) => hasRole(req.user, 'admin')

/** 后台导航：对课程顾问隐藏内容类菜单 */
export const hiddenFromConsultant = ({ user }: { user: MaybeUser }) => hasRole(user, 'consultant')

/** 后台导航：只有管理员能看到 */
export const hiddenFromNonAdmin = ({ user }: { user: MaybeUser }) => !hasRole(user, 'admin')
