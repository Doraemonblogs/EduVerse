import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Lead, User } from '@/payload-types'
import config from '@/payload.config'

import { toLexical } from '../../scripts/seed/lexical'
import { generatePlaceholder } from '../../scripts/seed/placeholders'

/**
 * 角色权限集成测试：通过 Payload Local API（overrideAccess: false）以真实用户身份调用，
 * 运行在独立的测试数据库上（见 vitest.setup.ts）。
 */
let payload: Payload
let admin: User
let editor: User
let consultantA: User
let consultantB: User
let leadA: Lead
let leadB: Lead

const DOMAIN = 'int-test.eduverse.test'
const PASSWORD = 'Int-Test-Password-1'

const leadData = (name: string, assignedTo?: number) => ({
  name,
  phone: '13800138000',
  intent: 'trial' as const,
  status: 'new' as const,
  assignedTo,
  consent: { agreed: true, policyVersion: 'test', agreedAt: new Date().toISOString() },
})

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  // 测试库独享：清空相关数据，保证用例互不影响
  await payload.delete({ collection: 'leads', where: { id: { exists: true } } })
  await payload.delete({ collection: 'users', where: { id: { exists: true } } })

  // 第一个账号自动成为管理员（即使请求的是其它角色）
  admin = await payload.create({
    collection: 'users',
    data: { email: `admin@${DOMAIN}`, password: PASSWORD, name: '管理员', role: 'consultant' },
  })
  editor = await payload.create({
    collection: 'users',
    data: { email: `editor@${DOMAIN}`, password: PASSWORD, name: '编辑', role: 'editor' },
  })
  consultantA = await payload.create({
    collection: 'users',
    data: { email: `ca@${DOMAIN}`, password: PASSWORD, name: '顾问甲', role: 'consultant' },
  })
  consultantB = await payload.create({
    collection: 'users',
    data: { email: `cb@${DOMAIN}`, password: PASSWORD, name: '顾问乙', role: 'consultant' },
  })
  leadA = await payload.create({ collection: 'leads', data: leadData('线索甲', consultantA.id) })
  leadB = await payload.create({ collection: 'leads', data: leadData('线索乙', consultantB.id) })
  await payload.create({ collection: 'leads', data: leadData('未分配线索') })
})

afterAll(async () => {
  await payload?.db.destroy?.()
})

describe('后台账号', () => {
  it('第一个注册的账号自动成为管理员', () => {
    expect(admin.role).toBe('admin')
  })

  it('非管理员不能修改自己的角色', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: editor.id,
      data: { role: 'admin' },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.role).toBe('editor')
  })

  it('非管理员只能看到自己的账号', async () => {
    const result = await payload.find({ collection: 'users', user: editor, overrideAccess: false })
    expect(result.docs.map((u) => u.id)).toEqual([editor.id])
  })

  it('停用的账号无法登录', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: `inactive@${DOMAIN}`,
        password: PASSWORD,
        name: '停用',
        role: 'editor',
        active: false,
      },
    })
    await expect(
      payload.login({ collection: 'users', data: { email: user.email, password: PASSWORD } }),
    ).rejects.toThrow(/停用/)
  })
})

