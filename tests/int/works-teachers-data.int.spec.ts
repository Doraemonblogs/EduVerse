import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { docHref } from '@/components/common/rich-text'
import config from '@/payload.config'

import { generatePlaceholder } from '../../scripts/seed/placeholders'

/**
 * 作品与师资数据层（集成）：真实 Payload + 测试库，直接调用查询函数（不经过 Next 缓存）。
 * 重点验证草稿、授权与隐私过滤：从未发布过的草稿会被 depth 填充出来，数据层必须再按发布状态剔除；
 * 未确认授权的作品不出现在任何地方；课程只在可访问时给出链接；视频地址不在白名单时当作无视频。
 * 测试数据统一用 wt-int 前缀，开始前与结束后都会清理；测试库里已有的其它数据不影响断言。
 */
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => fn,
  revalidateTag: vi.fn(),
}))

const {
  findWorkCards,
  queryPublishedWorkIds,
  queryWorkDetail,
  queryWorkList,
  queryWorkPagesSettings,
} = await import('@/lib/data/works')
const {
  queryPublishedTeacherSlugs,
  queryTeacherDetail,
  queryTeacherList,
  queryTeacherPagesSettings,
} = await import('@/lib/data/teachers')

const PREFIX = 'wt-int'
const DAY = 24 * 60 * 60 * 1000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString()
const EMBED_URL = 'https://player.bilibili.com/player.html?bvid=BV1ED00000t1'

let payload: Payload
const ids = {
  media: 0,
  softwareA: 0,
  softwareB: 0,
  campusPublished: 0,
  campusDraft: 0,
  disciplinePublished: 0,
  disciplineDraft: 0,
  teacher: 0,
  teacherDraftCampus: 0,
  teacherDraft: 0,
  course: 0,
  courseNeverPublished: 0,
  courseInDraftDiscipline: 0,
  /** 同课程、有图集与外部播放器视频 */
  workMain: 0,
  /** 同课程 */
  workSameCourse: 0,
  /** 同专业方向、没有课程 */
  workSameDiscipline: 0,
  /** 与 workTieHigh 发布时间相同（ID 较小） */
  workTieLow: 0,
  workTieHigh: 0,
  /** 课程的专业方向是草稿 → 课程不可访问；作品自己的专业方向也是草稿 */
  workDraftDiscipline: 0,
  /** 视频地址不在白名单（绕过校验写入）、课程从未发布 */
  workBadVideo: 0,
  workNoConsent: 0,
  workDraft: 0,
  /** 限量查询场景：专业方向、课程（授课讲师为 teacherDraftCampus） */
  disciplineLimit: 0,
  courseLimit: 0,
}

/** 限量查询场景的作品：有发布时间的（从新到旧）与发布时间被清空的 */
const limitWorks = { dated: [] as number[], undated: [] as number[] }
/** 有发布时间的件数：比数量上限（8）多 1，没有发布时间的 2 件 */
const LIMIT_DATED = 9
const LIMIT_UNDATED = 2

const base = { direction: 'ltr' as const, format: '' as const, indent: 0, version: 1 }

