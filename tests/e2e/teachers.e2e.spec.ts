import type { Page } from '@playwright/test'
import { getPayload, type Where } from 'payload'

import config from '../../src/payload.config.js'
import type { Discipline, Teacher } from '../../src/payload-types'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 师资：讲师列表 /teachers（专业方向筛选）与讲师详情 /teachers/[slug]，
 * 以及课程详情页讲师卡片进入讲师详情。
 * 内容来自种子数据（scripts/seed/data/teachers.ts 等）；期望值从数据库读取（与页面同一个开发库），
 * 过滤条件与数据层一致，不在测试里写死种子内容。
 * 提交线索的用例用 leadNamespace('teachers', …) 取本文件专属的手机号与模拟 IP，结束后清理。
 */

const SLUG = 'lin-yuqing'

// 开发服务器首次访问某个路由时要现编译，留足时间
test.describe.configure({ timeout: 120_000 })

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 已填充且已发布的关联文档 */
function publishedDoc<T extends { _status?: string | null }>(value: number | T | null | undefined) {
  return value && typeof value === 'object' && value._status === 'published' ? value : null
}

type TeacherFacts = {
  teacher: Teacher
  disciplines: Discipline[]
  campus: { name: string; slug: string; city: string } | null
  courses: { slug: string; title: string }[]
  workCount: number
}

/** 从数据库读取讲师及其已发布的专业方向、校区、授课课程与作品（与数据层的过滤条件一致） */
async function readTeacher(slug: string): Promise<TeacherFacts> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'teachers',
    where: { and: [published, { slug: { equals: slug } }] },
    depth: 1,
    joins: false,
    limit: 1,
    pagination: false,
  })
  const teacher = docs[0]
  if (!teacher) throw new Error(`种子数据缺少讲师 ${slug}`)
  const disciplines = (teacher.disciplines ?? [])
    .map((value) => publishedDoc(value))
    .filter((value) => value !== null)
  const campus = publishedDoc(teacher.campus)

  const courses = await payload.find({
    collection: 'courses',
    where: {
      and: [
        published,
        { 'discipline._status': { equals: 'published' } },
        { teachers: { in: [teacher.id] } },
      ],
    },
    depth: 0,
    pagination: false,
    select: { slug: true, title: true },
  })
  const courseIds = courses.docs.map((course) => course.id)
  const works =
    courseIds.length > 0
      ? await payload.count({
          collection: 'works',
          where: {
            and: [published, { consentConfirmed: { equals: true } }, { course: { in: courseIds } }],
          },
        })
      : { totalDocs: 0 }

  return {
    teacher,
    disciplines,
    campus: campus ? { name: campus.name, slug: campus.slug, city: campus.city } : null,
    courses: courses.docs.map(({ slug: courseSlug, title }) => ({ slug: courseSlug, title })),
    workCount: works.totalDocs,
  }
}

type TeacherListFacts = {
  /** 已发布讲师（后台排序 → ID） */
  teachers: { name: string; slug: string; disciplineSlugs: string[] }[]
  /** 已发布的专业方向（后台排序） */
  disciplines: { slug: string; shortName: string }[]
  listTitle: string
}

async function readTeacherList(): Promise<TeacherListFacts> {
  const payload = await getPayload({ config })
  const [teachers, disciplines, settings] = await Promise.all([
    payload.find({
      collection: 'teachers',
      where: published,
      depth: 1,
      joins: false,
      sort: ['order', 'id'],
      pagination: false,
      select: { name: true, slug: true, disciplines: true },
    }),
    payload.find({
      collection: 'disciplines',
      where: published,
      depth: 0,
      sort: ['order', 'id'],
      pagination: false,
      select: { slug: true, shortName: true, name: true },
    }),
    payload.findGlobal({ slug: 'teacher-pages', depth: 0 }),
  ])
  return {
    teachers: teachers.docs.map((teacher) => ({
      name: teacher.name,
      slug: teacher.slug,
      disciplineSlugs: (teacher.disciplines ?? [])
        .map((value) => publishedDoc(value))
        .filter((value) => value !== null)
        .map((discipline) => discipline.slug),
    })),
    disciplines: disciplines.docs.map((d) => ({ slug: d.slug, shortName: d.shortName || d.name })),
    listTitle: settings.list?.title?.trim() || '师资团队',
  }
}

type JsonLdNode = { '@type': string; [key: string]: unknown }

