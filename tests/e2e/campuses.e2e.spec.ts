import type { Page } from '@playwright/test'
import { getPayload, type Where } from 'payload'

import { CAMPUS_PAGES_DEFAULTS } from '../../src/globals/campus-pages-defaults'
import { upcomingCohorts } from '../../src/lib/course/cohorts'
import { formatCohortDate, toBeijingIsoDate } from '../../src/lib/course/format'
import { gcj02ToWgs84 } from '../../src/lib/geo'
import config from '../../src/payload.config.js'
import type { Campus } from '../../src/payload-types'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 校区：校区列表 /campuses 与校区详情 /campuses/[slug]，以及课程详情页的校区链接进入校区详情。
 * 内容来自种子数据（scripts/seed/data/campuses.ts 等）；期望值从数据库读取（与页面同一个开发库），
 * 过滤条件与数据层（src/lib/data/campuses.ts）一致，不在测试里写死种子内容。
 * 地图只是外链：只校验链接格式与新窗口属性，不点击（fixtures 自动断言页面没有请求第三方域名）。
 * 提交线索的用例用 leadNamespace('campuses', …) 取本文件专属的手机号与模拟 IP，结束后清理。
 */

const SLUG = 'beijing-haidian'
/** 开设校区含 SLUG 的课程（课程详情首屏的“开设校区”链接到校区详情） */
const COURSE_SLUG = '3d-animation-career'

// 开发服务器首次访问某个路由时要现编译，留足时间
test.describe.configure({ timeout: 120_000 })

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 关联字段的 ID（depth 0 时是数字，填充后是文档） */
const relationId = (value: number | { id: number } | null | undefined) =>
  typeof value === 'object' && value ? value.id : (value ?? null)

/** 坐标的展示写法：与数据层一致，保留 6 位小数并去掉末尾的 0 */
const coordinate = (value: number) => String(Number(value.toFixed(6)))

type CampusSummary = Pick<
  Campus,
  'id' | 'name' | 'slug' | 'city' | 'address' | 'phone' | 'openingHours' | 'location'
>

type CampusListFacts = {
  /** 已发布校区（后台排序 → ID） */
  campuses: CampusSummary[]
  listTitle: string
  ctaTitle: string
}

async function readCampusList(): Promise<CampusListFacts> {
  const payload = await getPayload({ config })
  const [campuses, settings] = await Promise.all([
    payload.find({
      collection: 'campuses',
      where: published,
      depth: 0,
      sort: ['order', 'id'],
      pagination: false,
      select: {
        name: true,
        slug: true,
        city: true,
        address: true,
        phone: true,
        openingHours: true,
        location: true,
      },
    }),
    payload.findGlobal({ slug: 'campus-pages', depth: 0 }),
  ])
  return {
    campuses: campuses.docs,
    listTitle: settings.list?.title?.trim() || CAMPUS_PAGES_DEFAULTS.list.title,
    ctaTitle: settings.detail?.ctaTitle?.trim() || CAMPUS_PAGES_DEFAULTS.detail.ctaTitle,
  }
}

type CampusFacts = {
  campus: Campus
  photoCaptions: string[]
  /** 在此开课、可公开访问的课程 */
  courses: { id: number; slug: string; title: string }[]
  /** 本校区未开班的开班计划（按北京时间过滤、开班日期升序）：日期与课程 */
  cohorts: { date: string; courseId: number; courseTitle: string }[]
  /** 所在校区为本校区的已发布讲师 */
  teachers: string[]
}

