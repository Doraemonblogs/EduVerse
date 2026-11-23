import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { imageSource } from '@/lib/media'
import config from '@/payload.config'

import { generatePlaceholder } from '../../scripts/seed/placeholders'

/**
 * 课程数据层（集成）：真实 Payload + 测试库，直接调用查询函数（不经过 Next 缓存）。
 * 重点验证草稿与隐私过滤：从未发布过的草稿会被 depth 填充出来，数据层必须再按发布状态剔除。
 * 测试数据统一用 cd-int 前缀，开始前与结束后都会清理；测试库里已有的其它数据不影响断言。
 */
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => fn,
  revalidateTag: vi.fn(),
}))

const {
  queryCourseCards,
  queryCourseDetail,
  queryCoursePagesSettings,
  queryDisciplineDetail,
  queryPublishedCourseSlugs,
  queryPublishedDisciplineSlugs,
} = await import('@/lib/data/courses')

const PREFIX = 'cd-int'
const DAY = 24 * 60 * 60 * 1000
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString()

let payload: Payload
let disclaimer: string
const ids = {
  media: 0,
  software: 0,
  faq: 0,
  campusPublished: 0,
  campusDraft: 0,
  disciplinePublished: 0,
  disciplineDraft: 0,
  teacherPublished: 0,
  teacherDraft: 0,
  courseA: 0,
  courseB: 0,
  courseNeverPublished: 0,
  courseInDraftDiscipline: 0,
  cohortOpen: 0,
  cohortClosed: 0,
  cohortDraftCampus: 0,
  cohortOnline: 0,
  workVisible: 0,
  workNoConsent: 0,
  workDraft: 0,
}

const DISCIPLINE_SALARY = {
  range: '9,000–16,000 元/月',
  source: '集成测试示例数据',
  statDate: '2026 年 9 月',
  note: '仅用于测试',
}
const COURSE_B_SALARY = {
  range: '12,000–20,000 元/月',
  source: '课程 B 示例数据',
  statDate: '2026 年 10 月',
}

