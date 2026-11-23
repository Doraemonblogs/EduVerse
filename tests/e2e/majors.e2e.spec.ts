import type { Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import type { Discipline } from '../../src/payload-types'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 专业方向落地页 /majors/[slug]，以及 /majors → /courses 的重定向。
 * 内容来自种子数据（scripts/seed/data/disciplines.ts 等）；期望值从数据库读取（与页面同一个开发库），
 * 不在测试里写死种子内容。提交线索的用例用 leadNamespace('majors', …) 取本文件专属的手机号与模拟 IP，结束后清理。
 */

const SLUG = '3d-animation'

// 开发服务器首次访问某个路由时要现编译，留足时间
test.describe.configure({ timeout: 120_000 })

type MajorFacts = {
  discipline: Discipline
  courses: { slug: string; title: string }[]
  teacherNames: string[]
  workCount: number
  disclaimer: string
}

/** 从数据库读取专业方向及其已发布的课程、讲师、作品（与数据层的过滤条件一致） */
async function readMajor(slug: string): Promise<MajorFacts> {
  const payload = await getPayload({ config })
  const published = { _status: { equals: 'published' } } as const
  const { docs } = await payload.find({
    collection: 'disciplines',
    where: { and: [published, { slug: { equals: slug } }] },
    depth: 0,
    limit: 1,
    pagination: false,
  })
  const discipline = docs[0]
  if (!discipline) throw new Error(`种子数据缺少专业方向 ${slug}`)
  const [courses, teachers, works, settings] = await Promise.all([
    payload.find({
      collection: 'courses',
      where: { and: [published, { discipline: { equals: discipline.id } }] },
      sort: ['order', 'id'],
      depth: 0,
      pagination: false,
      select: { slug: true, title: true },
    }),
    payload.find({
      collection: 'teachers',
      where: { and: [published, { disciplines: { in: [discipline.id] } }] },
      depth: 0,
      pagination: false,
      select: { name: true },
    }),
    payload.count({
      collection: 'works',
      where: {
        and: [
          published,
          { discipline: { equals: discipline.id } },
          { consentConfirmed: { equals: true } },
        ],
      },
    }),
    payload.findGlobal({ slug: 'site-settings', depth: 0 }),
  ])
  return {
    discipline,
    courses: courses.docs.map(({ slug: courseSlug, title }) => ({ slug: courseSlug, title })),
    teacherNames: teachers.docs.map((teacher) => teacher.name),
    workCount: works.totalDocs,
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

/** 结尾表单水合后提交按钮才可用；以此确认页面已接管（页面级留资上下文也已写入） */
async function waitForHydration(page: Page) {
  await expect(page.locator('#major-cta').getByRole('button', { name: '立即预约' })).toBeEnabled()
}

test.describe('专业方向落地页', () => {
  test('首屏、专业介绍、发展方向与薪资参考（含来源、统计时间与免责声明）', async ({ page }) => {
    const { discipline, disclaimer } = await readMajor(SLUG)
    const response = await page.goto(`/majors/${SLUG}`)
    expect(response?.status()).toBe(200)

    // 首屏：h1、一句话定位、两个转化按钮
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(discipline.name)
    if (discipline.tagline) await expect(page.getByText(discipline.tagline)).toBeVisible()
    const hero = page.getByRole('region', { name: discipline.name, exact: true })
    await expect(hero.getByRole('button', { name: '预约试听' })).toBeVisible()
    await expect(hero.getByRole('button', { name: '领取学习资料' })).toBeVisible()

    // 面包屑：首页 › 专业课程（/courses）› 当前专业
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByRole('link', { name: '专业课程' })).toHaveAttribute(
      'href',
      /\/courses$/,
    )
    await expect(breadcrumbs.getByText(discipline.name, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // 元数据：SEO 标题来自后台，canonical 为本页
    if (discipline.seo?.title) await expect(page).toHaveTitle(discipline.seo.title)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/majors/${SLUG}$`),
    )

    // 专业介绍：区块标题 h2，正文小标题降为 h3
    const intro = page.getByRole('region', { name: '专业介绍' })
    await expect(intro.getByRole('heading', { level: 2, name: '专业介绍' })).toBeVisible()
    await expect(intro.getByRole('heading', { level: 3 }).first()).toBeVisible()
    await expect(intro.locator('.prose-zh h2')).toHaveCount(0)

    // 发展方向 + 薪资参考（广告法：出处、统计时间、免责声明）
    const careers = page.getByRole('region', { name: '发展方向' })
    for (const direction of discipline.careerDirections ?? []) {
      await expect(
        careers.getByRole('heading', { level: 3, name: direction.title, exact: true }),
      ).toBeVisible()
    }
    const salary = discipline.salaryRef
    expect(salary?.range, '种子数据中的专业方向应有薪资参考').toBeTruthy()
    await expect(careers.getByText(salary!.range!, { exact: true })).toBeVisible()
    await expect(careers.getByText(`数据来源：${salary!.source}`)).toBeVisible()
    await expect(careers.getByText(`统计时间：${salary!.statDate}`)).toBeVisible()
    await expect(careers.getByText(disclaimer, { exact: true })).toBeVisible()

    await expectNoHorizontalOverflow(page)
  })

  test('开设课程：列出该方向全部已发布课程（h3），卡片链接到可访问的课程详情', async ({ page }) => {
    const { courses } = await readMajor(SLUG)
    expect(courses.length).toBeGreaterThan(0)
    await page.goto(`/majors/${SLUG}`)

    const section = page.getByRole('region', { name: '开设课程' })
    await expect(section.getByText(`共 ${courses.length} 门课程`)).toBeVisible()
    await expect(section.getByRole('heading', { level: 3 })).toHaveText(
      courses.map((course) => course.title),
    )

    for (const course of courses) {
      const link = section.getByRole('heading', { level: 3, name: course.title }).getByRole('link')
      await expect(link).toHaveAttribute('href', new RegExp(`/courses/${course.slug}$`))
      const res = await page.request.get(`/courses/${course.slug}`)
      expect(res.status(), `/courses/${course.slug}`).toBe(200)
    }

    // 点击第一门课程进入详情页
    const first = courses[0]!
    await section.getByRole('heading', { level: 3, name: first.title }).getByRole('link').click()
    await expect(page).toHaveURL(new RegExp(`/courses/${first.slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(first.title)
  })

  test('学员作品（深色区块，最多 8 件）与专业讲师区块可见', async ({ page }) => {
    const { teacherNames, workCount } = await readMajor(SLUG)
    expect(workCount).toBeGreaterThan(0)
    expect(teacherNames.length).toBeGreaterThan(0)
    await page.goto(`/majors/${SLUG}`)

    const works = page.getByRole('region', { name: '学员作品' })
    await expect(works.getByRole('heading', { level: 2, name: '学员作品' })).toBeVisible()
    await expect(works).toHaveClass(/surface-dark/)
    await expect(works.locator('figure')).toHaveCount(Math.min(8, workCount))
    // 作品只展示、暂不链接（作品详情在 M4 上线）
    await expect(works.getByRole('link')).toHaveCount(0)

    const teachers = page.getByRole('region', { name: '专业讲师' })
    for (const name of teacherNames.slice(0, 8)) {
      await expect(teachers.getByRole('heading', { level: 3, name, exact: true })).toBeVisible()
    }
    await expectNoHorizontalOverflow(page)
  })

  test('结尾表单：位置 major_cta、预选本专业，页脚行动号召横幅隐藏；提交后线索记录专业与来源', async ({
    page,
  }, testInfo) => {
    const ns = leadNamespace('majors', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const { discipline } = await readMajor(SLUG)
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto(`/majors/${SLUG}`)
    try {
      await waitForHydration(page)
      // 页面以表单收尾：页脚的行动号召横幅隐藏
      await expect(page.locator('[data-footer-cta]')).toHaveCount(1)
      await expect(page.locator('[data-footer-cta]')).toBeHidden()

      const cta = page.locator('#major-cta')
      await expect(cta.locator('input[name="position"]')).toHaveValue('major_cta')
      await expect(cta.getByLabel('意向专业')).toHaveValue(String(discipline.id))

      await cta.getByLabel('姓名').fill('专业页测试')
      await cta.getByLabel('手机号').fill(phone)
      await cta.getByLabel('所在城市').selectOption('北京')
      await cta.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await cta.getByRole('button', { name: '立即预约' }).click()
      await expect(cta.getByRole('heading', { name: '提交成功' })).toBeVisible()

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '专业页测试',
        intent: 'consult',
        discipline: discipline.id,
        city: '北京',
        source: { position: 'major_cta' },
        client: { ip },
      })
      expect(lead?.context?.course ?? null).toBeNull()
      expect(lead?.source?.pageUrl).toContain(`/majors/${SLUG}`)
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('“领取学习资料”与全站按钮打开的弹窗都预选本专业（页面级留资上下文）', async ({
    page,
    isMobile,
  }) => {
    const { discipline } = await readMajor(SLUG)
    await page.goto(`/majors/${SLUG}`)
    await waitForHydration(page)

    // 首屏“领取学习资料”：资料弹窗，带本专业
    await page
      .getByRole('region', { name: discipline.name, exact: true })
      .getByRole('button', { name: '领取学习资料' })
      .click()
    const materials = page.getByRole('dialog', { name: '领取学习资料' })
    await expect(materials).toBeVisible()
    await expect(materials.getByLabel('意向专业')).toHaveValue(String(discipline.id))
    await expect(materials.getByRole('button', { name: '领取资料' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(materials).toBeHidden()

    // 头部按钮（桌面）/ 底部操作条（移动端）没有显式传专业，由页面上下文补上
    if (isMobile) {
      await page
        .getByRole('navigation', { name: '快捷咨询' })
        .getByRole('button', { name: '预约试听' })
        .click()
    } else {
      await page.getByRole('banner').getByRole('button', { name: '预约试听' }).click()
    }
    const dialog = page.getByRole('dialog', { name: '预约免费试听' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('意向专业')).toHaveValue(String(discipline.id))
    await expect(dialog.locator('input[name="course"]')).toHaveCount(0)
  })

  test('结构化数据：BreadcrumbList（3 级）与课程 ItemList', async ({ page, isMobile }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const { courses } = await readMajor(SLUG)
    await page.goto(`/majors/${SLUG}`)
    const nodes = await readJsonLd(page)

    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb?.itemListElement).toHaveLength(3)

    const itemList = nodes.find((node) => node['@type'] === 'ItemList')
    const items = itemList?.itemListElement as { url: string }[] | undefined
    expect(items?.map((item) => new URL(item.url).pathname)).toEqual(
      courses.map((course) => `/courses/${course.slug}`),
    )
  })

  test('大菜单里每个专业方向链接都可访问（200）', async ({ page, isMobile }) => {
    test.skip(isMobile, '大菜单是桌面端导航')
    await page.goto('/')
    const trigger = page.getByRole('button', { name: '专业课程' })
    const menu = page.getByRole('navigation', { name: '主导航' })
    const links = menu.locator('a[href*="/majors/"]')
    // 页面水合前的悬停不会打开菜单：移开再悬停，直到大菜单展开
    await expect(async () => {
      await page.mouse.move(0, 0)
      await trigger.hover()
      await expect(links.first()).toBeVisible({ timeout: 1_000 })
    }).toPass({ timeout: 20_000 })
    const hrefs = await links.evaluateAll((elements) =>
      elements.map((el) => el.getAttribute('href') ?? ''),
    )
    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) {
      const res = await page.request.get(href)
      expect(res.status(), href).toBe(200)
    }
  })

  test('/majors 永久重定向到课程列表', async ({ page, isMobile }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const res = await page.request.get('/majors', { maxRedirects: 0 })
    expect(res.status()).toBe(308)
    expect(res.headers()['location']).toMatch(/\/courses$/)

    await page.goto('/majors')
    await expect(page).toHaveURL(/\/courses$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test.describe('不存在的专业方向', () => {
    // 浏览器会把 404 响应记为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('返回 404 页面', async ({ page }) => {
      const response = await page.goto('/majors/not-a-real-major')
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面不存在或已下线')
      await expectNoHorizontalOverflow(page)
    })
  })
})