/** 从数据库读取校区及其开设课程、开班计划与讲师（与数据层的过滤条件一致） */
async function readCampus(slug: string): Promise<CampusFacts> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'campuses',
    where: { and: [published, { slug: { equals: slug } }] },
    depth: 1,
    joins: false,
    limit: 1,
    pagination: false,
  })
  const campus = docs[0]
  if (!campus) throw new Error(`种子数据缺少校区 ${slug}`)

  const reachable = { 'discipline._status': { equals: 'published' } } as const satisfies Where
  const [courses, cohortDocs, teachers] = await Promise.all([
    payload.find({
      collection: 'courses',
      where: { and: [published, reachable, { campuses: { in: [campus.id] } }] },
      depth: 0,
      pagination: false,
      select: { slug: true, title: true },
    }),
    payload.find({
      collection: 'cohorts',
      where: { and: [{ campus: { equals: campus.id } }, { status: { not_equals: 'closed' } }] },
      depth: 0,
      sort: 'startDate',
      pagination: false,
    }),
    payload.find({
      collection: 'teachers',
      where: { and: [published, { campus: { equals: campus.id } }] },
      depth: 0,
      pagination: false,
      select: { name: true },
    }),
  ])

  const cohortCourseIds = [
    ...new Set(
      cohortDocs.docs
        .map((cohort) => relationId(cohort.course))
        .filter((id): id is number => id !== null),
    ),
  ]
  const cohortCourses = await payload.find({
    collection: 'courses',
    where: { and: [published, reachable, { id: { in: cohortCourseIds } }] },
    depth: 0,
    pagination: false,
    select: { title: true },
  })
  const titles = new Map(cohortCourses.docs.map((course) => [course.id, course.title]))
  // 只保留可公开访问课程的开班（与数据层一致），再按北京时间去掉已开班的
  const cohorts = upcomingCohorts(
    cohortDocs.docs.flatMap((cohort) => {
      const courseId = relationId(cohort.course)
      const title = courseId === null ? undefined : titles.get(courseId)
      return courseId !== null && title !== undefined ? [{ ...cohort, courseId, title }] : []
    }),
    new Date(),
  ).map((cohort) => ({
    date: formatCohortDate(cohort.startDate),
    courseId: cohort.courseId,
    courseTitle: cohort.title,
  }))

  return {
    campus,
    photoCaptions: (campus.photos ?? []).map((photo) => photo.caption?.trim() ?? ''),
    courses: courses.docs.map(({ id, slug: courseSlug, title }) => ({
      id,
      slug: courseSlug,
      title,
    })),
    cohorts,
    teachers: teachers.docs.map((teacher) => teacher.name),
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

/** 结尾表单水合后提交按钮才可用；以此确认页面已接管 */
async function waitForHydration(page: Page) {
  await expect(page.locator('#campus-cta').getByRole('button', { name: '立即预约' })).toBeEnabled()
}

/** 首屏概况 <dl> 中某一项的取值 */
function heroFact(page: Page, name: string, label: string) {
  return page
    .getByRole('region', { name, exact: true })
    .locator('dl > div')
    .filter({ has: page.locator('dt', { hasText: label }) })
    .locator('dd')
}

test.describe('校区列表', () => {
  test('列出全部已发布校区（后台排序）：城市、名称、地址、电话（tel:）、开放时间、查看校区与高德地图链接；规范地址可收录', async ({
    page,
  }) => {
    const { campuses, listTitle } = await readCampusList()
    expect(campuses.length).toBeGreaterThan(0)
    const response = await page.goto('/campuses')
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(listTitle)
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByText(listTitle, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const cities = new Set(campuses.map((campus) => campus.city))
    await expect(
      page.getByText(`共 ${campuses.length} 个校区，分布在 ${cities.size} 个城市`),
    ).toBeVisible()

    // 页面没有区块标题：校区名用 h2，按后台排序
    const cards = page.getByRole('main').getByRole('article')
    await expect(cards.getByRole('heading', { level: 2 })).toHaveText(
      campuses.map((campus) => campus.name),
    )

    for (const campus of campuses) {
      const card = cards.filter({
        has: page.getByRole('heading', { name: campus.name, exact: true }),
      })
      await expect(card.getByText(campus.city, { exact: true })).toBeVisible()
      await expect(card.getByText(campus.address)).toBeVisible()
      if (campus.phone) {
        await expect(card.getByRole('link', { name: campus.phone })).toHaveAttribute(
          'href',
          `tel:${campus.phone.replace(/[^\d+]/g, '')}`,
        )
      }
      if (campus.openingHours) await expect(card.getByText(campus.openingHours)).toBeVisible()
      await expect(card.getByRole('link', { name: `查看校区：${campus.name}` })).toHaveAttribute(
        'href',
        new RegExp(`/campuses/${campus.slug}$`),
      )
      const map = card.getByRole('link', {
        name: `在高德地图中打开：${campus.name}（在新窗口打开）`,
      })
      await expect(map).toHaveText('在高德地图中打开')
      await expect(map).toHaveAttribute('target', '_blank')
      await expect(map).toHaveAttribute('rel', 'noopener noreferrer')
      const { lng, lat } = campus.location ?? {}
      expect(typeof lng === 'number' && typeof lat === 'number', '种子校区应有坐标').toBe(true)
      const url = new URL((await map.getAttribute('href')) ?? '')
      expect(`${url.origin}${url.pathname}`).toBe('https://uri.amap.com/marker')
      expect(url.searchParams.get('position')).toBe(`${coordinate(lng!)},${coordinate(lat!)}`)
      expect(url.searchParams.get('name')).toBe(campus.name)
    }

    // 只有第一张封面预加载，其余懒加载
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1)
    const loading = await cards.evaluateAll((items) =>
      items.map((item) => item.querySelector('img')?.getAttribute('loading') ?? null),
    )
    expect(loading[0]).not.toBe('lazy')
    expect(loading.slice(1).every((value) => value === 'lazy')).toBe(true)

    // 元数据：canonical 为 /campuses，可收录
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/campuses$/)
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    // 页面没有结尾表单：页脚的行动号召横幅照常显示
    await expect(page.locator('[data-footer-cta]')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('点击“查看校区”进入校区详情', async ({ page }) => {
    const { campuses } = await readCampusList()
    const target = campuses[1] ?? campuses[0]!
    await page.goto('/campuses')
    await page.getByRole('link', { name: `查看校区：${target.name}` }).click()
    await expect(page).toHaveURL(new RegExp(`/campuses/${target.slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(target.name)
  })
})

test.describe('校区详情', () => {
  test('首屏：城市、校区名、地址、电话、开放时间、交通指引与“预约到校参观”；面包屑与元数据', async ({
    page,
  }) => {
    const { campus } = await readCampus(SLUG)
    const { listTitle } = await readCampusList()
    const response = await page.goto(`/campuses/${SLUG}`)
    expect(response?.status()).toBe(200)

    const hero = page.getByRole('region', { name: campus.name, exact: true })
    await expect(hero).toHaveClass(/surface-dark/)
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(campus.name)
    await expect(hero.getByText(campus.city, { exact: true })).toBeVisible()
    await expect(hero.getByRole('button', { name: '预约到校参观' })).toBeVisible()

    await expect(heroFact(page, campus.name, '地址')).toContainText(campus.address)
    const phone = heroFact(page, campus.name, '电话').getByRole('link')
    await expect(phone).toHaveText(campus.phone ?? '')
    await expect(phone).toHaveAttribute(
      'href',
      `tel:${(campus.phone ?? '').replace(/[^\d+]/g, '')}`,
    )
    await expect(heroFact(page, campus.name, '开放时间')).toHaveText(campus.openingHours ?? '')
    await expect(heroFact(page, campus.name, '交通指引')).toHaveText(campus.transit ?? '')

    // 面包屑：首页 › 校区分布（/campuses）› 当前校区
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByRole('link', { name: listTitle })).toHaveAttribute(
      'href',
      /\/campuses$/,
    )
    await expect(breadcrumbs.getByText(campus.name, { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // 首屏大图是唯一预加载、不懒加载的图片，主内容里其余图片（环境照片、课程封面、讲师头像）都懒加载
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1)
    await expect(hero.getByRole('img')).not.toHaveAttribute('loading', 'lazy')
    const eager = await page
      .locator('main img')
      .evaluateAll((imgs) => imgs.filter((img) => img.getAttribute('loading') !== 'lazy').length)
    expect(eager, '只有首屏大图立即加载').toBe(1)

    // 元数据：标题含校区名，canonical 为本页
    await expect(page).toHaveTitle(new RegExp(campus.name))
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/campuses/${SLUG}$`),
    )
    await expectNoHorizontalOverflow(page)
  })

  test('地图外链：高德 / 百度标注页地址正确，新窗口打开，页面不加载地图脚本', async ({ page }) => {
    const { campus } = await readCampus(SLUG)
    const { lng, lat } = campus.location ?? {}
    expect(typeof lng === 'number' && typeof lat === 'number', '种子校区应有坐标').toBe(true)
    await page.goto(`/campuses/${SLUG}`)

    const maps = page
      .getByRole('region', { name: campus.name, exact: true })
      .getByRole('list', { name: '地图导航' })
    const amap = maps.getByRole('link', {
      name: `在高德地图中打开：${campus.name}（在新窗口打开）`,
    })
    const baidu = maps.getByRole('link', {
      name: `在百度地图中打开：${campus.name}（在新窗口打开）`,
    })
    for (const link of [amap, baidu]) {
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }

    const amapUrl = new URL((await amap.getAttribute('href')) ?? '')
    expect(`${amapUrl.origin}${amapUrl.pathname}`).toBe('https://uri.amap.com/marker')
    expect(amapUrl.searchParams.get('position')).toBe(`${coordinate(lng!)},${coordinate(lat!)}`)
    expect(amapUrl.searchParams.get('name')).toBe(campus.name)

    // 百度的 location 是“纬度,经度”，坐标按高德坐标系（gcj02）换算
    const baiduUrl = new URL((await baidu.getAttribute('href')) ?? '')
    expect(`${baiduUrl.origin}${baiduUrl.pathname}`).toBe('https://api.map.baidu.com/marker')
    expect(baiduUrl.searchParams.get('location')).toBe(`${coordinate(lat!)},${coordinate(lng!)}`)
    expect(baiduUrl.searchParams.get('title')).toBe(campus.name)
    expect(baiduUrl.searchParams.get('content')).toBe(campus.address)
    expect(baiduUrl.searchParams.get('output')).toBe('html')
    expect(baiduUrl.searchParams.get('coord_type')).toBe('gcj02')
    expect(baiduUrl.searchParams.get('src')).toBeTruthy()

    // 不嵌入地图：没有 iframe，脚本都来自本站（第三方请求由 fixtures 统一断言）
    await expect(page.locator('iframe')).toHaveCount(0)
    const origin = new URL(page.url()).origin
    const scripts = await page
      .locator('script[src]')
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLScriptElement).src))
    for (const src of scripts) expect(new URL(src).origin, src).toBe(origin)
  })

  test('校区环境：点击照片打开灯箱，可切换、首尾循环，Esc 关闭后焦点回到照片', async ({ page }) => {
    const { campus, photoCaptions } = await readCampus(SLUG)
    const total = photoCaptions.length
    expect(total, '种子校区应有至少 2 张环境照片').toBeGreaterThan(1)
    expect(photoCaptions.every(Boolean), '种子校区的环境照片都有说明').toBe(true)
    await page.goto(`/campuses/${SLUG}`)

    const photos = page.getByRole('region', { name: '校区环境' })
    await expect(photos.getByText(`共 ${total} 张照片，点击可查看大图`)).toBeVisible()
    const triggers = photos.getByRole('button', { name: /^查看大图：/ })
    await expect(triggers).toHaveCount(total)
    await expect(photos.locator('figcaption')).toHaveText(photoCaptions)

    // 水合前按钮不可用；从第二张打开
    const second = triggers.nth(1)
    await expect(second).toHaveAccessibleName(`查看大图：${photoCaptions[1]}`)
    await expect(second).toBeEnabled()
    await second.click()
    const dialog = page.getByRole('dialog', { name: campus.name })
    await expect(dialog).toBeVisible()
    const counter = dialog.locator('[aria-live] [aria-hidden="true"]')
    await expect(counter).toHaveText(`2 / ${total}`)
    await expect(dialog.locator('figcaption')).toHaveText(photoCaptions[1]!)
    await expect(dialog.getByText(`第 2 张，共 ${total} 张`)).toBeAttached()

    await page.keyboard.press('ArrowLeft')
    await expect(counter).toHaveText(`1 / ${total}`)
    await expect(dialog.locator('figcaption')).toHaveText(photoCaptions[0]!)
    // 第一张往前是最后一张，最后一张往后回到第一张
    await page.keyboard.press('ArrowLeft')
    await expect(counter).toHaveText(`${total} / ${total}`)
    await dialog.getByRole('button', { name: '下一张' }).click()
    await expect(counter).toHaveText(`1 / ${total}`)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(second).toBeFocused()
    await expectNoHorizontalOverflow(page)
  })

  test('开设课程、近期开班（只含本校区、未开班，按日期升序）与本校区讲师', async ({ page }) => {
    const { courses, cohorts, teachers } = await readCampus(SLUG)
    expect(courses.length, '种子校区应有开设课程').toBeGreaterThan(0)
    expect(cohorts.length, '种子校区应有未开班的开班计划').toBeGreaterThan(0)
    expect(teachers.length, '种子校区应有讲师').toBeGreaterThan(0)
    await page.goto(`/campuses/${SLUG}`)

    const courseSection = page.getByRole('region', { name: '开设课程' })
    await expect(courseSection.getByText(`共 ${courses.length} 门课程在本校区开课`)).toBeVisible()
    const titles = await courseSection.getByRole('heading', { level: 3 }).allTextContents()
    expect([...titles].sort()).toEqual(courses.map((course) => course.title).sort())
    const first = courses[0]!
    await expect(
      courseSection.getByRole('heading', { level: 3, name: first.title }).getByRole('link'),
    ).toHaveAttribute('href', new RegExp(`/courses/${first.slug}$`))
    await expect(courseSection.getByRole('link', { name: /查看全部课程/ })).toHaveAttribute(
      'href',
      /\/courses$/,
    )

    const rows = page.getByRole('region', { name: '近期开班' }).getByRole('listitem')
    await expect(rows).toHaveCount(cohorts.length)
    const shown = await rows.evaluateAll((items) =>
      items.map((item) => item.querySelector('p')?.textContent?.trim() ?? ''),
    )
    expect(shown).toEqual(cohorts.map((cohort) => cohort.date))
    const today = toBeijingIsoDate(new Date())
    for (const text of shown) {
      const [, y, m, d] = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(text) ?? []
      const iso = `${y}-${m?.padStart(2, '0')}-${d?.padStart(2, '0')}`
      expect(iso >= today, `${text} 不应早于今天`).toBe(true)
    }
    // 每行显示课程名（链接到课程），不再链接本校区
    const rowLinks = await rows.evaluateAll((items) =>
      items.map((item) =>
        [...item.querySelectorAll('a')].map((link) => link.getAttribute('href') ?? ''),
      ),
    )
    for (const links of rowLinks) {
      expect(links).toHaveLength(1)
      expect(links[0]).toMatch(/\/courses\/[a-z0-9-]+$/)
    }
    await expect(rows.first()).toContainText(cohorts[0]!.courseTitle)

    const teacherSection = page.getByRole('region', { name: '本校区讲师' })
    const names = await teacherSection.getByRole('heading', { level: 3 }).allTextContents()
    expect([...names].sort()).toEqual([...teachers].sort())
    await expect(
      teacherSection.getByRole('link', { name: teachers[0]!, exact: true }),
    ).toHaveAttribute('href', /\/teachers\/[a-z0-9-]+$/)
    await expectNoHorizontalOverflow(page)
  })

  test('首屏“预约到校参观”与开班“预约试听”打开留资弹窗：位置分别为 campus_hero、campus_cohort', async ({
    page,
  }) => {
    const { campus, cohorts } = await readCampus(SLUG)
    const { ctaTitle } = await readCampusList()
    await page.goto(`/campuses/${SLUG}`)
    await waitForHydration(page)

    await page
      .getByRole('region', { name: campus.name, exact: true })
      .getByRole('button', { name: '预约到校参观' })
      .click()
    let dialog = page.getByRole('dialog', { name: ctaTitle })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input[name="position"]')).toHaveValue('campus_hero')
    await expect(dialog.locator('input[name="intent"]')).toHaveValue('consult')
    await expect(dialog.locator('input[name="course"]')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // 开班行的“预约试听”带上该行的课程
    await page
      .getByRole('region', { name: '近期开班' })
      .getByRole('listitem')
      .first()
      .getByRole('button', { name: /^预约试听/ })
      .click()
    dialog = page.getByRole('dialog', { name: '预约免费试听' })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input[name="position"]')).toHaveValue('campus_cohort')
    await expect(dialog.locator('input[name="course"]')).toHaveValue(String(cohorts[0]!.courseId))
  })

  test('结尾表单：位置 campus_cta，页脚行动号召横幅隐藏；提交后线索记录意向与来源', async ({
    page,
  }, testInfo) => {
    const ns = leadNamespace('campuses', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const { ctaTitle } = await readCampusList()
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto(`/campuses/${SLUG}`)
    try {
      await waitForHydration(page)
      // 页面以表单收尾：页脚的行动号召横幅隐藏
      await expect(page.locator('[data-footer-cta]')).toHaveCount(1)
      await expect(page.locator('[data-footer-cta]')).toBeHidden()

      const cta = page.locator('#campus-cta')
      await expect(cta).toHaveClass(/surface-dark/)
      await expect(cta.getByRole('heading', { level: 2 })).toHaveText(ctaTitle)
      await expect(cta.locator('input[name="position"]')).toHaveValue('campus_cta')

      await cta.getByLabel('姓名').fill('校区页测试')
      await cta.getByLabel('手机号').fill(phone)
      await cta.getByLabel('所在城市').selectOption('北京')
      await cta.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await cta.getByRole('button', { name: '立即预约' }).click()
      await expect(cta.getByRole('heading', { name: '提交成功' })).toBeVisible()

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '校区页测试',
        intent: 'consult',
        city: '北京',
        source: { position: 'campus_cta' },
        client: { ip },
      })
      expect(lead?.context?.course ?? null).toBeNull()
      expect(lead?.source?.pageUrl).toContain(`/campuses/${SLUG}`)
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('结构化数据：EducationalOrganization（地址、电话、坐标、图片、上级机构）与 BreadcrumbList（3 级）', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const { campus } = await readCampus(SLUG)
    await page.goto(`/campuses/${SLUG}`)
    const nodes = await readJsonLd(page)

    const org = nodes.find((node) => node['@type'] === 'EducationalOrganization')
    // 后台填写的高德坐标（GCJ-02）换算为 schema.org 要求的 WGS 84，保留 6 位小数
    const wgs = gcj02ToWgs84({ lat: campus.location!.lat!, lng: campus.location!.lng! })
    expect(org).toMatchObject({
      name: campus.name,
      telephone: campus.phone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: campus.address,
        addressLocality: campus.city,
        addressCountry: 'CN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: Number(wgs.lat.toFixed(6)),
        longitude: Number(wgs.lng.toFixed(6)),
      },
      parentOrganization: { '@type': 'Organization' },
    })
    expect(new URL(String(org?.url)).pathname).toBe(`/campuses/${SLUG}`)
    expect(String(org?.image)).toMatch(/^https?:\/\/.+\/api\/media\/file\//)

    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb?.itemListElement).toHaveLength(3)
  })

  test('课程详情页首屏的开设校区链接可进入校区详情', async ({ page }) => {
    const { campus } = await readCampus(SLUG)
    await page.goto(`/courses/${COURSE_SLUG}`)
    const courseTitle = (await page.getByRole('heading', { level: 1 }).textContent()) ?? ''
    const campusFact = page
      .getByRole('region', { name: courseTitle, exact: true })
      .locator('dl > div')
      .filter({ has: page.locator('dt', { hasText: '开设校区' }) })
    await campusFact.getByRole('link', { name: campus.name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/campuses/${SLUG}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(campus.name)
    await expect(
      page.getByRole('region', { name: '开设课程' }).getByRole('heading', { level: 3 }),
    ).not.toHaveCount(0)
  })

  test.describe('不存在的校区', () => {
    // 浏览器会把 404 响应记为一条控制台错误，这里放行
    test.use({ allowedConsoleErrors: [/status of 404/] })

    test('返回 404 页面', async ({ page }) => {
      const response = await page.goto('/campuses/not-a-real-campus')
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面不存在或已下线')
      await expectNoHorizontalOverflow(page)
    })
  })
})
