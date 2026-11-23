import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { TUTORIAL_PAGES_DEFAULTS } from '@/globals/tutorial-pages-defaults'
import { pickRecommendation, scoreQuiz } from '@/lib/quiz/score'
import { splitHighlight } from '@/lib/search/highlight'
import { parseSearchQuery } from '@/lib/search/query'
import type { SearchGroupKey, SearchResults } from '@/lib/search/types'
import config from '@/payload.config'

import { generatePlaceholder } from '../../scripts/seed/placeholders'

/**
 * 职业测试、免费教程、站内搜索的数据层（集成）：真实 Payload + 测试库，直接调用查询函数（不经过 Next 缓存）。
 * 重点验证：草稿不出现（专业方向、教程、五类搜索内容）；选项里未发布方向的分值被丢弃；
 * 作品只在已确认授权时可被搜到；关键词的大小写、全角、LIKE 通配符与超长 / 空白等边界。
 *
 * 测试库里可能已有种子数据：测试数据统一用 qts-int 前缀，可搜索的内容都带一个库里不会出现的检索词，
 * 断言只针对测试数据。会改写全局「教程页面设置」，结束后恢复原值；开始前与结束后都清理测试数据。
 */
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => fn,
  revalidateTag: vi.fn(),
}))

const { queryQuizData, queryQuizSettings, QUIZ_COURSES_LIMIT } = await import('@/lib/data/quiz')
const { queryTutorialList, queryTutorialPagesSettings } = await import('@/lib/data/tutorials')
const { querySearchResults, querySearchSuggestions } = await import('@/lib/data/search')

const PREFIX = 'qts-int'
/** 检索词：只出现在本测试的数据里 */
const NEEDLE = 'qtsneedle'
/** 字面量（含 LIKE 通配符 _ 与 %） */
const LITERAL = 'qts_lit%x'
const DAY = 24 * 60 * 60 * 1000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString()
const BV = (n: number) => `BV1QT${String(n).padStart(7, '0')}`

let payload: Payload
let originalTutorialPages: Record<string, unknown> = {}

const ids = {
  media: 0,
  /** 已发布方向（排序靠前：同分时优先） */
  disciplineA: 0,
  /** 已发布方向（排序靠后） */
  disciplineB: 0,
  /** 草稿方向：名称含检索词，在导航中显示 */
  disciplineDraft: 0,
  /** 已发布、不在导航中显示 */
  disciplineHidden: 0,
  /** 已发布，A 方向，标题含检索词，简介含字面量 */
  course: 0,
  courseDraft: 0,
  /** 已发布，但专业方向是草稿 */
  courseInDraftDiscipline: 0,
  /** B 方向的 4 门课程（完整报告只取前 3） */
  coursesB: [] as number[],
  question1: 0,
  question2: 0,
  tutorial: 0,
  tutorialDraft: 0,
  tutorialDraftDiscipline: 0,
  tutorialBadVideo: 0,
  category: 0,
  /** 只有正文含检索词 */
  article: 0,
  articleDraft: 0,
  teacher: 0,
  teacherDraft: 0,
  /** 11 件标题含检索词的作品（超过每组 10 条的上限） */
  works: [] as number[],
  /** 只有作品说明含检索词 */
  workDescriptionOnly: 0,
  workNoConsent: 0,
  workDraft: 0,
}

const base = { direction: 'ltr' as const, format: '' as const, indent: 0, version: 1 }

function richText(value: string) {
  return {
    root: {
      ...base,
      type: 'root',
      children: [
        {
          ...base,
          type: 'paragraph',
          textFormat: 0,
          textStyle: '',
          children: [
            {
              type: 'text',
              text: value,
              format: 0,
              detail: 0,
              mode: 'normal',
              style: '',
              version: 1,
            },
          ],
        },
      ],
    },
  }
}