async function readJsonLd(page: Page): Promise<JsonLdNode[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
  return scripts.map((text) => JSON.parse(text) as JsonLdNode)
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '页面不应出现横向滚动').toBe(0)
}

/** 讲师网格里各讲师的姓名（h2，按页面顺序） */
function teacherNames(page: Page) {
  return page.getByRole('main').getByRole('listitem').getByRole('heading', { level: 2 })
}

/** 结尾表单水合后提交按钮才可用；以此确认页面已接管（页面级留资上下文也已写入） */
async function waitForHydration(page: Page) {
  await expect(page.locator('#teacher-cta').getByRole('button', { name: '立即预约' })).toBeEnabled()
}

test.describe('讲师列表', () => {
  test('列出全部已发布讲师（后台排序），卡片整体链接到讲师详情；规范地址可收录', async ({
    page,
  }) => {
    const { teachers, listTitle } = await readTeacherList()
    expect(teachers.length).toBeGreaterThan(0)
    const response = await page.goto('/teachers')
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(listTitle)
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByText(listTitle, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    const filter = page.getByRole('navigation', { name: '讲师筛选' })
    await expect(filter.getByRole('status')).toHaveText(`共 ${teachers.length} 位讲师`)
    await expect(filter.getByRole('link', { name: /^全部/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(teacherNames(page)).toHaveText(teachers.map((teacher) => teacher.name))

    for (const teacher of teachers) {
      await expect(page.getByRole('link', { name: teacher.name, exact: true })).toHaveAttribute(
        'href',
        new RegExp(`/teachers/${teacher.slug}$`),
      )
    }

    // 元数据：canonical 为 /teachers，可收录
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/teachers$/)
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })

  test('首屏一行头像立即加载（最大内容绘制不是懒加载图片），其余懒加载；课程详情里的讲师头像全部懒加载', async ({
    page,
  }) => {
    const { teachers } = await readTeacherList()
    await page.goto('/teachers')
    const cards = page
      .getByRole('main')
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { level: 2 }) })
    await expect(cards).toHaveCount(teachers.length)
    const loading = await cards.evaluateAll((items) =>
      items.map((item) => {
        const img = item.querySelector('img')
        return img ? [img.getAttribute('loading'), img.getAttribute('fetchpriority')] : null
      }),
    )
    expect(loading.filter((value) => value !== null).length, '种子讲师应有头像').toBeGreaterThan(0)
    // 第一行（≥ lg 4 列）立即加载并提高优先级，其余懒加载
    loading.forEach((value, index) => {
      if (value) {
        expect(value, `第 ${index + 1} 位讲师的头像`).toEqual(
          index < 4 ? ['eager', 'high'] : ['lazy', null],
        )
      }
    })

    // 首屏最大内容绘制（LCP）若是图片，不能是懒加载的
    const lcp = await page.evaluate(
      () =>
        new Promise<{ tag: string; loading: string | null } | null>((resolve) => {
          new PerformanceObserver((list) => {
            const entry: (PerformanceEntry & { element?: Element | null }) | undefined = list
              .getEntries()
              .at(-1)
            const element = entry?.element
            resolve(
              element ? { tag: element.tagName, loading: element.getAttribute('loading') } : null,
            )
          }).observe({ type: 'largest-contentful-paint', buffered: true })
          setTimeout(() => resolve(null), 3000)
        }),
    )
    if (lcp?.tag === 'IMG') expect(lcp.loading, '首屏最大的图片不应懒加载').not.toBe('lazy')

    // 课程详情的讲师网格在首屏之下：全部懒加载
    const { courses } = await readTeacher(SLUG)
    await page.goto(`/courses/${courses[0]!.slug}`)
    const courseAvatars = await page
      .getByRole('region', { name: '授课讲师' })
      .locator('img')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('loading')))
    expect(courseAvatars.length).toBeGreaterThan(0)
    expect(courseAvatars.every((value) => value === 'lazy')).toBe(true)
  })

  test('按专业方向筛选：同步 URL、数量与当前项；再点一次取消；清除筛选', async ({ page }) => {
    const { teachers, disciplines } = await readTeacherList()
    // 选一个有讲师、但不是全部讲师都属于的专业方向
    const target = disciplines.find((discipline) => {
      const count = teachers.filter((t) => t.disciplineSlugs.includes(discipline.slug)).length
      return count > 0 && count < teachers.length
    })
    expect(target, '种子数据中应有只包含部分讲师的专业方向').toBeTruthy()
    const expected = teachers.filter((t) => t.disciplineSlugs.includes(target!.slug))

    await page.goto('/teachers')
    const filter = page.getByRole('navigation', { name: '讲师筛选' })
    // 筛选项不传递权重、不预取
    const option = filter.getByRole('link', { name: new RegExp(`^${target!.shortName}`) })
    await expect(option).toHaveAttribute('rel', 'nofollow')
    await option.click()

    await expect(page).toHaveURL(new RegExp(`/teachers\\?discipline=${target!.slug}$`))
    await expect(option).toHaveAttribute('aria-current', 'true')
    await expect(filter.getByRole('status')).toHaveText(`共 ${expected.length} 位讲师`)
    await expect(teacherNames(page)).toHaveText(expected.map((teacher) => teacher.name))

    await expectNoHorizontalOverflow(page)

    // 再点一次当前项即取消
    await option.click()
    await expect(page).toHaveURL(/\/teachers$/)
    await expect(teacherNames(page)).toHaveCount(teachers.length)

    // 清除筛选
    await option.click()
    await expect(page).toHaveURL(new RegExp(`discipline=${target!.slug}$`))
    await filter.getByRole('link', { name: '清除筛选' }).click()
    await expect(page).toHaveURL(/\/teachers$/)
    await expect(filter.getByRole('link', { name: '清除筛选' })).toHaveCount(0)
    await expect(teacherNames(page)).toHaveCount(teachers.length)
  })

  test('有筛选参数时 noindex, follow，规范地址始终是 /teachers', async ({ page, isMobile }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const robots = page.locator('meta[name="robots"]')
    const canonical = page.locator('link[rel="canonical"]')
    const { disciplines } = await readTeacherList()

    await page.goto(`/teachers?discipline=${disciplines[0]!.slug}`)
    await expect(robots).toHaveAttribute('content', /noindex/)
    await expect(robots).not.toHaveAttribute('content', /nofollow/)
    await expect(robots).toHaveAttribute('content', /follow/)
    await expect(canonical).toHaveAttribute('href', /\/teachers$/)

    // 非法取值也算带参数：按“全部”展示，但同样 noindex
    await page.goto('/teachers?discipline=%E4%B8%89%E7%BB%B4')
    await expect(robots).toHaveAttribute('content', /noindex/)
    await expect(
      page.getByRole('navigation', { name: '讲师筛选' }).getByRole('link', { name: /^全部/ }),
    ).toHaveAttribute('aria-current', 'true')
  })

  test('筛选无结果时显示空状态，可清除筛选回到全部讲师', async ({ page }) => {
    const { teachers } = await readTeacherList()
    const response = await page.goto('/teachers?discipline=no-such-major')
    expect(response?.status()).toBe(200)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    const empty = page.getByRole('region', { name: '没有符合条件的讲师' })
    await expect(empty).toBeVisible()
    await expect(empty.getByRole('link', { name: '查看专业课程' })).toHaveAttribute(
      'href',
      /\/courses$/,
    )
    await expectNoHorizontalOverflow(page)

    await empty.getByRole('link', { name: '清除筛选' }).click()
    await expect(page).toHaveURL(/\/teachers$/)
    await expect(teacherNames(page)).toHaveCount(teachers.length)
  })

  test('点击讲师卡片进入讲师详情', async ({ page }) => {
    const { teachers } = await readTeacherList()
    const first = teachers[0]!
    await page.goto('/teachers')
    await page.getByRole('link', { name: first.name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/teachers/${first.slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(first.name)
  })
})

test.describe('讲师详情', () => {
  test('首屏：姓名、头衔、从业年限、校区（链接到校区详情）、专业方向（链接可访问）、擅长领域与预约试听', async ({
    page,
  }) => {
    const { teacher, disciplines, campus } = await readTeacher(SLUG)
    const { listTitle } = await readTeacherList()
    const response = await page.goto(`/teachers/${SLUG}`)
    expect(response?.status()).toBe(200)

    const hero = page.getByRole('region', { name: teacher.name, exact: true })
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(teacher.name)
    await expect(hero.getByText(teacher.title, { exact: true })).toBeVisible()
    await expect(hero.getByRole('img', { name: /./ }).first()).toBeVisible()
    await expect(hero.getByRole('button', { name: '预约试听' })).toBeVisible()

    // 面包屑：首页 › 师资团队（/teachers）› 当前讲师
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByRole('link', { name: listTitle })).toHaveAttribute(
      'href',
      /\/teachers$/,
    )
    await expect(breadcrumbs.getByText(teacher.name, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    const facts = hero.locator('dl')
    const fact = (label: string) =>
      facts
        .locator('div')
        .filter({ has: page.locator('dt', { hasText: label }) })
        .locator('dd')
    await expect(fact('从业年限')).toHaveText(`${teacher.yearsOfExperience} 年`)
    expect(campus, '种子讲师应有已发布的校区').toBeTruthy()
    await expect(fact('所在校区')).toContainText(campus!.name)
    await expect(fact('所在校区').getByRole('link')).toHaveAttribute(
      'href',
      new RegExp(`/campuses/${campus!.slug}$`),
    )

    const disciplineLinks = fact('专业方向').getByRole('link')
    await expect(disciplineLinks).toHaveText(disciplines.map((d) => d.name))
    for (const discipline of disciplines) {
      await expect(fact('专业方向').getByRole('link', { name: discipline.name })).toHaveAttribute(
        'href',
        new RegExp(`/majors/${discipline.slug}$`),
      )
      const res = await page.request.get(`/majors/${discipline.slug}`)
      expect(res.status(), `/majors/${discipline.slug}`).toBe(200)
    }
    await expect(fact('擅长领域').getByRole('listitem')).toHaveText(
      (teacher.specialties ?? []).map((specialty) => specialty.text),
    )

    // 元数据：canonical 为本页；标题含姓名
    await expect(page).toHaveTitle(new RegExp(teacher.name))
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/teachers/${SLUG}$`),
    )
    await expectNoHorizontalOverflow(page)
  })

  test('个人简介（h2）、从业经历时间线、授课课程（可访问）与学员作品（链接到作品详情）', async ({
    page,
  }) => {
    const { teacher, courses, workCount } = await readTeacher(SLUG)
    expect(courses.length).toBeGreaterThan(0)
    expect(workCount).toBeGreaterThan(0)
    await page.goto(`/teachers/${SLUG}`)

    const bio = page.getByRole('region', { name: '个人简介' })
    await expect(bio.getByRole('heading', { level: 2, name: '个人简介' })).toBeVisible()
    await expect(bio.locator('.prose-zh p').first()).toBeVisible()
    await expect(bio.locator('.prose-zh h1, .prose-zh h2')).toHaveCount(0)

    const experience = page.getByRole('region', { name: '从业经历' })
    const items = experience.locator('ol > li')
    await expect(items).toHaveCount(teacher.experience?.length ?? 0)
    const first = teacher.experience?.[0]
    if (first) {
      await expect(items.first()).toContainText(first.role)
      await expect(items.first()).toContainText(first.org)
    }

    const courseSection = page.getByRole('region', { name: '授课课程' })
    await expect(courseSection.getByText(`共 ${courses.length} 门课程`)).toBeVisible()
    const titles = await courseSection.getByRole('heading', { level: 3 }).allTextContents()
    expect([...titles].sort()).toEqual(courses.map((course) => course.title).sort())
    for (const course of courses) {
      const link = courseSection
        .getByRole('heading', { level: 3, name: course.title })
        .getByRole('link')
      await expect(link).toHaveAttribute('href', new RegExp(`/courses/${course.slug}$`))
      const res = await page.request.get(`/courses/${course.slug}`)
      expect(res.status(), `/courses/${course.slug}`).toBe(200)
    }

    const works = page.getByRole('region', { name: '学员作品' })
    await expect(works).toHaveClass(/surface-dark/)
    const workLinks = works.locator('a[href*="/works/"]')
    await expect(workLinks).toHaveCount(Math.min(8, workCount))
    const hrefs = await workLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? ''),
    )
    for (const href of hrefs) expect(href).toMatch(/\/works\/\d+$/)
    const res = await page.request.get(hrefs[0]!)
    expect(res.status(), hrefs[0]).toBe(200)
    await expect(works.getByRole('link', { name: /查看全部作品/ })).toHaveAttribute(
      'href',
      /\/works$/,
    )
    await expectNoHorizontalOverflow(page)
  })

  test('结尾表单：位置 teacher_cta、预选第一个专业方向，页脚行动号召横幅隐藏；提交后线索记录专业与来源', async ({
    page,
  }, testInfo) => {
    const ns = leadNamespace('teachers', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const { disciplines } = await readTeacher(SLUG)
    const discipline = disciplines[0]
    expect(discipline, '种子讲师应有已发布的专业方向').toBeTruthy()
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto(`/teachers/${SLUG}`)
    try {
      await waitForHydration(page)
      // 页面以表单收尾：页脚的行动号召横幅隐藏
      await expect(page.locator('[data-footer-cta]')).toHaveCount(1)
      await expect(page.locator('[data-footer-cta]')).toBeHidden()

      const cta = page.locator('#teacher-cta')
      await expect(cta.locator('input[name="position"]')).toHaveValue('teacher_cta')
      await expect(cta.getByLabel('意向专业')).toHaveValue(String(discipline!.id))

      await cta.getByLabel('姓名').fill('讲师页测试')
      await cta.getByLabel('手机号').fill(phone)
      await cta.getByLabel('所在城市').selectOption('北京')
      await cta.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await cta.getByRole('button', { name: '立即预约' }).click()
      await expect(cta.getByRole('heading', { name: '提交成功' })).toBeVisible()

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '讲师页测试',
        intent: 'trial',
        discipline: discipline!.id,
        city: '北京',
        source: { position: 'teacher_cta' },
        client: { ip },
      })
      expect(lead?.context?.course ?? null).toBeNull()
      expect(lead?.source?.pageUrl).toContain(`/teachers/${SLUG}`)
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('首屏“预约试听”与全站按钮打开的弹窗都预选讲师的专业方向（页面级留资上下文）', async ({
    page,
    isMobile,
  }) => {
    const { teacher, disciplines } = await readTeacher(SLUG)
    const disciplineId = String(disciplines[0]!.id)
    await page.goto(`/teachers/${SLUG}`)
    await waitForHydration(page)

    await page
      .getByRole('region', { name: teacher.name, exact: true })
      .getByRole('button', { name: '预约试听' })
      .click()
    let dialog = page.getByRole('dialog', { name: '预约免费试听' })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input[name="position"]')).toHaveValue('teacher_hero')
    await expect(dialog.getByLabel('意向专业')).toHaveValue(disciplineId)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // 头部按钮（桌面）/ 底部操作条（移动端）没有显式传专业，由页面上下文补上
    if (isMobile) {
      await page
        .getByRole('navigation', { name: '快捷咨询' })
        .getByRole('button', { name: '预约试听' })
        .click()
    } else {
      await page.getByRole('banner').getByRole('button', { name: '预约试听' }).click()
    }
    dialog = page.getByRole('dialog', { name: '预约免费试听' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('意向专业')).toHaveValue(disciplineId)
    await expect(dialog.locator('input[name="course"]')).toHaveCount(0)
  })

  test('结构化数据：Person（姓名、头衔、头像、机构、擅长领域）与 BreadcrumbList（3 级）', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const { teacher, disciplines } = await readTeacher(SLUG)
    await page.goto(`/teachers/${SLUG}`)
    const nodes = await readJsonLd(page)

    const person = nodes.find((node) => node['@type'] === 'Person')
    expect(person).toMatchObject({
      name: teacher.name,
      jobTitle: teacher.title,
      worksFor: { '@type': 'Organization' },
    })
    expect(new URL(String(person?.url)).pathname).toBe(`/teachers/${SLUG}`)
    expect(String(person?.image)).toMatch(/^https?:\/\/.+\/api\/media\/file\//)
    expect(person?.knowsAbout).toEqual(expect.arrayContaining(disciplines.map((d) => d.name)))

    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb?.itemListElement).toHaveLength(3)
  })

  test('课程详情页的讲师卡片可进入讲师详情', async ({ page }) => {
    const { teacher, courses } = await readTeacher(SLUG)
    const course = courses[0]!
    await page.goto(`/courses/${course.slug}`)
    const section = page.getByRole('region', { name: '授课讲师' })
    await section.getByRole('link', { name: teacher.name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/teachers/${SLUG}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(teacher.name)
  })

  test.describe('不存在的讲师', () => {
    // 浏览器会把 404 响应记为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('返回 404 页面', async ({ page }) => {
      const response = await page.goto('/teachers/not-a-real-teacher')
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面不存在或已下线')
      await expectNoHorizontalOverflow(page)
    })
  })
})