describe('线索权限', () => {
  it('访客不能直接创建线索（只能走服务端 Action）', async () => {
    await expect(
      payload.create({ collection: 'leads', data: leadData('访客'), overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('内容编辑看不到线索', async () => {
    await expect(
      payload.find({ collection: 'leads', user: editor, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('课程顾问只能看到分配给自己的线索', async () => {
    const result = await payload.find({
      collection: 'leads',
      user: consultantA,
      overrideAccess: false,
    })
    expect(result.docs.map((d) => d.id)).toEqual([leadA.id])
  })

  it('管理员能看到全部线索', async () => {
    const result = await payload.find({ collection: 'leads', user: admin, overrideAccess: false })
    expect(result.totalDocs).toBe(3)
  })

  it('课程顾问不能修改别人的线索', async () => {
    await expect(
      payload.update({
        collection: 'leads',
        id: leadB.id,
        data: { status: 'contacted' },
        user: consultantA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('课程顾问不能改分配人与来源，但能更新状态并自动记录历史', async () => {
    const updated = await payload.update({
      collection: 'leads',
      id: leadA.id,
      data: {
        status: 'contacted',
        assignedTo: consultantB.id,
        source: { pageUrl: '/forged' },
        // 伪造的历史记录会被忽略
        statusHistory: [
          { from: 'new', to: 'enrolled', by: admin.id, at: '2000-01-01T00:00:00.000Z' },
        ],
      },
      user: consultantA,
      overrideAccess: false,
      depth: 0,
    })
    expect(updated.status).toBe('contacted')
    expect(updated.assignedTo).toBe(consultantA.id)
    expect(updated.source?.pageUrl ?? null).toBeNull()
    expect(updated.statusHistory).toHaveLength(1)
    expect(updated.statusHistory?.[0]).toMatchObject({
      from: 'new',
      to: 'contacted',
      by: consultantA.id,
    })
  })

  it('新增跟进记录自动写入记录人与时间', async () => {
    const updated = await payload.update({
      collection: 'leads',
      id: leadA.id,
      data: { followUps: [{ content: '已电话联系，约周六试听' }] },
      user: consultantA,
      overrideAccess: false,
      depth: 0,
    })
    expect(updated.followUps?.[0]).toMatchObject({
      content: '已电话联系，约周六试听',
      author: consultantA.id,
    })
    expect(updated.followUps?.[0]?.createdAt).toBeTruthy()
  })

  it('课程顾问看不到线索的 IP 等设备信息', async () => {
    const lead = await payload.findByID({
      collection: 'leads',
      id: leadA.id,
      user: consultantA,
      overrideAccess: false,
    })
    expect(lead.client).toBeUndefined()
  })
})

describe('内容权限', () => {
  it('内容编辑可以维护内容，课程顾问不行', async () => {
    const category = await payload.create({
      collection: 'article-categories',
      data: { name: '权限测试分类', slug: 'int-test-category' },
      user: editor,
      overrideAccess: false,
    })
    expect(category.id).toBeTruthy()
    await expect(
      payload.create({
        collection: 'article-categories',
        data: { name: '顾问创建', slug: 'int-test-consultant' },
        user: consultantA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await payload.delete({ collection: 'article-categories', id: category.id })
  })

  it('访客只能读到已发布的内容', async () => {
    const block = { blockType: 'richText' as const, content: toLexical([{ p: '测试内容' }]) }
    const slugs = ['int-test-draft', 'int-test-live']
    await payload.delete({ collection: 'pages', where: { slug: { in: slugs } } })
    const draft = await payload.create({
      collection: 'pages',
      draft: true,
      data: { title: '草稿页', slug: 'int-test-draft', layout: [block], _status: 'draft' },
    })
    const live = await payload.create({
      collection: 'pages',
      data: { title: '已发布页', slug: 'int-test-live', layout: [block], _status: 'published' },
    })
    const result = await payload.find({
      collection: 'pages',
      where: { slug: { in: slugs } },
      overrideAccess: false,
    })
    expect(result.docs.map((d) => d.slug)).toEqual(['int-test-live'])
    await payload.delete({ collection: 'pages', where: { id: { in: [draft.id, live.id] } } })
  })

  it('学员作品发布前必须确认已取得授权', async () => {
    await payload.delete({
      collection: 'disciplines',
      where: { slug: { equals: 'int-test-discipline' } },
    })
    const discipline = await payload.create({
      collection: 'disciplines',
      draft: true,
      data: { name: '权限测试方向', slug: 'int-test-discipline', _status: 'draft' },
    })
    const image = await generatePlaceholder(
      { kind: 'art', seed: 'int', hue: 200, aspect: '1:1', label: '测试', size: 64 },
      'seed-int-test',
    )
    const cover = await payload.create({
      collection: 'media',
      data: { alt: '测试封面' },
      file: {
        data: image.data,
        mimetype: image.mimetype,
        name: image.filename,
        size: image.data.length,
      },
    })
    const base = {
      title: '授权测试作品',
      author: { displayName: '测试同学' },
      discipline: discipline.id,
      cover: cover.id,
      video: { kind: 'none' as const },
      _status: 'published' as const,
    }
    await expect(
      payload.create({ collection: 'works', data: { ...base, consentConfirmed: false } }),
    ).rejects.toThrow()
    const work = await payload.create({
      collection: 'works',
      data: { ...base, consentConfirmed: true },
    })
    expect(work._status).toBe('published')

    await payload.delete({ collection: 'works', id: work.id })
    await payload.delete({ collection: 'media', id: cover.id })
    await payload.delete({ collection: 'disciplines', id: discipline.id })
  })
})

describe('留资设置', () => {
  it('群机器人地址只允许对应平台的官方域名', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'lead-settings',
        data: {
          webhooks: [
            {
              name: '恶意',
              platform: 'wecom',
              url: 'https://evil.example.com/hook',
              enabled: true,
            },
          ],
        },
      }),
    ).rejects.toThrow()
  })
})