async function cleanup() {
  const like = { like: PREFIX }
  const courses = await payload.find({
    collection: 'courses',
    where: { slug: like },
    depth: 0,
    pagination: false,
    select: {},
  })
  const courseIds = courses.docs.map((c) => c.id)
  if (courseIds.length > 0) {
    await payload.delete({ collection: 'cohorts', where: { course: { in: courseIds } } })
  }
  await payload.delete({ collection: 'works', where: { title: like } })
  await payload.delete({ collection: 'courses', where: { slug: like } })
  await payload.delete({ collection: 'teachers', where: { slug: like } })
  await payload.delete({ collection: 'campuses', where: { slug: like } })
  await payload.delete({ collection: 'disciplines', where: { slug: like } })
  await payload.delete({ collection: 'faqs', where: { question: like } })
  await payload.delete({ collection: 'software', where: { slug: like } })
  await payload.delete({ collection: 'media', where: { alt: like } })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await cleanup()

  // 薪资免责声明是站点设置的必填项；测试库从未写入站点设置时补上
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  if (!settings.salaryDisclaimer) {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: {
        brandName: settings.brandName || '测试品牌',
        hotline: settings.hotline || '400-000-0000',
        salaryDisclaimer: '集成测试免责声明：不作为培训效果承诺。',
      },
    })
  }
  disclaimer = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })).salaryDisclaimer

  const image = await generatePlaceholder(
    { kind: 'art', seed: PREFIX, hue: 200, aspect: '16:9', label: '测试', size: 64 },
    `seed-${PREFIX}`,
  )
  ids.media = (
    await payload.create({
      collection: 'media',
      data: { alt: `${PREFIX} 封面` },
      file: {
        data: image.data,
        mimetype: image.mimetype,
        name: image.filename,
        size: image.data.length,
      },
    })
  ).id
  const cover = ids.media

  ids.software = (
    await payload.create({
      collection: 'software',
      data: { name: 'CdInt Tool', slug: `${PREFIX}-tool`, category: 'modeling' },
    })
  ).id
  ids.faq = (
    await payload.create({
      collection: 'faqs',
      data: { question: `${PREFIX} 零基础可以学吗？`, answer: '可以。', category: 'course' },
    })
  ).id

  const campus = (suffix: string, order: number) => ({
    name: `测试校区 ${suffix}`,
    slug: `${PREFIX}-campus-${suffix}`,
    city: '测试市',
    citySlug: `${PREFIX}-city`,
    address: '测试地址（示例）',
    cover,
    order,
  })
  ids.campusPublished = (
    await payload.create({
      collection: 'campuses',
      data: { ...campus('pub', 900), _status: 'published' },
    })
  ).id
  ids.campusDraft = (
    await payload.create({
      collection: 'campuses',
      draft: true,
      data: { ...campus('draft', 901), _status: 'draft' },
    })
  ).id

  ids.disciplinePublished = (
    await payload.create({
      collection: 'disciplines',
      data: {
        name: '集成测试方向',
        shortName: '测试方向',
        slug: `${PREFIX}-pub`,
        tagline: '用于集成测试',
        cover,
        careerDirections: [{ title: '测试岗位', description: '测试说明' }],
        salaryRef: DISCIPLINE_SALARY,
        order: 900,
        _status: 'published',
      },
    })
  ).id
  ids.disciplineDraft = (
    await payload.create({
      collection: 'disciplines',
      draft: true,
      data: { name: '草稿方向', slug: `${PREFIX}-draft`, cover, _status: 'draft' },
    })
  ).id

  const teacher = (suffix: string) => ({
    name: `测试讲师 ${suffix}`,
    slug: `${PREFIX}-teacher-${suffix}`,
    title: '测试讲师',
    avatar: cover,
    disciplines: [ids.disciplinePublished],
    yearsOfExperience: 6,
    specialties: [{ text: '测试' }],
  })
  ids.teacherPublished = (
    await payload.create({
      collection: 'teachers',
      data: { ...teacher('pub'), _status: 'published' },
    })
  ).id
  ids.teacherDraft = (
    await payload.create({
      collection: 'teachers',
      draft: true,
      data: { ...teacher('draft'), _status: 'draft' },
    })
  ).id

  const course = (suffix: string, order: number) => ({
    title: `测试课程 ${suffix}`,
    slug: `${PREFIX}-${suffix}`,
    discipline: ids.disciplinePublished,
    classType: 'long_term' as const,
    deliveryModes: ['offline' as const, 'online' as const],
    duration: { value: 6, unit: 'month' as const },
    summary: '集成测试课程',
    cover,
    order,
  })
  ids.courseA = (
    await payload.create({
      collection: 'courses',
      data: {
        ...course('a', 1),
        campuses: [ids.campusDraft, ids.campusPublished],
        // 草稿讲师排在前面：既要剔除，也要保持其余讲师的顺序
        teachers: [ids.teacherDraft, ids.teacherPublished],
        faqs: [ids.faq],
        software: [ids.software],
        stages: [{ title: '阶段一', topics: [{ text: '知识点' }] }],
        _status: 'published',
      },
    })
  ).id
  ids.courseB = (
    await payload.create({
      collection: 'courses',
      data: {
        ...course('b', 2),
        classType: 'short_term',
        deliveryModes: ['online'],
        salaryRef: COURSE_B_SALARY,
        _status: 'published',
      },
    })
  ).id
  ids.courseNeverPublished = (
    await payload.create({
      collection: 'courses',
      draft: true,
      data: { ...course('x', 3), _status: 'draft' },
    })
  ).id
  ids.courseInDraftDiscipline = (
    await payload.create({
      collection: 'courses',
      data: { ...course('y', 4), discipline: ids.disciplineDraft, _status: 'published' },
    })
  ).id

  const cohort = (data: Record<string, unknown>) =>
    payload.create({
      collection: 'cohorts',
      data: { course: ids.courseA, mode: 'offline', status: 'enrolling', ...data } as never,
    })
  ids.cohortOpen = (await cohort({ campus: ids.campusPublished, startDate: inDays(10) })).id
  ids.cohortClosed = (
    await cohort({ campus: ids.campusPublished, startDate: inDays(20), status: 'closed' })
  ).id
  ids.cohortDraftCampus = (await cohort({ campus: ids.campusDraft, startDate: inDays(15) })).id
  ids.cohortOnline = (
    await cohort({ mode: 'online', startDate: inDays(30), status: 'upcoming', note: '线上直播' })
  ).id

  const work = (suffix: string) => ({
    title: `${PREFIX} 作品 ${suffix}`,
    author: { displayName: '测试同学', cohortLabel: '2026 届' },
    discipline: ids.disciplinePublished,
    course: ids.courseA,
    cover,
    video: { kind: 'none' as const },
    consentConfirmed: true,
  })
  ids.workVisible = (
    await payload.create({
      collection: 'works',
      data: { ...work('visible'), _status: 'published' },
    })
  ).id
  ids.workNoConsent = (
    await payload.create({
      collection: 'works',
      data: { ...work('no-consent'), _status: 'published' },
    })
  ).id
  // 发布校验要求勾选授权；模拟历史数据 / 绕过校验写入的“已发布但未授权”作品
  await payload.db.updateOne({
    collection: 'works',
    id: ids.workNoConsent,
    data: { consentConfirmed: false },
  })
  ids.workDraft = (
    await payload.create({
      collection: 'works',
      draft: true,
      data: { ...work('draft'), _status: 'draft' },
    })
  ).id
}, 120_000)

