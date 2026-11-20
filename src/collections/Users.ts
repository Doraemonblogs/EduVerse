import { APIError, type CollectionConfig } from 'payload'

import { adminFieldOnly, hasRole, isAdmin, ROLE_OPTIONS } from '@/access/roles'

import { ADMIN_GROUPS } from './groups'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: '后台用户', plural: '后台用户' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'active'],
    group: ADMIN_GROUPS.system,
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 8 * 60 * 60,
  },
  access: {
    create: isAdmin,
    // 登录失败被锁定的账号只能由管理员解锁
    unlock: isAdmin,
    // 非管理员只能看到、修改自己的账号
    read: ({ req: { user } }) => {
      if (hasRole(user, 'admin')) return true
      return user && user.active !== false ? { id: { equals: user.id } } : false
    },
    update: ({ req: { user } }) => {
      if (hasRole(user, 'admin')) return true
      return user && user.active !== false ? { id: { equals: user.id } } : false
    },
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      // 第一个注册的账号自动成为管理员（首次进入后台时创建）
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req })
          if (totalDocs === 0) return { ...data, role: 'admin', active: true }
        }
        return data
      },
    ],
    afterChange: [
      // 停用账号时立即吊销其全部登录会话（JWT 校验会拒绝不在会话列表中的令牌，刷新令牌也随之失效）
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'update' && previousDoc?.active !== false && doc.active === false) {
          await req.payload.db.updateOne({
            collection: 'users',
            id: doc.id,
            data: { sessions: [] },
            req,
          })
        }
        return doc
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if (user.active === false) {
          throw new APIError('该账号已停用，请联系管理员', 403, undefined, true)
        }
        return user
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', label: '姓名', required: true },
    {
      name: 'role',
      type: 'select',
      label: '角色',
      required: true,
      defaultValue: 'editor',
      options: [...ROLE_OPTIONS],
      saveToJWT: true,
      access: { create: adminFieldOnly, update: adminFieldOnly },
      admin: { position: 'sidebar' },
    },
    { name: 'phone', type: 'text', label: '手机号' },
    {
      name: 'campus',
      type: 'relationship',
      relationTo: 'campuses',
      label: '所属校区',
      admin: {
        description: '课程顾问所属校区（用于线索分配参考）',
        condition: (data) => data?.role === 'consultant',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: '启用',
      defaultValue: true,
      saveToJWT: true,
      access: { create: adminFieldOnly, update: adminFieldOnly },
      admin: { position: 'sidebar', description: '停用后无法登录后台' },
    },
  ],
}
