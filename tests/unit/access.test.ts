import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { readLeads } from '@/access/leads'
import {
  adminFieldOnly,
  hasRole,
  hiddenFromConsultant,
  hiddenFromNonAdmin,
  isAdmin,
  isStaffEditor,
  publishedOrEditor,
} from '@/access/roles'

type FakeUser = { id: number; role: string } | null

const req = (user: FakeUser) => ({ req: { user } as unknown as PayloadRequest })
const admin = { id: 1, role: 'admin' }
const editor = { id: 2, role: 'editor' }
const consultant = { id: 3, role: 'consultant' }

describe('角色判断', () => {
  it('hasRole 支持多个角色，未登录为 false', () => {
    expect(hasRole(admin, 'admin')).toBe(true)
    expect(hasRole(editor, 'admin', 'editor')).toBe(true)
    expect(hasRole(consultant, 'admin', 'editor')).toBe(false)
    expect(hasRole(null, 'admin')).toBe(false)
    expect(hasRole({ id: 9, role: 'unknown' }, 'admin')).toBe(false)
  })
})

describe('集合级访问控制', () => {
  it('isAdmin 只放行管理员', () => {
    expect(isAdmin(req(admin))).toBe(true)
    expect(isAdmin(req(editor))).toBe(false)
    expect(isAdmin(req(null))).toBe(false)
  })

  it('isStaffEditor 放行管理员与编辑，不放行顾问与访客', () => {
    expect(isStaffEditor(req(admin))).toBe(true)
    expect(isStaffEditor(req(editor))).toBe(true)
    expect(isStaffEditor(req(consultant))).toBe(false)
    expect(isStaffEditor(req(null))).toBe(false)
  })

  it('publishedOrEditor：编辑可见草稿，访客与顾问只能看已发布', () => {
    const publishedOnly = { _status: { equals: 'published' } }
    expect(publishedOrEditor(req(admin))).toBe(true)
    expect(publishedOrEditor(req(editor))).toBe(true)
    expect(publishedOrEditor(req(consultant))).toEqual(publishedOnly)
    expect(publishedOrEditor(req(null))).toEqual(publishedOnly)
  })
})

describe('线索访问控制', () => {
  it('管理员看全部，顾问只看分配给自己的，编辑与访客不可见', () => {
    expect(readLeads(req(admin))).toBe(true)
    expect(readLeads(req(consultant))).toEqual({ assignedTo: { equals: 3 } })
    expect(readLeads(req(editor))).toBe(false)
    expect(readLeads(req(null))).toBe(false)
  })
})

describe('字段级与后台菜单', () => {
  it('adminFieldOnly 只放行管理员', () => {
    expect(adminFieldOnly(req(admin) as never)).toBe(true)
    expect(adminFieldOnly(req(editor) as never)).toBe(false)
  })

  it('顾问看不到内容菜单，非管理员看不到系统设置菜单', () => {
    expect(hiddenFromConsultant({ user: consultant })).toBe(true)
    expect(hiddenFromConsultant({ user: editor })).toBe(false)
    expect(hiddenFromNonAdmin({ user: editor })).toBe(true)
    expect(hiddenFromNonAdmin({ user: admin })).toBe(false)
  })
})