const text = (value: string) => ({
  type: 'text',
  text: value,
  format: 0,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

const docLink = (relationTo: 'courses' | 'works' | 'campuses', id: number, label: string) => ({
  ...base,
  type: 'link',
  version: 3,
  fields: { linkType: 'internal', newTab: false, doc: { relationTo, value: id } },
  children: [text(label)],
})

const paragraph = (children: unknown[]) => ({
  ...base,
  type: 'paragraph',
  textFormat: 0,
  textStyle: '',
  children,
})

/**
 * 讲师简介：链接到可访问的课程、专业方向是草稿的课程，已授权的作品、已发布但未确认授权的作品，
 * 已发布 / 草稿校区，以及一个关联已发布校区的关联块（作品建好后再写入）
 */
function bio() {
  return {
    root: {
      ...base,
      type: 'root',
      children: [
        paragraph([
          text('主讲：'),
          docLink('courses', ids.course, '可访问的课程'),
          text('、'),
          docLink('courses', ids.courseInDraftDiscipline, '已下线方向的课程'),
        ]),
        paragraph([
          text('指导作品：'),
          docLink('works', ids.workMain, '已授权的作品'),
          text('、'),
          docLink('works', ids.workNoConsent, '未授权的作品'),
        ]),
        paragraph([
          text('常驻：'),
          docLink('campuses', ids.campusPublished, '已发布的校区'),
          text('、'),
          docLink('campuses', ids.campusDraft, '草稿校区'),
        ]),
        {
          type: 'relationship',
          version: 2,
          format: '',
          relationTo: 'campuses',
          value: ids.campusPublished,
        },
      ],
    },
  }
}

/** 简介里全部关联块（顶层 relationship 节点）前台渲染出的地址（docHref；null 表示不渲染） */
function relationshipHrefs(value: unknown): (string | null)[] {
  const children = (value as { root?: { children?: unknown[] } } | null)?.root?.children ?? []
  return children
    .map((node) => node as { type?: string; relationTo?: string; value?: unknown })
    .filter((node) => node.type === 'relationship')
    .map((node) => (node.relationTo ? docHref(node.relationTo, node.value) : null))
}

/** 简介里全部站内链接：链接文字 → 前台渲染出的地址（docHref；null 表示只渲染文字） */
function linkHrefs(value: unknown): Record<string, string | null> {
  const result: Record<string, string | null> = {}
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const n = node as {
      type?: string
      children?: unknown[]
      fields?: { doc?: { relationTo?: string; value?: unknown } }
    }
    if (n.type === 'link') {
      const label = (n.children as { text?: string }[] | undefined)?.map((c) => c.text).join('')
      const doc = n.fields?.doc
      result[label ?? ''] = doc?.relationTo ? docHref(doc.relationTo, doc.value) : null
    }
    for (const child of n.children ?? []) walk(child)
  }
  walk((value as { root?: unknown } | null)?.root)
  return result
}

async function cleanup() {
  const like = { like: PREFIX }
  await payload.delete({ collection: 'works', where: { title: like } })
  await payload.delete({ collection: 'courses', where: { slug: like } })
  await payload.delete({ collection: 'teachers', where: { slug: like } })
  await payload.delete({ collection: 'campuses', where: { slug: like } })
  await payload.delete({ collection: 'disciplines', where: { slug: like } })
  await payload.delete({ collection: 'software', where: { slug: like } })
  await payload.delete({ collection: 'media', where: { alt: like } })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await cleanup()

  const image = await generatePlaceholder(
    { kind: 'art', seed: PREFIX, hue: 30, aspect: '3:4', label: '测试', size: 64 },
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

  ids.softwareA = (
    await payload.create({
      collection: 'software',
      data: { name: 'WtInt Alpha', slug: `${PREFIX}-alpha`, category: 'modeling', order: 901 },
    })
  ).id
  ids.softwareB = (
    await payload.create({
      collection: 'software',
      data: { name: 'WtInt Beta', slug: `${PREFIX}-beta`, category: 'rendering', order: 902 },
    })
  ).id

  const campus = (suffix: string) => ({
    name: `作品测试校区 ${suffix}`,
    slug: `${PREFIX}-campus-${suffix}`,
    city: '测试市',
    citySlug: `${PREFIX}-city`,
    address: '测试地址（示例）',
    cover,
    order: 900,
  })
  ids.campusPublished = (
    await payload.create({
      collection: 'campuses',
      data: { ...campus('pub'), _status: 'published' },
    })
  ).id
  ids.campusDraft = (
    await payload.create({
      collection: 'campuses',
      draft: true,
      data: { ...campus('draft'), _status: 'draft' },
    })
  ).id

  ids.disciplinePublished = (
    await payload.create({
      collection: 'disciplines',
      data: {
        name: '作品测试方向',
        shortName: '作品测试',
        slug: `${PREFIX}-pub`,
        cover,
        order: 950,
        _status: 'published',
      },
    })
  ).id
  ids.disciplineDraft = (
    await payload.create({
      collection: 'disciplines',
      draft: true,
      data: { name: '作品草稿方向', slug: `${PREFIX}-draft`, cover, _status: 'draft' },
    })
  ).id

  const teacher = (suffix: string) => ({
    name: `作品测试讲师 ${suffix}`,
    slug: `${PREFIX}-teacher-${suffix}`,
    title: '测试讲师',
    avatar: cover,
    // 草稿专业方向排在前面：既要剔除，也要保持其余方向的顺序
    disciplines: [ids.disciplineDraft, ids.disciplinePublished],
    yearsOfExperience: 9,
    specialties: [{ text: '角色绑定' }],
    experience: [
      { period: '2016–2020', org: '某动画工作室（虚构）', role: '动画师' },
      { org: '某游戏公司（虚构）', role: '角色美术' },
    ],
    order: 900,
  })
  ids.teacher = (
    await payload.create({
      collection: 'teachers',
      data: { ...teacher('pub'), campus: ids.campusPublished, _status: 'published' },
    })
  ).id
  ids.teacherDraftCampus = (
    await payload.create({
      collection: 'teachers',
      data: { ...teacher('draft-campus'), campus: ids.campusDraft, _status: 'published' },
    })
  ).id
  ids.teacherDraft = (
    await payload.create({
      collection: 'teachers',
      draft: true,
      data: { ...teacher('draft'), _status: 'draft' },
    })
  ).id

  const course = (suffix: string) => ({
    title: `作品测试课程 ${suffix}`,
    slug: `${PREFIX}-${suffix}`,
    discipline: ids.disciplinePublished,
    classType: 'long_term' as const,
    deliveryModes: ['online' as const],
    duration: { value: 3, unit: 'month' as const },
    summary: '集成测试课程',
    cover,
    teachers: [ids.teacher],
    order: 900,
  })
  ids.course = (
    await payload.create({
      collection: 'courses',
      data: { ...course('a'), teachers: [ids.teacherDraft, ids.teacher], _status: 'published' },
    })
  ).id
  ids.courseNeverPublished = (
    await payload.create({
      collection: 'courses',
      draft: true,
      data: { ...course('x'), _status: 'draft' },
    })
  ).id
  ids.courseInDraftDiscipline = (
    await payload.create({
      collection: 'courses',
      data: { ...course('y'), discipline: ids.disciplineDraft, _status: 'published' },
    })
  ).id

  const work = (suffix: string, publishedAt: string) => ({
    title: `${PREFIX} 作品 ${suffix}`,
    author: { displayName: `测试同学 ${suffix}`, cohortLabel: '2026 届' },
    discipline: ids.disciplinePublished,
    course: ids.course,
    cover,
    video: { kind: 'none' as const },
    consentConfirmed: true,
    publishedAt,
  })
  const create = async (data: ReturnType<typeof work>, extra: Record<string, unknown> = {}) =>
    (
      await payload.create({
        collection: 'works',
        data: { ...data, ...extra, _status: 'published' } as never,
      })
    ).id

  ids.workMain = await create(work('main', daysAgo(1)), {
    software: [ids.softwareB, ids.softwareA],
    featured: true,
    gallery: [
      { image: cover, caption: '过程稿' },
      { image: cover, caption: '细节' },
      { image: cover, caption: ' ' },
    ],
    video: { kind: 'embed', embedUrl: EMBED_URL },
    description: '  作品说明  ',
  })
  ids.workSameCourse = await create(work('same-course', daysAgo(2)))
  ids.workSameDiscipline = await create(work('same-discipline', daysAgo(3)), { course: null })
  const tie = daysAgo(4)
  ids.workTieLow = await create(work('tie-low', tie), { course: null })
  ids.workTieHigh = await create(work('tie-high', tie), { course: null })
  ids.workDraftDiscipline = await create(work('draft-discipline', daysAgo(5)), {
    discipline: ids.disciplineDraft,
    course: ids.courseInDraftDiscipline,
  })
  ids.workBadVideo = await create(work('bad-video', daysAgo(6)), {
    course: ids.courseNeverPublished,
  })
  // 绕过后台校验写入不在白名单的播放器地址（模拟历史数据）
  await payload.db.updateOne({
    collection: 'works',
    id: ids.workBadVideo,
    data: { video: { kind: 'embed', embedUrl: 'https://evil.example.com/player.html' } },
  })
  ids.workNoConsent = await create(work('no-consent', daysAgo(0.5)))
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
      data: { ...work('draft', daysAgo(0.2)), _status: 'draft' },
    })
  ).id

  // 限量查询场景：独立的专业方向与课程（不影响上面作品的相关作品断言）。
  // 有发布时间的 9 件（比上限多 1）+ 发布时间被清空的 2 件（后台清空日期会存成 null）
  ids.disciplineLimit = (
    await payload.create({
      collection: 'disciplines',
      data: {
        name: '限量测试方向',
        slug: `${PREFIX}-limit`,
        cover,
        order: 951,
        _status: 'published',
      },
    })
  ).id
  ids.courseLimit = (
    await payload.create({
      collection: 'courses',
      data: {
        ...course('limit'),
        discipline: ids.disciplineLimit,
        teachers: [ids.teacherDraftCampus],
        _status: 'published',
      },
    })
  ).id
  const limitExtra = (suffix: string) => ({
    title: `${PREFIX} 限量 ${suffix}`,
    discipline: ids.disciplineLimit,
    course: ids.courseLimit,
  })
  for (let i = 0; i < LIMIT_DATED; i++) {
    const suffix = `dated-${i}`
    limitWorks.dated.push(await create(work(suffix, daysAgo(10 + i)), limitExtra(suffix)))
  }
  for (let i = 0; i < LIMIT_UNDATED; i++) {
    const suffix = `undated-${i}`
    limitWorks.undated.push(
      await create(work(suffix, daysAgo(0)), { ...limitExtra(suffix), publishedAt: null }),
    )
  }

  // 简介里的链接要引用课程与作品的 ID，都建好后再写入
  await payload.update({
    collection: 'teachers',
    id: ids.teacher,
    data: { bio: bio() as never, _status: 'published' },
  })
}, 120_000)