afterAll(async () => {
  if (payload) await cleanup()
  await payload?.db.destroy?.()
})

describe('课程列表数据（集成）', () => {
  it('只包含已发布、且所属专业方向已发布的课程，按排序排列', async () => {
    const cards = await queryCourseCards(payload)
    const ours = cards.filter((c) => c.slug.startsWith(PREFIX)).map((c) => c.slug)
    expect(ours).toEqual([`${PREFIX}-a`, `${PREFIX}-b`])
  })

  it('课程卡片只带已发布的校区，开班不含已结束与未发布校区的', async () => {
    const card = (await queryCourseCards(payload)).find((c) => c.id === ids.courseA)!
    expect(card.discipline).toEqual({
      id: ids.disciplinePublished,
      name: '集成测试方向',
      shortName: '测试方向',
      slug: `${PREFIX}-pub`,
    })
    expect(card.campuses.map((c) => c.id)).toEqual([ids.campusPublished])
    expect(card.campuses[0]).toMatchObject({ citySlug: `${PREFIX}-city`, city: '测试市' })
    expect(card.cohorts.map((c) => c.id)).toEqual([ids.cohortOpen, ids.cohortOnline])
    expect(card.cohorts[1]).toMatchObject({ mode: 'online', campus: null, note: '线上直播' })
    expect(card.cover?.src).toMatch(/^\/api\/media\/file\//)
    expect(card.stageTitles).toEqual(['阶段一'])
  })

  it('静态生成的课程 slug 不含草稿课程与草稿专业方向下的课程', async () => {
    const slugs = await queryPublishedCourseSlugs(payload)
    expect(slugs).toEqual(expect.arrayContaining([`${PREFIX}-a`, `${PREFIX}-b`]))
    expect(slugs).not.toContain(`${PREFIX}-x`)
    expect(slugs).not.toContain(`${PREFIX}-y`)
  })
})

describe('课程详情数据（集成）', () => {
  it('从未发布的课程、所属专业方向是草稿的课程都返回 null', async () => {
    expect(await queryCourseDetail(payload, `${PREFIX}-x`)).toBeNull()
    expect(await queryCourseDetail(payload, `${PREFIX}-y`)).toBeNull()
    expect(await queryCourseDetail(payload, `${PREFIX}-missing`)).toBeNull()
  })

  it('讲师只含已发布的，作品只含已发布且已授权的', async () => {
    const detail = (await queryCourseDetail(payload, `${PREFIX}-a`))!
    expect(detail.teachers.map((t) => t.id)).toEqual([ids.teacherPublished])
    expect(detail.teachers[0]).toMatchObject({ yearsOfExperience: 6, specialties: ['测试'] })
    expect(detail.teachers[0]!.avatar?.src).toMatch(/^\/api\/media\/file\//)
    expect(detail.works.map((w) => w.id)).toEqual([ids.workVisible])
    expect(detail.works[0]).toMatchObject({ authorName: '测试同学', cohortLabel: '2026 届' })
    expect(detail.campuses.map((c) => c.id)).toEqual([ids.campusPublished])
    expect(detail.cohorts.map((c) => c.id)).toEqual([ids.cohortOpen, ids.cohortOnline])
  })

  it('FAQ、软件、大纲、首屏大图与分享图', async () => {
    const detail = (await queryCourseDetail(payload, `${PREFIX}-a`))!
    expect(detail.faqs).toEqual([
      { id: ids.faq, question: `${PREFIX} 零基础可以学吗？`, answer: '可以。' },
    ])
    expect(detail.software).toEqual([
      { id: ids.software, name: 'CdInt Tool', category: 'modeling' },
    ])
    expect(detail.stages).toEqual([
      { title: '阶段一', duration: null, goals: null, topics: ['知识点'] },
    ])
    expect(detail.heroImage?.src).toMatch(/^\/api\/media\/file\//)
    // 分享图取封面的 og 尺寸（1200×630 裁切；原图过小没有生成时退回原图）
    const cover = await payload.findByID({ collection: 'media', id: ids.media, depth: 0 })
    expect(detail.shareImage).toEqual(imageSource(cover, 'og'))
  })

  it('课程没有薪资与就业方向时继承专业方向，并附上站点设置的免责声明', async () => {
    const detail = (await queryCourseDetail(payload, `${PREFIX}-a`))!
    expect(detail.salary).toEqual({ ...DISCIPLINE_SALARY, disclaimer })
    expect(detail.careerDirections).toEqual([{ title: '测试岗位', description: '测试说明' }])
  })

  it('课程自己填写了薪资区间时用课程的', async () => {
    const detail = (await queryCourseDetail(payload, `${PREFIX}-b`))!
    expect(detail.salary).toEqual({ ...COURSE_B_SALARY, note: null, disclaimer })
  })

  it('同专业其它课程不含本课程，也不含草稿课程', async () => {
    const a = (await queryCourseDetail(payload, `${PREFIX}-a`))!
    expect(a.related.map((c) => c.slug)).toEqual([`${PREFIX}-b`])
    const b = (await queryCourseDetail(payload, `${PREFIX}-b`))!
    expect(b.related.map((c) => c.slug)).toEqual([`${PREFIX}-a`])
  })
})

describe('专业方向数据（集成）', () => {
  it('草稿专业方向返回 null，也不在 slug 清单里', async () => {
    expect(await queryDisciplineDetail(payload, `${PREFIX}-draft`)).toBeNull()
    const slugs = await queryPublishedDisciplineSlugs(payload)
    expect(slugs).toContain(`${PREFIX}-pub`)
    expect(slugs).not.toContain(`${PREFIX}-draft`)
  })

  it('课程、作品、讲师都只含已发布的；薪资参考带免责声明', async () => {
    const detail = (await queryDisciplineDetail(payload, `${PREFIX}-pub`))!
    expect(detail).toMatchObject({
      id: ids.disciplinePublished,
      name: '集成测试方向',
      shortName: '测试方向',
      tagline: '用于集成测试',
      careerDirections: [{ title: '测试岗位', description: '测试说明' }],
      salary: { ...DISCIPLINE_SALARY, disclaimer },
    })
    expect(detail.courses.map((c) => c.slug)).toEqual([`${PREFIX}-a`, `${PREFIX}-b`])
    expect(detail.works.map((w) => w.id)).toEqual([ids.workVisible])
    expect(detail.teachers.map((t) => t.id)).toEqual([ids.teacherPublished])
    expect(detail.heroImage?.src).toMatch(/^\/api\/media\/file\//)
    const cover = await payload.findByID({ collection: 'media', id: ids.media, depth: 0 })
    expect(detail.shareImage).toEqual(imageSource(cover, 'og'))
  })
})

describe('课程页面设置（集成）', () => {
  it('返回列表、详情侧栏与专业页行动号召的标题', async () => {
    const settings = await queryCoursePagesSettings(payload)
    expect(settings.list.title).toBeTruthy()
    expect(settings.detail.sidebarTitle).toBeTruthy()
    expect(settings.major.ctaTitle).toBeTruthy()
  })
})
