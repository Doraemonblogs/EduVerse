import type { Page } from '@playwright/test'
import { getPayload } from 'payload'

import { upcomingCohorts } from '../../src/lib/course/cohorts'
import { formatCohortDate, toBeijingIsoDate } from '../../src/lib/course/format'
import config from '../../src/payload.config.js'
import type { Cohort, Course, Discipline } from '../../src/payload-types'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 课程详情 /courses/[slug]。内容来自种子数据（scripts/seed/data/courses.ts）：
 * - 三维动画设计长期就业班：长期班，有课程自己的薪资参考、实训项目、作品、讲师；
 * - Blender 三维入门班：短期班、纯线上，没有自己的薪资参考（继承所属专业方向）。
 * 期望值从数据库读取（与页面同一个开发库），不在测试里写死种子内容。
 * 提交线索的用例用 leadNamespace('course-detail', …) 取本文件专属的手机号与模拟 IP，结束后清理。
 */

const LONG_TERM = '3d-animation-career'
const SHORT_TERM = 'blender-3d-foundation'

type CourseFacts = {
  course: Course
  discipline: Discipline
  cohorts: Cohort[]
  disclaimer: string
}

async function readCourse(slug: string): Promise<CourseFacts> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'courses',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
    pagination: false,
  })
  const course = docs[0]
  if (!course || typeof course.discipline !== 'object') throw new Error(`种子数据缺少课程 ${slug}`)
  const [cohorts, settings] = await Promise.all([
    payload.find({
      collection: 'cohorts',
      where: { and: [{ course: { equals: course.id } }, { status: { not_equals: 'closed' } }] },
      depth: 0,
      sort: 'startDate',
      pagination: false,
    }),
    payload.findGlobal({ slug: 'site-settings', depth: 0 }),
  ])
  return {
    course,
    discipline: course.discipline,
    cohorts: cohorts.docs,
    disclaimer: settings.salaryDisclaimer,
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

/** 侧栏表单水合后提交按钮才可用；以此确认页面已接管（页面级留资上下文也已写入） */
async function waitForHydration(page: Page) {
  await expect(
    page.getByRole('complementary', { name: '预约免费试听' }).getByRole('button', {
      name: '立即预约',
    }),
  ).toBeEnabled()
}

const SECTION_TITLES = [
  '课程亮点',
  '课程大纲',
  '实训项目',
  '学员作品',
  '授课讲师',
  '开班计划',
  '就业方向',
  '常见问题',
] as const

test.describe('课程详情', () => {
  test('首屏：面包屑、徽标、课程名、关键信息与两个按钮', async ({ page }) => {
    const { course, discipline } = await readCourse(LONG_TERM)
    const response = await page.goto(`/courses/${LONG_TERM}`)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.title)
    await expect(page).toHaveTitle(new RegExp(course.title))
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/courses/${LONG_TERM}$`),
    )

    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByRole('link', { name: '专业课程' })).toHaveAttribute(
      'href',
      /\/courses$/,
    )
    await expect(breadcrumbs.getByRole('link', { name: discipline.name })).toHaveAttribute(
      'href',
      new RegExp(`/majors/${discipline.slug}$`),
    )
    await expect(breadcrumbs.getByText(course.title, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    const hero = page.getByRole('region', { name: course.title })
    await expect(hero.getByText('长期就业班').first()).toBeVisible()
    const facts = hero.locator('dl')
    const fact = (label: string) => facts.locator('div').filter({ has: page.getByText(label) })
    await expect(fact('课程时长').locator('dd')).toHaveText(`${course.duration.value} 个月`)
    await expect(fact('班型').locator('dd')).toHaveText('长期就业班')
    await expect(fact('授课方式').locator('dd')).toHaveText('线下面授 / 双师课堂')
    await expect(fact('上课时间').locator('dd')).toHaveText(course.schedule ?? '')
    // 校区名已含城市时只显示校区名，不再重复城市（“北京·北京海淀校区”）
    await expect(fact('开设校区').locator('dd')).toContainText('北京海淀校区')
    await expect(fact('开设校区').locator('dd')).not.toContainText('北京·')
    // 开设校区链接到校区详情（只含已发布的校区）
    await expect(
      fact('开设校区').locator('dd').getByRole('link', { name: '北京海淀校区' }),
    ).toHaveAttribute('href', /\/campuses\/beijing-haidian$/)
    await expect(fact('近期开班').locator('dd')).toContainText(/\d{4}年\d{1,2}月\d{1,2}日/)

    await expect(hero.getByRole('button', { name: '预约试听' })).toBeVisible()
    await expect(hero.getByRole('button', { name: '咨询学费' })).toBeVisible()

    // 首屏大图是唯一预加载、不懒加载的图片，主内容里其余图片都懒加载
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1)
    await expect(hero.getByRole('img')).not.toHaveAttribute('loading', 'lazy')
    const eager = await page
      .locator('main img')
      .evaluateAll((imgs) => imgs.filter((img) => img.getAttribute('loading') !== 'lazy').length)
    expect(eager, '只有首屏大图立即加载').toBe(1)
  })

  test('页内导航列出全部区块，各区块标题可见；同专业其它课程链接到详情页', async ({ page }) => {
    await page.goto(`/courses/${LONG_TERM}`)
    const nav = page.getByRole('navigation', { name: '课程内容' })
    await expect(nav.getByRole('link')).toHaveCount(SECTION_TITLES.length)

    for (const title of SECTION_TITLES) {
      const heading = page.getByRole('heading', { level: 2, name: title, exact: true })
      await heading.scrollIntoViewIfNeeded()
      await expect(heading).toBeVisible()
    }
    await expect(page.getByRole('heading', { level: 3, name: '适合人群' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: '所用软件' })).toBeVisible()

    const related = page.getByRole('region', { name: '同专业其它课程' })
    const cards = related.getByRole('article')
    await expect(cards).not.toHaveCount(0)
    const link = cards.first().getByRole('heading', { level: 3 }).getByRole('link')
    await expect(link).toHaveAttribute('href', /\/courses\/[a-z0-9-]+$/)
    await expect(link).not.toHaveAttribute('href', new RegExp(`/courses/${LONG_TERM}$`))
  })

  test('课程大纲：第一阶段默认展开，其它阶段可用键盘展开 / 收起', async ({ page }) => {
    await page.goto(`/courses/${LONG_TERM}`)
    const stages = page.getByRole('region', { name: '课程大纲' }).locator('details')
    await expect(stages.first()).toHaveAttribute('open', '')

    const second = stages.nth(1)
    await expect(second).not.toHaveAttribute('open')
    await second.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(second).toHaveAttribute('open', '')
    await expect(second.getByText('阶段目标')).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(second).not.toHaveAttribute('open')
    await expect(second.getByText('阶段目标')).toBeHidden()
  })

  test('开班计划只显示今天（北京时间）及以后的开班，按日期升序', async ({ page }) => {
    const { cohorts } = await readCourse(LONG_TERM)
    await page.goto(`/courses/${LONG_TERM}`)
    const expected = upcomingCohorts(
      cohorts.map((cohort) => ({ startDate: cohort.startDate, status: cohort.status })),
      new Date(),
    ).map((cohort) => formatCohortDate(cohort.startDate))
    expect(expected.length, '种子数据应有未开班的开班计划').toBeGreaterThan(0)

    const rows = page.getByRole('region', { name: '开班计划' }).getByRole('listitem')
    await expect(rows).toHaveCount(expected.length)
    const shown = await rows.evaluateAll((items) =>
      items.map((item) => item.querySelector('p')?.textContent?.trim() ?? ''),
    )
    expect(shown).toEqual(expected)

    const today = toBeijingIsoDate(new Date())
    for (const text of shown) {
      const [, y, m, d] = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(text) ?? []
      const iso = `${y}-${m?.padStart(2, '0')}-${d?.padStart(2, '0')}`
      expect(iso >= today, `${text} 不应早于今天`).toBe(true)
    }
    // 每行都有预约试听（读屏名称包含开班日期与地点）
    await expect(rows.first().getByRole('button', { name: /^预约试听：/ })).toBeVisible()
    // 线下开班的校区链接到校区详情
    const campusHrefs = await rows
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
    expect(campusHrefs.length, '种子数据应有线下校区的开班').toBeGreaterThan(0)
    for (const href of campusHrefs) expect(href).toMatch(/\/campuses\/[a-z0-9-]+$/)
  })

  test('长期班：薪资卡显示课程自己的区间、来源、统计时间与免责声明', async ({ page }) => {
    const { course, disclaimer } = await readCourse(LONG_TERM)
    expect(course.salaryRef?.range, '长期班种子数据有薪资参考').toBeTruthy()
    await page.goto(`/courses/${LONG_TERM}`)

    const careers = page.getByRole('region', { name: '就业方向' })
    await expect(careers.getByRole('heading', { name: '薪资参考' })).toBeVisible()
    await expect(careers.getByText(course.salaryRef?.range ?? '', { exact: true })).toBeVisible()
    await expect(careers.getByText(`数据来源：${course.salaryRef?.source}`)).toBeVisible()
    await expect(careers.getByText(`统计时间：${course.salaryRef?.statDate}`)).toBeVisible()
    await expect(careers.getByText(disclaimer, { exact: true })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('短期班：没有自己的薪资参考时显示所属专业方向的薪资，同样带免责声明', async ({ page }) => {
    const { course, discipline, disclaimer } = await readCourse(SHORT_TERM)
    expect(course.salaryRef?.range ?? null, '短期班种子数据没有薪资参考').toBeNull()
    expect(discipline.salaryRef?.range, '专业方向有薪资参考').toBeTruthy()
    await page.goto(`/courses/${SHORT_TERM}`)

    const careers = page.getByRole('region', { name: '就业方向' })
    await expect(
      careers.getByText(discipline.salaryRef?.range ?? '', { exact: true }),
    ).toBeVisible()
    await expect(careers.getByText(`数据来源：${discipline.salaryRef?.source}`)).toBeVisible()
    await expect(careers.getByText(`统计时间：${discipline.salaryRef?.statDate}`)).toBeVisible()
    await expect(careers.getByText(disclaimer, { exact: true })).toBeVisible()

    // 纯线上课程：开设校区显示“线上”
    const facts = page.getByRole('region', { name: course.title }).locator('dl')
    await expect(
      facts
        .locator('div')
        .filter({ has: page.getByText('开设校区') })
        .locator('dd'),
    ).toHaveText('线上')
  })

  test('页内导航：点击锚点跳到对应区块，标题不被吸顶头部与导航遮挡', async ({ page, isMobile }) => {
    await page.goto(`/courses/${LONG_TERM}`)
    await waitForHydration(page)
    const nav = page.getByRole('navigation', { name: '课程内容' })

    if (isMobile) {
      // 移动端横向滚动、不吸顶，页面本身不横向滚动
      const scrollable = await nav
        .getByRole('list')
        .evaluate((list) => list.scrollWidth > list.clientWidth)
      expect(scrollable, '移动端页内导航应可横向滚动').toBe(true)
      await expectNoHorizontalOverflow(page)
    }

    const link = nav.getByRole('link', { name: '常见问题' })
    await link.click()
    await expect(page).toHaveURL(/#faqs$/)
    const heading = page.getByRole('heading', { level: 2, name: '常见问题' })
    await expect(heading).toBeInViewport()

    const headerBox = await page.getByRole('banner').boundingBox()
    const headingBox = await heading.boundingBox()
    expect(headerBox && headingBox).toBeTruthy()
    let coveredUntil = headerBox!.y + headerBox!.height
    if (!isMobile) {
      // 桌面端：导航吸顶在头部下沿（头部 64px 高，1px 下边框压在导航上），并高亮当前区块
      const navBox = await nav.boundingBox()
      expect(Math.abs(navBox!.y - coveredUntil)).toBeLessThanOrEqual(1)
      coveredUntil = navBox!.y + navBox!.height
      await expect(link).toHaveAttribute('aria-current', 'true')
    }
    expect(headingBox!.y, '区块标题不应被吸顶元素遮住').toBeGreaterThanOrEqual(coveredUntil)
  })

  test('结构化数据：Course（含开班实例）、FAQPage 与 BreadcrumbList', async ({ page }) => {
    const { course, cohorts } = await readCourse(LONG_TERM)
    await page.goto(`/courses/${LONG_TERM}`)
    const nodes = await readJsonLd(page)

    const courseNode = nodes.find((node) => node['@type'] === 'Course')
    expect(courseNode, '页面应包含 Course').toBeDefined()
    expect(courseNode).toMatchObject({
      name: course.title,
      url: expect.stringMatching(new RegExp(`^https?://.+/courses/${LONG_TERM}$`)),
      image: expect.stringMatching(/^https?:\/\//),
      provider: { '@type': 'Organization' },
    })
    expect(courseNode).not.toHaveProperty('offers')
    const instances = courseNode!.hasCourseInstance as Record<string, unknown>[]
    const upcoming = upcomingCohorts(
      cohorts.map((cohort) => ({ startDate: cohort.startDate, status: cohort.status })),
      new Date(),
    )
    expect(instances).toHaveLength(upcoming.length)
    for (const instance of instances) {
      expect(instance).toMatchObject({
        '@type': 'CourseInstance',
        courseMode: expect.stringMatching(/^(Onsite|Online|Blended)$/),
        startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    }

    const faq = nodes.find((node) => node['@type'] === 'FAQPage')
    expect(faq, '页面应包含 FAQPage').toBeDefined()
    expect(faq!.mainEntity).toHaveLength(course.faqs?.length ?? 0)

    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb!.itemListElement).toHaveLength(4)
  })

  test('从侧栏提交线索：记录课程、专业与位置 course_sidebar', async ({ page }, testInfo) => {
    const ns = leadNamespace('course-detail', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const { course, discipline } = await readCourse(LONG_TERM)
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto(`/courses/${LONG_TERM}`)
    try {
      await waitForHydration(page)
      const sidebar = page.getByRole('complementary', { name: '预约免费试听' })
      // 侧栏展示课程摘要，意向专业预选本课程所属专业
      await expect(sidebar.getByText(course.title, { exact: true })).toBeVisible()
      await expect(sidebar.getByLabel('意向专业')).toHaveValue(String(discipline.id))

      await sidebar.getByLabel('姓名').fill('详情页测试')
      await sidebar.getByLabel('手机号').fill(phone)
      await sidebar.getByLabel('所在城市').selectOption('北京')
      await sidebar.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await sidebar.getByRole('button', { name: '立即预约' }).click()
      await expect(sidebar.getByRole('heading', { name: '提交成功' })).toBeVisible()

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '详情页测试',
        intent: 'trial',
        discipline: discipline.id,
        city: '北京',
        source: { position: 'course_sidebar' },
        context: { course: course.id },
        client: { ip },
      })
      expect(lead?.source?.pageUrl).toContain(`/courses/${LONG_TERM}`)
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('移动端底部操作条“预约试听”带上页面的课程上下文', async ({ page, isMobile }, testInfo) => {
    test.skip(!isMobile, '移动端专属')
    const ns = leadNamespace('course-detail', testInfo)
    const ip = testIp(ns, 2)
    const phone = testPhone(ns, 2)
    const { course, discipline } = await readCourse(LONG_TERM)
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto(`/courses/${LONG_TERM}`)
    try {
      await waitForHydration(page)
      await page
        .getByRole('navigation', { name: '快捷咨询' })
        .getByRole('button', { name: '预约试听' })
        .click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByLabel('意向专业')).toHaveValue(String(discipline.id))

      await dialog.getByLabel('姓名').fill('详情页测试')
      await dialog.getByLabel('手机号').fill(phone)
      await dialog.getByRole('checkbox').check()
      await page.waitForTimeout(2200)
      await dialog.getByRole('button', { name: '立即预约' }).click()
      await expect(dialog.getByRole('heading', { name: '提交成功' })).toBeVisible()

      expect(await findLeadByPhone(phone)).toMatchObject({
        intent: 'trial',
        discipline: discipline.id,
        source: { position: 'mobile_action_bar' },
        context: { course: course.id },
      })
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('桌面端：头部按钮与首屏“咨询学费”打开的弹窗都带上课程', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属')
    const { course, discipline } = await readCourse(LONG_TERM)
    await page.goto(`/courses/${LONG_TERM}`)
    await waitForHydration(page)

    await page.getByRole('banner').getByRole('button', { name: '预约试听' }).click()
    let dialog = page.getByRole('dialog')
    await expect(dialog.locator('input[name="position"]')).toHaveValue('header_cta')
    await expect(dialog.locator('input[name="course"]')).toHaveValue(String(course.id))
    await expect(dialog.getByLabel('意向专业')).toHaveValue(String(discipline.id))
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await page
      .getByRole('region', { name: course.title })
      .getByRole('button', { name: '咨询学费' })
      .click()
    dialog = page.getByRole('dialog', { name: '咨询学费' })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input[name="intent"]')).toHaveValue('tuition')
    await expect(dialog.locator('input[name="position"]')).toHaveValue('course_hero')
    await expect(dialog.locator('input[name="course"]')).toHaveValue(String(course.id))
  })

  test('首屏“预约试听”与开班计划每行的按钮：弹窗带上本课程、所属专业与各自的位置', async ({
    page,
  }) => {
    // 期望值来自数据库：按钮把课程与专业的 ID 传反、或位置写错，都会被发现
    const { course, discipline } = await readCourse(LONG_TERM)
    expect(course.id, '课程与专业的 ID 相同时，断言发现不了两者被传反').not.toBe(discipline.id)
    await page.goto(`/courses/${LONG_TERM}`)
    await waitForHydration(page)

    const expectContext = async (position: string) => {
      const dialog = page.getByRole('dialog', { name: '预约免费试听' })
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('input[name="intent"]')).toHaveValue('trial')
      await expect(dialog.locator('input[name="position"]')).toHaveValue(position)
      await expect(dialog.locator('input[name="course"]')).toHaveValue(String(course.id))
      await expect(dialog.getByLabel('意向专业')).toHaveValue(String(discipline.id))
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
    }

    await page
      .getByRole('region', { name: course.title })
      .getByRole('button', { name: '预约试听', exact: true })
      .click()
    await expectContext('course_hero')

    const row = page.getByRole('region', { name: '开班计划' }).getByRole('listitem').first()
    await row.scrollIntoViewIfNeeded()
    await row.getByRole('button', { name: /^预约试听：/ }).click()
    await expectContext('course_cohort')
  })

  test('页面上只有一份留资表单：移动端排在主内容之后', async ({ page, isMobile }) => {
    await page.goto(`/courses/${LONG_TERM}`)
    await expect(page.locator('main form')).toHaveCount(1)
    const sidebar = page.getByRole('complementary', { name: '预约免费试听' })
    const faqBox = await page.getByRole('region', { name: '常见问题' }).boundingBox()
    const sidebarBox = await sidebar.boundingBox()
    if (isMobile) {
      expect(sidebarBox!.y, '移动端侧栏在主内容之后').toBeGreaterThan(faqBox!.y)
    } else {
      expect(sidebarBox!.x, '桌面端侧栏在右栏').toBeGreaterThan(faqBox!.x + faqBox!.width)
      expect(Math.round(sidebarBox!.width)).toBe(360)
    }
    await expectNoHorizontalOverflow(page)
  })

  test.describe('不存在的课程', () => {
    // 浏览器会把 404 响应本身记录为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('未知或格式不合法的 slug 返回 404', async ({ page }) => {
      for (const slug of ['no-such-course', 'Not_A_Slug']) {
        const response = await page.goto(`/courses/${slug}`)
        expect(response?.status()).toBe(404)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面不存在或已下线')
      }
    })
  })
})