afterAll(async () => {
  if (payload) await cleanup()
  await payload?.db.destroy?.()
})

const visibleOrder = () => [
  ids.workMain,
  ids.workSameCourse,
  ids.workSameDiscipline,
  ids.workTieHigh,
  ids.workTieLow,
  ids.workDraftDiscipline,
  ids.workBadVideo,
]

describe('作品列表数据（集成）', () => {
  it('只含已发布且已授权的作品，按发布时间降序、相同再按 ID 降序', async () => {
    const { works } = await queryWorkList(payload)
    const ours = works.filter((w) => w.title.startsWith(`${PREFIX} 作品`)).map((w) => w.id)
    expect(ours).toEqual(visibleOrder())
    expect(ours).not.toContain(ids.workNoConsent)
    expect(ours).not.toContain(ids.workDraft)
  })

  it('卡片：封面、化名与届别、已发布的专业方向、软件 slug（后台顺序）、精选', async () => {
    const { works } = await queryWorkList(payload)
    const main = works.find((w) => w.id === ids.workMain)!
    expect(main).toMatchObject({
      title: `${PREFIX} 作品 main`,
      authorName: '测试同学 main',
      cohortLabel: '2026 届',
      discipline: {
        id: ids.disciplinePublished,
        name: '作品测试方向',
        shortName: '作品测试',
        slug: `${PREFIX}-pub`,
      },
      software: [`${PREFIX}-beta`, `${PREFIX}-alpha`],
      featured: true,
    })
    expect(main.cover?.src).toMatch(/^\/api\/media\/file\//)
    // 专业方向是草稿：作品照常出现，专业方向为 null
    expect(works.find((w) => w.id === ids.workDraftDiscipline)?.discipline).toBeNull()
  })

  it('筛选项来源：已发布的专业方向（不含草稿）与全部软件（按后台排序）', async () => {
    const { facets } = await queryWorkList(payload)
    const slugs = facets.disciplines.map((d) => d.slug)
    expect(slugs).toContain(`${PREFIX}-pub`)
    expect(slugs).not.toContain(`${PREFIX}-draft`)
    const software = facets.software.filter((s) => s.slug.startsWith(PREFIX))
    expect(software).toEqual([
      { slug: `${PREFIX}-alpha`, name: 'WtInt Alpha' },
      { slug: `${PREFIX}-beta`, name: 'WtInt Beta' },
    ])
  })

  it('静态生成的作品 ID 不含草稿与未授权的作品', async () => {
    const workIds = await queryPublishedWorkIds(payload)
    expect(workIds).toEqual(expect.arrayContaining(visibleOrder()))
    expect(workIds).not.toContain(ids.workNoConsent)
    expect(workIds).not.toContain(ids.workDraft)
  })
})

describe('作品详情数据（集成）', () => {
  it('草稿、未授权、不存在的作品返回 null', async () => {
    expect(await queryWorkDetail(payload, ids.workDraft)).toBeNull()
    expect(await queryWorkDetail(payload, ids.workNoConsent)).toBeNull()
    expect(await queryWorkDetail(payload, 2_000_000_000)).toBeNull()
  })

  it('课程可访问时给出课程链接；软件名称、图集、外部播放器视频、说明', async () => {
    const detail = (await queryWorkDetail(payload, ids.workMain))!
    expect(detail.course).toEqual({
      id: ids.course,
      title: '作品测试课程 a',
      slug: `${PREFIX}-a`,
    })
    expect(detail.software).toEqual([
      { slug: `${PREFIX}-beta`, name: 'WtInt Beta' },
      { slug: `${PREFIX}-alpha`, name: 'WtInt Alpha' },
    ])
    expect(detail.gallery.map((g) => g.caption)).toEqual(['过程稿', '细节', null])
    for (const item of detail.gallery) {
      expect(item.image.src).toMatch(/^\/api\/media\/file\//)
      expect(item.thumb.src).toMatch(/^\/api\/media\/file\//)
    }
    expect(detail.video).toEqual({ kind: 'embed', embedUrl: EMBED_URL })
    expect(detail.description).toBe('作品说明')
    expect(detail.heroImage?.src).toMatch(/^\/api\/media\/file\//)
    expect(detail.shareImage?.src).toMatch(/^\/api\/media\/file\//)
  })

  it('相关作品：同课程在前、再同专业方向（发布时间降序），排除自身、草稿与未授权的作品', async () => {
    const detail = (await queryWorkDetail(payload, ids.workMain))!
    expect(detail.related.map((w) => w.id)).toEqual([
      ids.workSameCourse,
      ids.workSameDiscipline,
      ids.workTieHigh,
      ids.workTieLow,
      ids.workBadVideo,
    ])
    const other = (await queryWorkDetail(payload, ids.workSameDiscipline))!
    expect(other.related[0]?.id).toBe(ids.workMain)
    expect(other.related.map((w) => w.id)).not.toContain(ids.workSameDiscipline)
  })

  it('课程的专业方向是草稿：不给课程链接，作品的草稿专业方向为 null', async () => {
    const detail = (await queryWorkDetail(payload, ids.workDraftDiscipline))!
    expect(detail.course).toBeNull()
    expect(detail.discipline).toBeNull()
  })

  it('视频地址不在白名单时当作无视频；从未发布的课程不给链接', async () => {
    const detail = (await queryWorkDetail(payload, ids.workBadVideo))!
    expect(detail.video).toBeNull()
    expect(detail.course).toBeNull()
  })
})

describe('讲师数据（集成）', () => {
  it('列表只含已发布的讲师，专业方向只含已发布的（保持顺序）；筛选项不含草稿方向', async () => {
    const { teachers, disciplines } = await queryTeacherList(payload)
    const ours = teachers.filter((t) => t.slug.startsWith(PREFIX))
    expect(ours.map((t) => t.id).sort()).toEqual([ids.teacher, ids.teacherDraftCampus].sort())
    expect(ours[0]?.disciplines.map((d) => d.slug)).toEqual([`${PREFIX}-pub`])
    expect(ours[0]?.avatar?.src).toMatch(/^\/api\/media\/file\//)
    expect(disciplines.map((d) => d.slug)).not.toContain(`${PREFIX}-draft`)

    const slugs = await queryPublishedTeacherSlugs(payload)
    expect(slugs).toContain(`${PREFIX}-teacher-pub`)
    expect(slugs).not.toContain(`${PREFIX}-teacher-draft`)
  })

  it('草稿讲师与不存在的讲师返回 null', async () => {
    expect(await queryTeacherDetail(payload, `${PREFIX}-teacher-draft`)).toBeNull()
    expect(await queryTeacherDetail(payload, `${PREFIX}-missing`)).toBeNull()
  })

  it('详情：已发布的校区（不链接）、专业方向、从业经历、头像与分享图', async () => {
    const detail = (await queryTeacherDetail(payload, `${PREFIX}-teacher-pub`))!
    expect(detail).toMatchObject({
      id: ids.teacher,
      name: '作品测试讲师 pub',
      title: '测试讲师',
      yearsOfExperience: 9,
      campus: { name: '作品测试校区 pub', city: '测试市' },
      specialties: ['角色绑定'],
      experience: [
        { period: '2016–2020', org: '某动画工作室（虚构）', role: '动画师' },
        { period: null, org: '某游戏公司（虚构）', role: '角色美术' },
      ],
    })
    expect(detail.disciplines.map((d) => d.id)).toEqual([ids.disciplinePublished])
    expect(detail.avatar?.src).toMatch(/^\/api\/media\/file\//)
    expect(detail.shareImage?.src).toMatch(/^\/api\/media\/file\//)

    const other = (await queryTeacherDetail(payload, `${PREFIX}-teacher-draft-campus`))!
    expect(other.campus).toBeNull()
  })

  it('授课课程只含已发布且专业方向已发布的课程；作品来自这些课程（已发布、已授权）', async () => {
    const detail = (await queryTeacherDetail(payload, `${PREFIX}-teacher-pub`))!
    expect(detail.courses.map((c) => c.slug)).toEqual([`${PREFIX}-a`])
    expect(detail.works.map((w) => w.id)).toEqual([ids.workMain, ids.workSameCourse])
  })

  it('个人简介里指向不可访问课程、未授权作品的链接只渲染文字，可访问的保留', async () => {
    const detail = (await queryTeacherDetail(payload, `${PREFIX}-teacher-pub`))!
    expect(linkHrefs(detail.bio)).toEqual({
      可访问的课程: `/courses/${PREFIX}-a`,
      已下线方向的课程: null,
      已授权的作品: `/works/${ids.workMain}`,
      未授权的作品: null,
      已发布的校区: `/campuses/${PREFIX}-campus-pub`,
      草稿校区: null,
    })
  })

  it('个人简介里的校区链接与关联块带 slug（讲师所在校区的精简填充不影响简介）', async () => {
    const detail = (await queryTeacherDetail(payload, `${PREFIX}-teacher-pub`))!
    expect(relationshipHrefs(detail.bio)).toEqual([`/campuses/${PREFIX}-campus-pub`])
  })
})

describe('限量的作品查询（集成）', () => {
  it('发布时间被清空的作品在全部作品列表里排在有发布时间的之后', async () => {
    const { works } = await queryWorkList(payload)
    const ours = works.filter((w) => w.title.startsWith(`${PREFIX} 限量`))
    expect(
      ours
        .filter((w) => w.publishedAt === null)
        .map((w) => w.id)
        .sort(),
    ).toEqual([...limitWorks.undated].sort())
    expect(ours.map((w) => w.id)).toEqual([
      ...limitWorks.dated,
      ...[...limitWorks.undated].sort((a, b) => b - a),
    ])
  })

  it('讲师详情的作品（最多 8 件）保留最新的有发布时间的作品，不被没有发布时间的挤掉', async () => {
    const detail = (await queryTeacherDetail(payload, `${PREFIX}-teacher-draft-campus`))!
    expect(detail.courses.map((c) => c.slug)).toEqual([`${PREFIX}-limit`])
    expect(detail.works.map((w) => w.id)).toEqual(limitWorks.dated.slice(0, 8))
  })

  it('相关作品（最多 8 件）同样保留最新的有发布时间的作品', async () => {
    const detail = (await queryWorkDetail(payload, limitWorks.dated[0]!))!
    expect(detail.related.map((w) => w.id)).toEqual(limitWorks.dated.slice(1, 9))
  })

  it('有发布时间的作品不足上限时，用没有发布时间的补齐并排在最后', async () => {
    const detail = (await queryWorkDetail(payload, limitWorks.undated[0]!))!
    // 同课程的其余 10 件里取 8 件：有发布时间的 9 件中最新的 8 件
    expect(detail.related.map((w) => w.id)).toEqual(limitWorks.dated.slice(0, 8))

    const cards = await findWorkCards(payload, { course: { equals: ids.courseLimit } }, 10)
    expect(cards.map((w) => w.id)).toEqual([...limitWorks.dated, Math.max(...limitWorks.undated)])
  })
})

describe('作品 / 师资页面设置（集成）', () => {
  it('返回列表标题与详情行动号召（未保存过时为默认文案）', async () => {
    const work = await queryWorkPagesSettings(payload)
    expect(work.list.title).toBeTruthy()
    expect(work.detail.ctaTitle).toBeTruthy()
    const teacher = await queryTeacherPagesSettings(payload)
    expect(teacher.list.title).toBeTruthy()
    expect(teacher.detail.ctaTitle).toBeTruthy()
  })
})