async function cleanup() {
  const like = { like: PREFIX }
  await payload.delete({ collection: 'quiz-questions', where: { question: like } })
  await payload.delete({ collection: 'tutorials', where: { slug: like } })
  await payload.delete({ collection: 'works', where: { title: like } })
  await payload.delete({ collection: 'articles', where: { slug: like } })
  await payload.delete({ collection: 'article-categories', where: { slug: like } })
  await payload.delete({ collection: 'teachers', where: { slug: like } })
  await payload.delete({ collection: 'courses', where: { slug: like } })
  await payload.delete({ collection: 'disciplines', where: { slug: like } })
  await payload.delete({ collection: 'media', where: { alt: like } })
}

/** 恢复「教程页面设置」：从未保存过的必填项用默认值补上 */
async function restoreTutorialPages() {
  const original = originalTutorialPages as {
    list?: Record<string, unknown>
    gate?: Record<string, unknown>
  }
  const D = TUTORIAL_PAGES_DEFAULTS
  await payload.updateGlobal({
    slug: 'tutorial-pages',
    data: {
      list: { ...original.list, title: original.list?.title || D.list.title },
      gate: {
        ...original.gate,
        title: original.gate?.title || D.gate.title,
        submitLabel: original.gate?.submitLabel || D.gate.submitLabel,
      },
    } as never,
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await cleanup()
  originalTutorialPages = (await payload.findGlobal({
    slug: 'tutorial-pages',
    depth: 0,
  })) as unknown as Record<string, unknown>

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

  // ── 专业方向 ──
  const discipline = (suffix: string, order: number) => ({
    name: `检索测试方向 ${suffix}`,
    shortName: `测试${suffix}`,
    slug: `${PREFIX}-${suffix.toLowerCase()}`,
    cover,
    order,
  })
  ids.disciplineA = (
    await payload.create({
      collection: 'disciplines',
      data: { ...discipline('A', 960), tagline: `${NEEDLE} 方向介绍`, _status: 'published' },
    })
  ).id
  ids.disciplineB = (
    await payload.create({
      collection: 'disciplines',
      data: { ...discipline('B', 961), _status: 'published' },
    })
  ).id
  ids.disciplineDraft = (
    await payload.create({
      collection: 'disciplines',
      draft: true,
      data: { ...discipline('Draft', 959), name: `草稿方向 ${NEEDLE}`, _status: 'draft' },
    })
  ).id
  ids.disciplineHidden = (
    await payload.create({
      collection: 'disciplines',
      data: { ...discipline('Hidden', 958), showInNav: false, _status: 'published' },
    })
  ).id

  // ── 课程 ──
  const course = (suffix: string, disciplineId: number, order = 900) => ({
    title: `检索测试课程 ${suffix}`,
    slug: `${PREFIX}-${suffix}`,
    discipline: disciplineId,
    classType: 'long_term' as const,
    deliveryModes: ['online' as const],
    duration: { value: 3, unit: 'month' as const },
    summary: '集成测试课程',
    cover,
    order,
  })
  ids.course = (
    await payload.create({
      collection: 'courses',
      data: {
        ...course('main', ids.disciplineA),
        title: `${NEEDLE} 检索测试课程`,
        summary: `简介里有字面量 ${LITERAL} 与检索词 ${NEEDLE}`,
        _status: 'published',
      },
    })
  ).id
  ids.courseDraft = (
    await payload.create({
      collection: 'courses',
      draft: true,
      data: { ...course('draft', ids.disciplineA), title: `${NEEDLE} 草稿课程`, _status: 'draft' },
    })
  ).id
  ids.courseInDraftDiscipline = (
    await payload.create({
      collection: 'courses',
      data: {
        ...course('in-draft-discipline', ids.disciplineDraft),
        title: `${NEEDLE} 草稿方向的课程`,
        _status: 'published',
      },
    })
  ).id
  for (let i = 1; i <= 4; i++) {
    ids.coursesB.push(
      (
        await payload.create({
          collection: 'courses',
          data: { ...course(`b${i}`, ids.disciplineB, 900 + i), _status: 'published' },
        })
      ).id,
    )
  }

  // ── 职业测试题（没有草稿；加分里关联草稿方向） ──
  ids.question1 = (
    await payload.create({
      collection: 'quiz-questions',
      data: {
        question: `${PREFIX} 第一题`,
        order: 990,
        options: [
          {
            label: '偏 A（也给草稿方向加分）',
            scores: [
              { discipline: ids.disciplineA, weight: 2 },
              { discipline: ids.disciplineDraft, weight: 5 },
            ],
          },
          { label: '偏 B', scores: [{ discipline: ids.disciplineB, weight: 2 }] },
          { label: '只给草稿方向加分', scores: [{ discipline: ids.disciplineDraft, weight: 3 }] },
        ],
      },
    })
  ).id
  ids.question2 = (
    await payload.create({
      collection: 'quiz-questions',
      data: {
        question: `${PREFIX} 第二题`,
        order: 991,
        options: [
          {
            label: 'A 与 B 各 1 分',
            scores: [
              { discipline: ids.disciplineB, weight: 1 },
              { discipline: ids.disciplineA, weight: 1 },
            ],
          },
          { label: '只给草稿方向加分', scores: [{ discipline: ids.disciplineDraft, weight: 4 }] },
        ],
      },
    })
  ).id

  // ── 免费教程 ──
  const tutorial = (suffix: string, n: number) => ({
    title: `检索测试教程 ${suffix}`,
    slug: `${PREFIX}-tutorial-${suffix}`,
    discipline: ids.disciplineA,
    level: 'advanced' as const,
    cover,
    provider: 'bilibili' as const,
    videoId: BV(n),
    duration: ' 12:30 ',
    description: '集成测试教程',
    order: 900 + n,
  })
  ids.tutorial = (
    await payload.create({
      collection: 'tutorials',
      data: { ...tutorial('main', 1), gated: true, _status: 'published' },
    })
  ).id
  ids.tutorialDraft = (
    await payload.create({
      collection: 'tutorials',
      draft: true,
      data: { ...tutorial('draft', 2), _status: 'draft' },
    })
  ).id
  ids.tutorialDraftDiscipline = (
    await payload.create({
      collection: 'tutorials',
      data: {
        ...tutorial('draft-discipline', 3),
        discipline: ids.disciplineDraft,
        _status: 'published',
      },
    })
  ).id
  ids.tutorialBadVideo = (
    await payload.create({
      collection: 'tutorials',
      data: { ...tutorial('bad-video', 4), _status: 'published' },
    })
  ).id
  // 绕过后台校验写入不合法的视频 ID（模拟历史数据）
  await payload.db.updateOne({
    collection: 'tutorials',
    id: ids.tutorialBadVideo,
    data: { videoId: 'javascript:alert(1)' },
  })

  // ── 资讯 ──
  ids.category = (
    await payload.create({
      collection: 'article-categories',
      data: { name: '检索测试分类', slug: `${PREFIX}-cat`, order: 900 },
    })
  ).id
  const article = (suffix: string) => ({
    title: `检索测试文章 ${suffix}`,
    slug: `${PREFIX}-article-${suffix}`,
    category: ids.category,
    cover,
    excerpt: '集成测试摘要',
    content: richText(
      `${'正文铺垫。'.repeat(30)}这里提到 ${NEEDLE} 的用法。${'结尾。'.repeat(30)}`,
    ),
    publishedAt: daysAgo(1),
  })
  ids.article = (
    await payload.create({
      collection: 'articles',
      data: { ...article('main'), _status: 'published' },
    })
  ).id
  ids.articleDraft = (
    await payload.create({
      collection: 'articles',
      draft: true,
      data: { ...article('draft'), title: `${NEEDLE} 草稿文章`, _status: 'draft' },
    })
  ).id

  // ── 讲师 ──
  const teacher = (suffix: string, slugSuffix: string) => ({
    name: `检索测试讲师${suffix}`,
    slug: `${PREFIX}-teacher-${slugSuffix}`,
    title: '测试讲师',
    avatar: cover,
    disciplines: [ids.disciplineA],
    yearsOfExperience: 6,
    specialties: [{ text: `${NEEDLE} 角色绑定` }, { text: '表演动画' }],
    order: 900,
  })
  ids.teacher = (
    await payload.create({
      collection: 'teachers',
      data: { ...teacher('甲', 'a'), _status: 'published' },
    })
  ).id
  ids.teacherDraft = (
    await payload.create({
      collection: 'teachers',
      draft: true,
      data: { ...teacher('乙', 'b'), _status: 'draft' },
    })
  ).id

  // ── 学员作品 ──
  const work = (suffix: string, publishedAt: string) => ({
    title: `${PREFIX} 作品 ${NEEDLE} ${suffix}`,
    author: { displayName: `测试同学 ${suffix}`, cohortLabel: '2026 届' },
    discipline: ids.disciplineA,
    cover,
    video: { kind: 'none' as const },
    consentConfirmed: true,
    publishedAt,
  })
  for (let i = 0; i < 11; i++) {
    ids.works.push(
      (
        await payload.create({
          collection: 'works',
          data: { ...work(String(i), daysAgo(2 + i)), _status: 'published' },
        })
      ).id,
    )
  }
  // 发布时间最新：若不按“标题匹配优先”排序，它会排在第一位
  ids.workDescriptionOnly = (
    await payload.create({
      collection: 'works',
      data: {
        ...work('desc', daysAgo(0.5)),
        title: `${PREFIX} 作品 只在说明里提到`,
        description: `作品说明里提到 ${NEEDLE}`,
        _status: 'published',
      },
    })
  ).id
  ids.workNoConsent = (
    await payload.create({
      collection: 'works',
      data: { ...work('no-consent', daysAgo(0.2)), _status: 'published' },
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
      data: { ...work('draft', daysAgo(0.1)), _status: 'draft' },
    })
  ).id
}, 180_000)

afterAll(async () => {
  if (payload) {
    await restoreTutorialPages()
    await cleanup()
  }
  await payload?.db.destroy?.()
})

describe('职业测试数据（集成）', () => {
  it('专业方向只含已发布的（按后台排序）；草稿方向不参与计分与推荐', async () => {
    const { disciplines } = await queryQuizData(payload)
    const disciplineIds = disciplines.map((d) => d.id)
    expect(disciplineIds).toEqual(expect.arrayContaining([ids.disciplineA, ids.disciplineB]))
    expect(disciplineIds).not.toContain(ids.disciplineDraft)
    expect(disciplineIds.indexOf(ids.disciplineA)).toBeLessThan(
      disciplineIds.indexOf(ids.disciplineB),
    )
    const a = disciplines.find((d) => d.id === ids.disciplineA)!
    expect(a).toMatchObject({
      name: '检索测试方向 A',
      shortName: '测试A',
      slug: `${PREFIX}-a`,
      tagline: `${NEEDLE} 方向介绍`,
    })
    expect(a.cover?.src).toMatch(/\/api\/media\/file\//)
  })

  it('选项里未发布方向的分值被丢弃，只给草稿方向加分的选项照常保留（不加分）', async () => {
    const { questions } = await queryQuizData(payload)
    const q1 = questions.find((q) => q.id === ids.question1)!
    const q2 = questions.find((q) => q.id === ids.question2)!
    expect(q1.question).toBe(`${PREFIX} 第一题`)
    expect(q1.options).toEqual([
      {
        label: '偏 A（也给草稿方向加分）',
        scores: [{ disciplineId: ids.disciplineA, weight: 2 }],
      },
      { label: '偏 B', scores: [{ disciplineId: ids.disciplineB, weight: 2 }] },
      { label: '只给草稿方向加分', scores: [] },
    ])
    expect(q2.options[1]).toEqual({ label: '只给草稿方向加分', scores: [] })
    // 按后台排序
    expect(questions.findIndex((q) => q.id === ids.question1)).toBeLessThan(
      questions.findIndex((q) => q.id === ids.question2),
    )
  })

  it('用查询结果计分：同分按专业方向的后台排序，未发布方向永远不会被推荐', async () => {
    const { questions, disciplines } = await queryQuizData(payload)
    const ours = [ids.question1, ids.question2].map((id) => questions.find((q) => q.id === id)!)
    const order = disciplines.map((d) => d.id)
    const recommend = (answers: number[]) =>
      pickRecommendation(scoreQuiz(ours, answers, order))?.disciplineId ?? null

    expect(recommend([0, 0])).toBe(ids.disciplineA)
    expect(recommend([1, 0])).toBe(ids.disciplineB)
    // A、B 各 1 分（同分）：A 排序靠前
    expect(recommend([2, 0])).toBe(ids.disciplineA)
    // 只选了给草稿方向加分的选项：一分都没有，不推荐
    expect(recommend([2, 1])).toBeNull()
    const scores = scoreQuiz(ours, [0, 1], order)
    expect(scores.map((s) => s.disciplineId)).not.toContain(ids.disciplineDraft)
    expect(scores.find((s) => s.disciplineId === ids.disciplineA)).toMatchObject({
      score: 2,
      percent: 100,
    })
  })

  it('每个方向带最多 3 门已发布课程（课程列表的排序），不含草稿课程与草稿方向的课程', async () => {
    const { disciplines } = await queryQuizData(payload)
    const a = disciplines.find((d) => d.id === ids.disciplineA)!
    const b = disciplines.find((d) => d.id === ids.disciplineB)!
    expect(a.courses.map((c) => c.id)).toEqual([ids.course])
    expect(b.courses).toHaveLength(QUIZ_COURSES_LIMIT)
    expect(b.courses.map((c) => c.id)).toEqual(ids.coursesB.slice(0, QUIZ_COURSES_LIMIT))
    const all = disciplines.flatMap((d) => d.courses.map((c) => c.id))
    expect(all).not.toContain(ids.courseDraft)
    expect(all).not.toContain(ids.courseInDraftDiscipline)
  })

  it('职业测试设置：必填文字总有值，下一步建议的标题都不为空', async () => {
    const settings = await queryQuizSettings(payload)
    expect(settings.intro.title).toBeTruthy()
    expect(settings.intro.startLabel).toBeTruthy()
    expect(settings.result.summaryTitle).toBeTruthy()
    expect(settings.result.reportTitle).toBeTruthy()
    for (const step of settings.result.nextSteps) expect(step.title).toBeTruthy()
  })
})

describe('免费教程数据（集成）', () => {
  it('只含已发布的教程，按后台排序；草稿不出现', async () => {
    const { tutorials } = await queryTutorialList(payload)
    const ours = tutorials.filter((t) => t.slug.startsWith(PREFIX)).map((t) => t.id)
    expect(ours).toEqual([ids.tutorial, ids.tutorialDraftDiscipline, ids.tutorialBadVideo])
    expect(ours).not.toContain(ids.tutorialDraft)
  })

  it('卡片：封面、已发布的专业方向、难度、时长、留资解锁与白名单播放器地址', async () => {
    const { tutorials } = await queryTutorialList(payload)
    const main = tutorials.find((t) => t.id === ids.tutorial)!
    expect(main).toMatchObject({
      title: '检索测试教程 main',
      slug: `${PREFIX}-tutorial-main`,
      description: '集成测试教程',
      discipline: { id: ids.disciplineA, slug: `${PREFIX}-a`, name: '检索测试方向 A' },
      level: 'advanced',
      provider: 'bilibili',
      videoId: BV(1),
      embedUrl: `https://player.bilibili.com/player.html?bvid=${BV(1)}`,
      duration: '12:30',
      gated: true,
    })
    expect(main.cover?.src).toMatch(/\/api\/media\/file\//)
    // 专业方向是草稿：教程照常出现，专业方向为 null
    expect(tutorials.find((t) => t.id === ids.tutorialDraftDiscipline)?.discipline).toBeNull()
    // 绕过校验写入的非法视频 ID：没有播放器地址（前台显示“视频暂不可用”）
    expect(tutorials.find((t) => t.id === ids.tutorialBadVideo)).toMatchObject({
      embedUrl: null,
      gated: false,
    })
  })

  it('筛选项来源：已发布的专业方向（不含草稿）', async () => {
    const { facets } = await queryTutorialList(payload)
    const slugs = facets.disciplines.map((d) => d.slug)
    expect(slugs).toContain(`${PREFIX}-a`)
    expect(slugs).not.toContain(`${PREFIX}-draft`)
  })

  it('教程页面设置：按后台填写；清空的简介不显示，必填文字为空时用默认值', async () => {
    await payload.updateGlobal({
      slug: 'tutorial-pages',
      data: {
        list: {
          title: ' 测试教程页 ',
          description: '',
          seo: { title: '测试 SEO 标题', description: '测试 SEO 描述' },
        },
        gate: { title: '测试解锁标题', description: '测试解锁说明', submitLabel: '测试解锁' },
      },
    })
    const settings = await queryTutorialPagesSettings(payload)
    expect(settings.list).toMatchObject({
      title: '测试教程页',
      description: null,
      seo: { title: '测试 SEO 标题', description: '测试 SEO 描述' },
    })
    expect(settings.gate).toEqual({
      title: '测试解锁标题',
      description: '测试解锁说明',
      submitLabel: '测试解锁',
    })
  })
})

describe('站内搜索数据（集成）', () => {
  const search = (query: string) => querySearchResults(payload, query)
  const group = (results: SearchResults, key: SearchGroupKey) =>
    results.groups.find((g) => g.key === key)!
  const hitIds = (results: SearchResults, key: SearchGroupKey) =>
    group(results, key).hits.map((hit) => hit.id)

  it('五类内容都能搜到，只含已发布的（课程的专业方向也须已发布），作品须已确认授权', async () => {
    const results = await search(NEEDLE)
    expect(results.groups.map((g) => g.key)).toEqual([
      'courses',
      'disciplines',
      'articles',
      'teachers',
      'works',
    ])
    expect(hitIds(results, 'courses')).toEqual([ids.course])
    expect(hitIds(results, 'disciplines')).toEqual([ids.disciplineA])
    expect(hitIds(results, 'articles')).toEqual([ids.article])
    expect(hitIds(results, 'teachers')).toEqual([ids.teacher])
    expect(group(results, 'courses').total).toBe(1)
    expect(group(results, 'disciplines').total).toBe(1)
    expect(group(results, 'articles').total).toBe(1)
    expect(group(results, 'teachers').total).toBe(1)

    const works = group(results, 'works')
    expect(works.total).toBe(12)
    for (const id of [ids.workNoConsent, ids.workDraft]) {
      expect(works.hits.map((hit) => hit.id)).not.toContain(id)
    }
    expect(results.total).toBe(16)
  })

  it('每组最多 10 条，标题匹配的排在只在说明中匹配的前面；总数仍是全部匹配数', async () => {
    const works = (await search(NEEDLE)).groups.find((g) => g.key === 'works')!
    expect(works.hits).toHaveLength(10)
    expect(works.hits.map((hit) => hit.id)).not.toContain(ids.workDescriptionOnly)
    // 同一档内保持查询顺序（发布时间从新到旧）
    expect(works.hits.map((hit) => hit.id)).toEqual(ids.works.slice(0, 10))
  })

  it('结果条目：站内路径、纯文本摘要与补充信息，高亮片段拼回去等于原文', async () => {
    const results = await search(NEEDLE)
    const course = group(results, 'courses').hits[0]
    expect(course).toMatchObject({
      href: `/courses/${PREFIX}-main`,
      meta: '检索测试方向 A',
    })
    expect(course.excerpt).toContain(NEEDLE)
    expect(course.image?.src).toMatch(/\/api\/media\/file\//)
    const parts = splitHighlight(course.title, [NEEDLE])
    expect(parts.map((part) => part.text).join('')).toBe(course.title)
    expect(parts).toContainEqual({ text: NEEDLE, match: true })

    const article = group(results, 'articles').hits[0]
    expect(article.href).toBe(`/articles/${PREFIX}-article-main`)
    expect(article.meta).toBe('检索测试分类')
    // 只有正文匹配：摘要取正文中检索词附近的一段
    expect(article.excerpt).toContain(NEEDLE)
    expect(group(results, 'disciplines').hits[0].href).toBe(`/majors/${PREFIX}-a`)
    expect(group(results, 'teachers').hits[0]).toMatchObject({
      href: `/teachers/${PREFIX}-teacher-a`,
      excerpt: `${NEEDLE} 角色绑定、表演动画`,
      meta: '测试讲师',
    })
    expect(group(results, 'works').hits[0]).toMatchObject({
      href: `/works/${ids.works[0]}`,
      meta: '测试同学 0',
    })
  })

  it('大小写不敏感；全角字母按半角处理', async () => {
    const lower = await search(NEEDLE)
    const upper = await search(NEEDLE.toUpperCase())
    const fullWidth = await search('ｑｔｓｎｅｅｄｌｅ')
    expect(upper.total).toBe(lower.total)
    expect(fullWidth.total).toBe(lower.total)
  })

  it('多个检索词：每个词都要在某个字段中出现（可以在不同字段）', async () => {
    const both = await search(`${NEEDLE} 讲师甲`)
    expect(hitIds(both, 'teachers')).toEqual([ids.teacher])
    expect(both.total).toBe(1)
    expect((await search(`${NEEDLE} 讲师丙`)).total).toBe(0)
  })

  it('LIKE 通配符按字面匹配：_ 与 % 不会匹配任意字符', async () => {
    expect(hitIds(await search(LITERAL), 'courses')).toEqual([ids.course])
    expect((await search(LITERAL)).total).toBe(1)
    expect((await search('qtsneedl_')).total).toBe(0)
    expect((await search('qts%needle')).total).toBe(0)
    expect((await search('qts\\needle')).total).toBe(0)
  })

  it('空、只有空白、超过 50 个字的关键词返回空结果；引号、HTML 等字符不会出错', async () => {
    for (const query of ['', '   ', '　', NEEDLE.repeat(6)]) {
      const results = await search(query)
      expect(results.total, JSON.stringify(query)).toBe(0)
      expect(results.groups.every((g) => g.total === 0 && g.hits.length === 0)).toBe(true)
    }
    for (const query of [
      '<script>alert(1)</script>',
      `${NEEDLE}' OR '1'='1`,
      '"; DROP TABLE courses; --',
    ]) {
      expect((await search(query)).total, query).toBe(0)
    }
  })

  it('与页面相同的解析流程：parseSearchQuery 的结果可直接查询', async () => {
    const parsed = parseSearchQuery({ q: `  ${NEEDLE.toUpperCase()}  ` })
    expect(parsed.status).toBe('ok')
    if (parsed.status !== 'ok') return
    expect((await search(parsed.query)).total).toBe(16)
    expect(parseSearchQuery({ q: NEEDLE.repeat(6) }).status).toBe('tooLong')
  })

  it('热门入口：只含已发布且在导航中显示的专业方向（最多 8 个），热门课程都已发布', async () => {
    const suggestions = await querySearchSuggestions(payload)
    const disciplineIds = suggestions.disciplines.map((d) => d.id)
    expect(disciplineIds).not.toContain(ids.disciplineDraft)
    expect(disciplineIds).not.toContain(ids.disciplineHidden)
    expect(disciplineIds.length).toBeLessThanOrEqual(8)
    const { docs } = await payload.find({
      collection: 'disciplines',
      where: { and: [{ _status: { equals: 'published' } }, { showInNav: { equals: true } }] },
      sort: ['order', 'id'],
      limit: 8,
      depth: 0,
    })
    expect(disciplineIds).toEqual(docs.map((doc) => doc.id))

    expect(suggestions.courses.length).toBeLessThanOrEqual(6)
    const courseIds = suggestions.courses.map((c) => c.id)
    expect(courseIds).not.toContain(ids.courseDraft)
    expect(courseIds).not.toContain(ids.courseInDraftDiscipline)
  })
})
