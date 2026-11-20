import { existsSync } from 'node:fs'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

import { runSeed, type SeedSummary } from '../../scripts/seed/index'

/**
 * 种子脚本集成测试：在测试库上完整跑两遍（验证“一键重置”可重复执行），并检查关键关联。
 * 用 SEED_IMAGE_SCALE 缩小占位图以加速。
 */
let payload: Payload
let first: SeedSummary
let second: SeedSummary

beforeAll(async () => {
  process.env.SEED_IMAGE_SCALE = '0.12'
  payload = await getPayload({ config: await config })
  first = await runSeed(payload)
  second = await runSeed(payload)
}, 300_000)

afterAll(async () => {
  await payload?.db.destroy?.()
})

describe('种子数据（集成）', () => {
  it('测试使用独立的媒体目录，不会覆盖开发环境的 media/', () => {
    expect(path.resolve(process.env.MEDIA_DIR ?? '')).not.toBe(path.resolve(process.cwd(), 'media'))
  })

  it('媒体文件写入了测试媒体目录', async () => {
    const { docs } = await payload.find({ collection: 'media', limit: 1 })
    expect(existsSync(path.join(process.env.MEDIA_DIR!, docs[0]!.filename!))).toBe(true)
  })

  it('满足 PRD 要求的数量', () => {
    expect(second.counts).toMatchObject({
      disciplines: 8,
      courses: 24,
      works: 60,
      teachers: 12,
      campuses: 6,
      articles: 30,
      partners: 20,
      'quiz-questions': 10,
    })
  })

  it('重复执行结果一致，不会累积重复数据', () => {
    expect(second.counts).toEqual(first.counts)
  })

  it('内容全部为已发布状态，作品均已确认授权', async () => {
    const drafts = await payload.count({
      collection: 'courses',
      where: { _status: { not_equals: 'published' } },
    })
    expect(drafts.totalDocs).toBe(0)
    const unconsented = await payload.count({
      collection: 'works',
      where: { consentConfirmed: { not_equals: true } },
    })
    expect(unconsented.totalDocs).toBe(0)
  })

  it('课程关联了专业方向、讲师、开班计划与常见问题', async () => {
    const { docs } = await payload.find({
      collection: 'courses',
      where: { slug: { equals: '3d-animation-career' } },
      depth: 1,
    })
    const course = docs[0]!
    expect(typeof course.discipline === 'object' && course.discipline?.slug).toBe('3d-animation')
    expect(course.teachers?.length).toBeGreaterThan(0)
    expect(course.faqs?.length).toBeGreaterThan(0)
    expect(course.cohorts?.docs?.length).toBeGreaterThan(0)
    expect(course.works?.docs?.length).toBeGreaterThan(0)
  })

  it('全局配置已写入（站点设置、导航、首页）', async () => {
    const settings = await payload.findGlobal({ slug: 'site-settings' })
    expect(settings.brandName).toBe('EduVerse 数艺学院')
    expect(settings.salaryDisclaimer).toContain('不作为培训效果承诺')
    const nav = await payload.findGlobal({ slug: 'navigation' })
    expect(nav.items?.some((i) => i.type === 'course_menu')).toBe(true)
  })

  it('演示线索分配给了课程顾问', async () => {
    const consultant = await payload.find({
      collection: 'users',
      where: { email: { equals: 'consultant.bj@seed.eduverse.test' } },
    })
    const leads = await payload.count({
      collection: 'leads',
      where: { assignedTo: { equals: consultant.docs[0]!.id } },
    })
    expect(leads.totalDocs).toBeGreaterThan(0)
  })
})
