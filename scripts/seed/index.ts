/**
 * 一键重置种子数据：pnpm seed:reset
 *
 * - 清空内容集合、线索与种子账号（不动其它后台账号），删除种子生成的媒体文件；
 * - 本地生成占位图并上传到媒体库；
 * - 按依赖顺序创建全部演示内容与全局配置。
 *
 * 安全：NODE_ENV=production 时拒绝运行，除非显式设置 SEED_ALLOW_PRODUCTION=true。
 * 加速（测试用）：SEED_IMAGE_SCALE=0.2 生成更小的占位图。
 */
import 'dotenv/config'

import { readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getPayload, type CollectionSlug, type GlobalSlug, type Payload } from 'payload'

import config from '../../src/payload.config'
import { articles } from './data/articles'
import { banners } from './data/banners'
import { campusDetails } from './data/campuses'
import { careerEvents } from './data/career-events'
import { courses } from './data/courses'
import { disciplines } from './data/disciplines'
import { faqs } from './data/faqs'
import { pages } from './data/pages'
import { partners } from './data/partners'
import { quizQuestions } from './data/quiz'
import { stories } from './data/stories'
import { teachers } from './data/teachers'
import { tutorials } from './data/tutorials'
import { bilibiliPlayerUrl, galleryCaptions, works } from './data/works'
import { toLexical } from './lexical'
import { generatePlaceholder, type Aspect, type PlaceholderKind } from './placeholders'
import {
  ARTICLE_CATEGORIES,
  CAMPUSES,
  COURSES,
  DISCIPLINES,
  SOFTWARE,
  type CampusSlug,
  type CourseSlug,
  type DisciplineSlug,
} from './registry'
import { buildGlobals, buildLeads, SEED_USERS, SEED_USER_DOMAIN } from './site'

const context = { disableRevalidate: true }
const published = { _status: 'published' as const }

/** 删除顺序：先删引用方，再删被引用方 */
const RESET_ORDER: CollectionSlug[] = [
  'leads',
  'cohorts',
  'stories',
  'works',
  'courses',
  'teachers',
  'faqs',
  'tutorials',
  'quiz-questions',
  'articles',
  'article-categories',
  'banners',
  'career-events',
  'partners',
  'pages',
]

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()

function log(message: string) {
  console.info(`[seed] ${message}`)
}

function mapBy<T, K extends string>(items: readonly T[], key: (item: T) => K): Map<K, T> {
  return new Map(items.map((item) => [key(item), item]))
}

function required<K, V>(map: Map<K, V>, key: K, what: string): V {
  const value = map.get(key)
  if (value === undefined) throw new Error(`种子数据引用了不存在的${what}：${String(key)}`)
  return value
}

const hueOf = (slug: DisciplineSlug) =>
  required(
    mapBy(DISCIPLINES, (d) => d.slug),
    slug,
    '专业方向',
  ).hue
const disciplineName = (slug: DisciplineSlug) =>
  required(
    mapBy(DISCIPLINES, (d) => d.slug),
    slug,
    '专业方向',
  ).shortName

type ImageInput = {
  name: string
  alt: string
  kind: PlaceholderKind
  hue: number
  aspect: Aspect
  label: string
  size?: number
}

async function uploadImage(payload: Payload, input: ImageInput): Promise<number> {
  const image = await generatePlaceholder(
    {
      kind: input.kind,
      seed: input.name,
      hue: input.hue,
      aspect: input.aspect,
      label: input.label,
      size: input.size,
    },
    `seed-${input.name}`,
  )
  const doc = await payload.create({
    collection: 'media',
    data: { alt: input.alt },
    file: {
      data: image.data,
      mimetype: image.mimetype,
      name: image.filename,
      size: image.data.length,
    },
    context,
  })
  return doc.id
}

/** 有限并发执行，加速图片生成与上传 */
async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
) {
  const results: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        results[i] = await fn(items[i]!, i)
      }
    }),
  )
  return results
}

async function reset(payload: Payload) {
  for (const collection of RESET_ORDER) {
    await payload.delete({ collection, where: { id: { exists: true } }, context })
  }
  await payload.delete({
    collection: 'users',
    where: { email: { like: `%@${SEED_USER_DOMAIN}` } },
    context,
  })
  // 页脚二维码的图片是必填的（外键不能置空），删除媒体前先清空，否则整个删除事务会失败
  await payload.updateGlobal({ slug: 'footer', data: { qrcodes: [] }, context })
  for (const collection of ['campuses', 'software', 'disciplines', 'media'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } }, context })
  }
  // 兜底：清理上次中断时残留的种子图片（只删 seed- 前缀的文件）
  const mediaDir = process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media')
  const files = await readdir(mediaDir).catch(() => [] as string[])
  await Promise.all(
    files
      .filter((f) => f.startsWith('seed-'))
      .map((f) => rm(path.join(mediaDir, f), { force: true })),
  )
}

export type SeedSummary = { counts: Record<string, number>; seconds: number }

/** 重置并写入全部种子数据（CLI 与集成测试共用） */
export async function runSeed(payload: Payload): Promise<SeedSummary> {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error('生产环境禁止运行种子脚本（如确需运行，设置 SEED_ALLOW_PRODUCTION=true）')
  }
  const started = Date.now()
  const dbName = new URL(process.env.DATABASE_URL ?? 'postgresql://unknown/unknown').pathname.slice(
    1,
  )
  log(`目标数据库：${dbName}`)

  log('清空旧数据…')
  await reset(payload)

  // 1. 软件
  const softwareIds = new Map<string, number>()
  for (const [i, s] of SOFTWARE.entries()) {
    const doc = await payload.create({
      collection: 'software',
      data: { name: s.name, slug: s.slug, category: s.category, order: i },
      context,
    })
    softwareIds.set(s.slug, doc.id)
  }
  const softwareIdsOf = (slugs: readonly string[]) =>
    slugs.map((s) => required(softwareIds, s, '软件'))

  // 2. 专业方向
  log('专业方向…')
  const disciplineData = mapBy(disciplines, (d) => d.slug)
  const disciplineIds = new Map<DisciplineSlug, number>()
  await mapLimit(DISCIPLINES, 4, async (d, i) => {
    const data = required(disciplineData, d.slug, '专业方向详情')
    const cover = await uploadImage(payload, {
      name: `discipline-${d.slug}`,
      alt: `${d.name}专业封面（占位图）`,
      kind: 'art',
      hue: d.hue,
      aspect: '16:9',
      label: `占位图 · ${d.shortName}`,
    })
    const doc = await payload.create({
      collection: 'disciplines',
      draft: false,
      data: {
        ...published,
        name: d.name,
        shortName: d.shortName,
        slug: d.slug,
        tagline: data.tagline,
        cover,
        intro: toLexical(data.intro),
        careerDirections: data.careerDirections,
        salaryRef: data.salaryRef,
        showInNav: true,
        order: i,
        seo: data.seo,
      },
      context,
    })
    disciplineIds.set(d.slug, doc.id)
  })
  const disciplineId = (slug: DisciplineSlug) => required(disciplineIds, slug, '专业方向')

  // 3. 校区
  log('校区…')
  const campusData = mapBy(campusDetails, (c) => c.slug)
  const campusIds = new Map<CampusSlug, number>()
  await mapLimit(CAMPUSES, 3, async (c, i) => {
    const detail = required(campusData, c.slug, '校区详情')
    const cover = await uploadImage(payload, {
      name: `campus-${c.slug}-cover`,
      alt: `${c.name}外景（占位图）`,
      kind: 'space',
      hue: 30 + i * 45,
      aspect: '4:3',
      label: `占位图 · ${c.name}`,
    })
    const photos = await mapLimit(detail.photoCaptions, 3, async (caption, j) => ({
      caption,
      image: await uploadImage(payload, {
        name: `campus-${c.slug}-photo-${j}`,
        alt: `${c.name}${caption}（占位图）`,
        kind: 'space',
        hue: 30 + i * 45 + j * 20,
        aspect: '4:3',
        label: `占位图 · ${c.name} ${caption}`,
        size: 1200,
      }),
    }))
    const doc = await payload.create({
      collection: 'campuses',
      draft: false,
      data: {
        ...published,
        name: c.name,
        slug: c.slug,
        city: c.city,
        citySlug: c.citySlug,
        address: detail.address,
        location: { lng: c.lng, lat: c.lat },
        transit: detail.transit,
        phone: detail.phone,
        openingHours: detail.openingHours,
        cover,
        photos,
        order: i,
      },
      context,
    })
    campusIds.set(c.slug, doc.id)
  })
  const campusId = (slug: CampusSlug) => required(campusIds, slug, '校区')

  // 4. 通用 FAQ
  log('常见问题…')
  const generalFaqIds: { id: number; category: string }[] = []
  for (const [i, f] of faqs.entries()) {
    const doc = await payload.create({
      collection: 'faqs',
      data: { ...f, order: 100 + i },
      context,
    })
    generalFaqIds.push({ id: doc.id, category: f.category })
  }

  // 5. 讲师
  log('讲师…')
  const teacherIds = new Map<string, number>()
  await mapLimit(teachers, 4, async (t, i) => {
    const avatar = await uploadImage(payload, {
      name: `teacher-${t.slug}`,
      alt: `${t.name}老师头像（占位图）`,
      kind: 'avatar',
      hue: hueOf(t.disciplines[0]!),
      aspect: '1:1',
      label: t.name,
      size: 600,
    })
    const doc = await payload.create({
      collection: 'teachers',
      draft: false,
      data: {
        ...published,
        name: t.name,
        slug: t.slug,
        title: t.title,
        avatar,
        disciplines: t.disciplines.map(disciplineId),
        campus: campusId(t.campus),
        yearsOfExperience: t.yearsOfExperience,
        specialties: t.specialties.map((text) => ({ text })),
        bio: toLexical(t.bio),
        experience: t.experience,
        featured: t.featured,
        order: i,
      },
      context,
    })
    teacherIds.set(t.slug, doc.id)
  })

  // 6. 课程（含课程专属 FAQ、实训项目配图）
  log('课程…')
  const courseData = mapBy(courses, (c) => c.slug)
  const courseIds = new Map<CourseSlug, number>()
  const feeFaqIds = generalFaqIds.filter((f) => f.category === 'fee').map((f) => f.id)
  await mapLimit(COURSES, 3, async (c, i) => {
    const data = required(courseData, c.slug, '课程详情')
    const hue = hueOf(c.discipline)
    const cover = await uploadImage(payload, {
      name: `course-${c.slug}`,
      alt: `${c.title}封面（占位图）`,
      kind: 'art',
      hue,
      aspect: '16:9',
      label: `占位图 · ${disciplineName(c.discipline)}`,
    })
    const projects = await mapLimit(data.projects, 2, async (p, j) => ({
      ...p,
      image: await uploadImage(payload, {
        name: `course-${c.slug}-project-${j}`,
        alt: `实训项目：${p.title}（占位图）`,
        kind: 'art',
        hue: hue + 20,
        aspect: '4:3',
        label: `占位图 · 实训项目`,
        size: 1000,
      }),
    }))
    const courseFaqIds: number[] = []
    for (const [j, f] of data.faqs.entries()) {
      const doc = await payload.create({
        collection: 'faqs',
        data: { ...f, category: 'course', order: j },
        context,
      })
      courseFaqIds.push(doc.id)
    }
    const doc = await payload.create({
      collection: 'courses',
      draft: false,
      data: {
        ...published,
        title: c.title,
        slug: c.slug,
        discipline: disciplineId(c.discipline),
        classType: c.classType,
        deliveryModes: [...c.modes],
        campuses: data.campuses.map(campusId),
        duration: data.duration,
        schedule: data.schedule,
        summary: data.summary,
        cover,
        highlights: data.highlights.map((text) => ({ text })),
        audience: data.audience.map((text) => ({ text })),
        stages: data.stages.map((s) => ({ ...s, topics: s.topics.map((text) => ({ text })) })),
        software: softwareIdsOf(data.software),
        projects,
        teachers: teachers
          .filter((t) => t.courses.includes(c.slug))
          .map((t) => required(teacherIds, t.slug, '讲师')),
        faqs: [...courseFaqIds, ...feeFaqIds],
        careerDirections: data.careerDirections,
        salaryRef: data.salaryRef,
        featured: data.featured,
        order: i,
        seo: data.seo,
      },
      context,
    })
    courseIds.set(c.slug, doc.id)
  })
  const courseId = (slug: CourseSlug) => required(courseIds, slug, '课程')

  // 7. 开班计划：按课程自动生成（日期相对今天，保证始终是“近期开班”）
  log('开班计划…')
  let cohortCount = 0
  for (const [i, c] of COURSES.entries()) {
    const data = required(courseData, c.slug, '课程详情')
    const offlineCampuses = data.campuses.slice(0, c.classType === 'long_term' ? 3 : 2)
    const plans: { campus?: CampusSlug; mode: 'offline' | 'online' | 'dual' }[] =
      offlineCampuses.length > 0
        ? offlineCampuses.map((campus) => ({
            campus,
            mode: (c.modes as readonly string[]).includes('offline') ? 'offline' : 'dual',
          }))
        : [{ mode: 'online' }, { mode: 'online' }]
    for (const [j, plan] of plans.entries()) {
      const start = 7 + ((i * 5 + j * 17) % 50)
      const lengthDays =
        data.duration.unit === 'month' ? data.duration.value * 30 : data.duration.value * 7
      await payload.create({
        collection: 'cohorts',
        data: {
          course: courseId(c.slug),
          campus: plan.campus ? campusId(plan.campus) : undefined,
          mode: plan.mode,
          startDate: days(start),
          endDate: days(start + lengthDays),
          status: start < 20 ? 'enrolling' : 'upcoming',
          note: plan.mode === 'online' ? '线上直播，课后提供回放' : undefined,
        },
        context,
      })
      cohortCount++
    }
  }

  // 8. 学员作品
  log('学员作品…')
  const workIds = await mapLimit(works, 4, async (w, i) => {
    const hue = hueOf(w.discipline)
    const cover = await uploadImage(payload, {
      name: `work-${String(i + 1).padStart(2, '0')}`,
      alt: `学员作品：${w.title}（占位图）`,
      kind: 'art',
      hue,
      aspect: w.aspect,
      label: `占位图 · ${disciplineName(w.discipline)}`,
    })
    const captions = galleryCaptions(w)
    const gallery = await mapLimit(captions, 2, async (caption, j) => ({
      caption,
      image: await uploadImage(payload, {
        name: `work-${String(i + 1).padStart(2, '0')}-detail-${j}`,
        alt: `学员作品：${w.title} ${caption}（占位图）`,
        kind: 'art',
        hue: hue + 15 * (j + 1),
        aspect: w.aspect,
        label: `占位图 · ${disciplineName(w.discipline)}`,
        size: 1400,
      }),
    }))
    const doc = await payload.create({
      collection: 'works',
      draft: false,
      data: {
        ...published,
        title: w.title,
        author: w.author,
        discipline: disciplineId(w.discipline),
        course: courseId(w.course),
        software: softwareIdsOf(w.software),
        cover,
        gallery,
        video: w.videoBvid
          ? { kind: 'embed', embedUrl: bilibiliPlayerUrl(w.videoBvid) }
          : { kind: 'none' },
        description: w.description,
        consentConfirmed: true,
        featured: w.featured,
        publishedAt: days(-(i * 3 + 1)),
        order: i,
      },
      context,
    })
    return doc.id
  })

  // 9. 合作企业
  log('合作企业…')
  const partnerIds = new Map<string, number>()
  await mapLimit(partners, 4, async (p, i) => {
    const logo = await uploadImage(payload, {
      name: `partner-${String(i + 1).padStart(2, '0')}`,
      alt: `${p.name} 标识（占位图）`,
      kind: 'wordmark',
      hue: (i * 47) % 360,
      aspect: '2:1',
      label: p.name,
      size: 600,
    })
    const doc = await payload.create({
      collection: 'partners',
      data: { name: p.name, industry: p.industry, logo, order: i },
      context,
    })
    partnerIds.set(p.name, doc.id)
  })

  // 10. 学员故事
  log('学员故事…')
  await mapLimit(stories, 3, async (s, i) => {
    const course = required(
      mapBy(COURSES, (c) => c.slug),
      s.course,
      '课程',
    )
    const avatar = await uploadImage(payload, {
      name: `story-${i + 1}`,
      alt: `${s.displayName}（化名）头像占位图`,
      kind: 'avatar',
      hue: hueOf(course.discipline),
      aspect: '1:1',
      label: s.displayName,
      size: 600,
    })
    await payload.create({
      collection: 'stories',
      draft: false,
      data: {
        ...published,
        displayName: s.displayName,
        avatar,
        background: s.background,
        course: courseId(s.course),
        currentRole: s.currentRole,
        companyName: s.companyName,
        partner: s.partnerName ? required(partnerIds, s.partnerName, '合作企业') : undefined,
        quote: s.quote,
        story: toLexical(s.story),
        works: s.workIndexes.map((index) =>
          required(new Map(workIds.entries()), index, '作品下标'),
        ),
        consentConfirmed: true,
        featured: s.featured,
        order: i,
      },
      context,
    })
  })

  // 11. 文章
  log('文章…')
  const categoryIds = new Map<string, number>()
  for (const [i, c] of ARTICLE_CATEGORIES.entries()) {
    const doc = await payload.create({
      collection: 'article-categories',
      data: { name: c.name, slug: c.slug, order: i },
      context,
    })
    categoryIds.set(c.slug, doc.id)
  }
  await mapLimit(articles, 4, async (a, i) => {
    const related = a.relatedCourses[0]
    const hue = related
      ? hueOf(
          required(
            mapBy(COURSES, (c) => c.slug),
            related,
            '课程',
          ).discipline,
        )
      : 20 + i * 37
    const cover = await uploadImage(payload, {
      name: `article-${a.slug}`,
      alt: `${a.title}配图（占位图）`,
      kind: 'art',
      hue,
      aspect: '16:9',
      label: `占位图 · ${
        required(
          mapBy(ARTICLE_CATEGORIES, (c) => c.slug),
          a.category,
          '文章分类',
        ).name
      }`,
      size: 1400,
    })
    await payload.create({
      collection: 'articles',
      draft: false,
      data: {
        ...published,
        title: a.title,
        slug: a.slug,
        category: required(categoryIds, a.category, '文章分类'),
        cover,
        excerpt: a.excerpt,
        content: toLexical(a.content),
        relatedCourses: a.relatedCourses.map(courseId),
        authorName: a.authorName,
        publishedAt: days(-a.publishedDaysAgo),
      },
      context,
    })
  })

  // 12. 轮播图
  log('轮播图…')
  await mapLimit(banners, 2, async (b, i) => {
    const hue = 190 + i * 55
    const image = await uploadImage(payload, {
      name: `banner-${i + 1}`,
      alt: `${b.title}（占位图）`,
      kind: 'art',
      hue,
      aspect: '12:5',
      label: '占位图 · 主视觉',
      size: 1920,
    })
    const mobileImage = await uploadImage(payload, {
      name: `banner-${i + 1}-mobile`,
      alt: `${b.title}（移动端占位图）`,
      kind: 'art',
      hue,
      aspect: '3:4m',
      label: '占位图 · 主视觉',
      size: 1000,
    })
    await payload.create({
      collection: 'banners',
      data: { ...b, image, mobileImage, active: true, order: i },
      context,
    })
  })

  // 13. 免费教程
  log('免费教程…')
  await mapLimit(tutorials, 4, async (t, i) => {
    const cover = await uploadImage(payload, {
      name: `tutorial-${t.slug}`,
      alt: `${t.title}封面（占位图）`,
      kind: 'art',
      hue: hueOf(t.discipline),
      aspect: '16:9',
      label: `占位图 · 免费教程`,
      size: 1200,
    })
    await payload.create({
      collection: 'tutorials',
      draft: false,
      data: {
        ...published,
        title: t.title,
        slug: t.slug,
        discipline: disciplineId(t.discipline),
        cover,
        provider: 'bilibili',
        videoId: t.videoId,
        duration: t.duration,
        level: t.level,
        gated: t.gated,
        description: t.description,
        order: i,
      },
      context,
    })
  })

  // 14. 职业测试题
  log('职业测试…')
  for (const [i, q] of quizQuestions.entries()) {
    await payload.create({
      collection: 'quiz-questions',
      data: {
        question: q.question,
        order: i,
        options: q.options.map((o) => ({
          label: o.label,
          scores: o.scores.map((s) => ({
            discipline: disciplineId(s.discipline),
            weight: s.weight,
          })),
        })),
      },
      context,
    })
  }

  // 15. 招聘活动
  log('招聘活动…')
  await mapLimit(careerEvents, 2, async (e, i) => {
    const image = await uploadImage(payload, {
      name: `career-event-${i + 1}`,
      alt: `${e.title}（占位图）`,
      kind: 'space',
      hue: 200 + i * 40,
      aspect: '16:9',
      label: '占位图 · 招聘活动',
      size: 1200,
    })
    await payload.create({
      collection: 'career-events',
      data: {
        title: e.title,
        date: days(e.daysFromNow),
        location: e.location,
        campus: e.campus ? campusId(e.campus) : undefined,
        image,
        description: e.description,
        registrationNote: e.registrationNote,
      },
      context,
    })
  })

  // 16. 页面
  log('页面…')
  for (const page of pages) {
    const layout = await Promise.all(
      page.layout.map(async (block, j) => {
        switch (block.blockType) {
          case 'richText':
            return { blockType: 'richText' as const, content: toLexical(block.content) }
          case 'imageText':
            return {
              blockType: 'imageText' as const,
              title: block.title,
              content: toLexical(block.content),
              imagePosition: block.imagePosition,
              image: await uploadImage(payload, {
                name: `page-${page.slug}-${j}`,
                alt: `${block.title}（占位图）`,
                kind: 'space',
                hue: 210,
                aspect: '4:3',
                label: `占位图 · ${page.title}`,
                size: 1200,
              }),
            }
          default:
            return block
        }
      }),
    )
    await payload.create({
      collection: 'pages',
      draft: false,
      data: { ...published, title: page.title, slug: page.slug, layout, seo: page.seo },
      context,
    })
  }

  // 17. 全局配置
  log('全局配置…')
  const wechatQr = await uploadImage(payload, {
    name: 'wechat-qr',
    alt: '课程顾问微信二维码（示例，不可扫描）',
    kind: 'qr',
    hue: 0,
    aspect: '1:1',
    label: '示例二维码',
    size: 600,
  })
  const globals = buildGlobals({
    wechatQr,
    // 指定全部 8 个方向（桌面端 4 列正好两行）；留空时前台按排序自动取在导航中显示的方向
    hotDisciplines: DISCIPLINES.slice(0, 8).map((d) => disciplineId(d.slug)),
  })
  for (const slug of Object.keys(globals) as GlobalSlug[]) {
    // 各全局配置的数据类型已在 buildGlobals 中按 slug 校验
    await payload.updateGlobal({ slug, data: globals[slug] as never, context })
  }

  // 18. 演示账号与线索
  log('演示账号与线索…')
  const userIds = new Map<string, number>()
  for (const u of SEED_USERS) {
    const doc = await payload.create({
      collection: 'users',
      data: { ...u, campus: u.campus ? campusId(u.campus) : undefined },
      context,
    })
    userIds.set(u.key, doc.id)
  }
  const leads = buildLeads({
    disciplineId,
    courseId,
    userId: (key) => required(userIds, key, '演示账号'),
    days,
  })
  for (const lead of leads) {
    await payload.create({ collection: 'leads', data: lead, context })
  }

  const countEntries = await Promise.all(
    (
      [
        'disciplines',
        'courses',
        'cohorts',
        'software',
        'teachers',
        'works',
        'stories',
        'partners',
        'campuses',
        'articles',
        'faqs',
        'tutorials',
        'quiz-questions',
        'banners',
        'career-events',
        'pages',
        'leads',
        'media',
      ] as const
    ).map(
      async (collection) => [collection, (await payload.count({ collection })).totalDocs] as const,
    ),
  )
  const counts = Object.fromEntries(countEntries)
  const seconds = (Date.now() - started) / 1000
  log(
    `完成（${seconds.toFixed(1)}s，开班计划 ${cohortCount}）：${countEntries.map(([c, n]) => `${c} ${n}`).join('，')}`,
  )
  log(`演示账号（仅限本地开发）：${SEED_USERS.map((u) => `${u.email} / ${u.password}`).join('；')}`)
  return { counts, seconds }
}

/**
 * 清除 Next 的数据缓存（unstable_cache 持久化在 .next/…/fetch-cache，跨构建保留）。
 * 种子脚本在 Next 运行时之外执行，内容钩子不会触发 revalidateTag；重置后 ID 全部变化，
 * 不清除的话，重新构建或重启后的前台仍会读到旧数据（如留资表单里已不存在的专业 ID）。
 */
async function clearNextDataCache(): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const dirs = ['.next/cache/fetch-cache', '.next/dev/cache/fetch-cache'].map((dir) =>
    path.join(root, dir),
  )
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })))
  console.log('[seed] 已清除 Next 数据缓存；正在运行的前台服务需重启后才会显示新数据')
}

// 作为脚本直接运行时（pnpm seed:reset）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  getPayload({ config })
    .then(runSeed)
    .then(clearNextDataCache)
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
}
