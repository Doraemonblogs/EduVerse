import type { Locator, Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 课程列表 /courses：按专业方向分组、URL 同步的筛选（专业方向 / 班型 / 授课方式 / 城市）、空状态、元数据。
 * 数据来自种子：8 个专业方向 × 3 门课程（1 门长期就业班 + 2 门短期提升班），短期班只有线上直播 / 双师课堂。
 */

const DISCIPLINE_NAMES = [
  '三维动画',
  '游戏美术',
  '影视特效与后期',
  'UI/UX 设计',
  '原画与概念设计',
  '平面与品牌设计',
  '动态图形与短视频',
  '建筑与室内可视化',
]

type JsonLdItem = { '@type': string; itemListElement?: { url?: string; item?: string }[] }

function filterNav(page: Page): Locator {
  return page.getByRole('navigation', { name: '课程筛选' })
}

/** 筛选栏中的一行（专业方向 / 班型 / 授课方式 / 城市） */
function filterRow(page: Page, label: string): Locator {
  return filterNav(page).getByRole('list', { name: label })
}

/** 筛选项：可见文字是“名称 + 数量”，无障碍名称是“名称（N 门课程）”（选项是弹性盒，名称中间可能带空格） */
function filterOption(page: Page, row: string, label: string): Locator {
  return filterRow(page, row).getByRole('link', { name: new RegExp(`^${label}\\s*（`) })
}

/** 筛选项的无障碍名称 */
function optionName(label: string, count: number): RegExp {
  return new RegExp(`^${label}\\s*（${count} 门课程）$`)
}

/** 分组区块（<section aria-labelledby>，以专业方向名称命名） */
function courseGroups(page: Page): Locator {
  return page.locator('main section[aria-labelledby^="course-group-"]')
}

/** 课程卡片标题（h3） */
function courseTitles(page: Page): Locator {
  return courseGroups(page).getByRole('heading', { level: 3 })
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '页面不应出现横向滚动').toBe(0)
}

/** 从数据库读取课程及其专业方向的 ID（与页面同一个开发库），不信任页面自己写出的值 */
async function readCourseIds(slug: string): Promise<{ courseId: number; disciplineId: number }> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'courses',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
    pagination: false,
  })
  const course = docs[0]
  if (!course || typeof course.discipline !== 'number') throw new Error(`种子数据缺少课程 ${slug}`)
  return { courseId: course.id, disciplineId: course.discipline }
}

async function readJsonLd(page: Page): Promise<JsonLdItem[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
  return scripts.map((text) => JSON.parse(text) as JsonLdItem)
}

test.describe('课程列表', () => {
  test('全部课程按专业方向分组显示，筛选栏默认选中“全部”', async ({ page }) => {
    const response = await page.goto('/courses')
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('专业课程')
    await expect(page).toHaveTitle(/专业课程/)
    const breadcrumbs = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumbs.getByText('专业课程', { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // 分组：h2 为专业方向全称，顺序同后台排序；每组 3 门课程（h3）
    const groupHeadings = courseGroups(page).getByRole('heading', { level: 2 })
    await expect(groupHeadings).toHaveText(DISCIPLINE_NAMES)
    await expect(courseTitles(page)).toHaveCount(24)
    const animation = page.getByRole('region', { name: '三维动画' })
    await expect(animation.getByRole('heading', { level: 3 })).toHaveCount(3)
    await expect(animation.getByRole('link', { name: '了解该专业：三维动画' })).toHaveAttribute(
      'href',
      /\/majors\/3d-animation$/,
    )
    await expect(
      animation
        .getByRole('heading', { level: 3, name: '三维动画设计长期就业班' })
        .getByRole('link'),
    ).toHaveAttribute('href', /\/courses\/3d-animation-career$/)

    // 筛选栏：四行，每行“全部”为当前项；结果数
    for (const row of ['专业方向', '班型', '授课方式', '城市']) {
      await expect(filterOption(page, row, '全部')).toHaveAttribute('aria-current', 'true')
    }
    await expect(filterRow(page, '专业方向').locator('[aria-current]')).toHaveCount(1)
    await expect(filterNav(page).getByRole('status')).toHaveText('共 24 门课程')
    await expect(filterNav(page).getByRole('link', { name: '清除筛选' })).toHaveCount(0)

    // 筛选项一律 nofollow
    const links = filterNav(page).getByRole('link')
    const count = await links.count()
    expect(count).toBeGreaterThan(10)
    for (let i = 0; i < count; i += 1) {
      await expect(links.nth(i)).toHaveAttribute('rel', 'nofollow')
    }

    // ItemList 结构化数据：24 门课程的详情页绝对地址
    const itemList = (await readJsonLd(page)).find((data) => data['@type'] === 'ItemList')
    expect(itemList?.itemListElement).toHaveLength(24)
    expect(itemList?.itemListElement?.[0]?.url).toMatch(/^https?:\/\/.+\/courses\/[a-z0-9-]+$/)

    await expectNoHorizontalOverflow(page)
  })

  test('筛选同步到 URL：选专业方向、叠加班型、再点同一项取消、清除筛选', async ({ page }) => {
    await page.goto('/courses')

    // 选专业方向
    await filterOption(page, '专业方向', '三维动画').click()
    await expect(page).toHaveURL(/\/courses\?discipline=3d-animation$/)
    await expect(filterOption(page, '专业方向', '三维动画')).toHaveAttribute('aria-current', 'true')
    await expect(filterOption(page, '专业方向', '全部')).not.toHaveAttribute('aria-current')
    await expect(courseGroups(page)).toHaveCount(1)
    await expect(courseGroups(page).getByRole('heading', { level: 2 })).toHaveText('三维动画')
    await expect(courseTitles(page)).toHaveCount(3)
    await expect(filterNav(page).getByRole('status')).toHaveText('共 3 门课程')

    // 叠加班型
    await filterOption(page, '班型', '短期提升班').click()
    await expect(page).toHaveURL(/\/courses\?discipline=3d-animation&type=short_term$/)
    await expect(filterOption(page, '班型', '短期提升班')).toHaveAttribute('aria-current', 'true')
    await expect(courseTitles(page)).toHaveText(['角色建模与绑定提升班', 'Blender 三维入门班'])
    await expect(filterNav(page).getByRole('status')).toHaveText('共 2 门课程')

    // 再点同一项：取消该条件
    await filterOption(page, '班型', '短期提升班').click()
    await expect(page).toHaveURL(/\/courses\?discipline=3d-animation$/)
    await expect(filterOption(page, '班型', '全部')).toHaveAttribute('aria-current', 'true')
    await expect(courseTitles(page)).toHaveCount(3)

    // 清除筛选
    await filterNav(page).getByRole('link', { name: '清除筛选' }).click()
    await expect(page).toHaveURL(/\/courses$/)
    await expect(courseTitles(page)).toHaveCount(24)
    await expect(filterOption(page, '专业方向', '全部')).toHaveAttribute('aria-current', 'true')
    await expect(filterNav(page).getByRole('link', { name: '清除筛选' })).toHaveCount(0)
  })

  test('筛选项数量按其它条件计算，城市只匹配开设校区', async ({ page }) => {
    await page.goto('/courses?type=long_term&city=shenzhen')
    // 深圳校区开设的长期就业班：游戏美术、UI/UX、平面、动态
    await expect(courseGroups(page).getByRole('heading', { level: 2 })).toHaveText([
      '游戏美术',
      'UI/UX 设计',
      '平面与品牌设计',
      '动态图形与短视频',
    ])
    await expect(filterOption(page, '城市', '深圳')).toHaveAttribute('aria-current', 'true')
    await expect(filterOption(page, '城市', '深圳')).toHaveAccessibleName(optionName('深圳', 4))
    // 班型行：长期 4（当前）；短期班在深圳只有室内设计基础班（双师课堂）
    await expect(filterOption(page, '班型', '短期提升班')).toHaveAccessibleName(
      optionName('短期提升班', 1),
    )
    // 纯线上课程没有校区：选了城市后“线上直播”只计算同时开设线下校区的课程
    await expect(filterOption(page, '授课方式', '线上直播')).toHaveAccessibleName(
      optionName('线上直播', 2),
    )
  })

  test('有筛选参数时 noindex, follow，规范地址始终是 /courses', async ({ page }) => {
    await page.goto('/courses?discipline=3d-animation&type=short_term')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /follow/)
    await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /nofollow/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/courses$/)
    // 筛选页不输出 ItemList
    const types = (await readJsonLd(page)).map((data) => data['@type'])
    expect(types).not.toContain('ItemList')

    // 非法取值也算带参数：按“全部”展示，但同样 noindex
    await page.goto('/courses?mode=unknown')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expect(courseTitles(page)).toHaveCount(24)

    await page.goto('/courses')
    const robots = page.locator('meta[name="robots"]')
    if ((await robots.count()) > 0) await expect(robots).not.toHaveAttribute('content', /noindex/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/courses$/)
  })

  test('不可能的组合显示空状态，可清除筛选或咨询课程顾问', async ({ page }) => {
    // 短期提升班没有线下面授
    await page.goto('/courses?type=short_term&mode=offline')
    await expect(page.getByRole('heading', { level: 2, name: '没有符合条件的课程' })).toBeVisible()
    await expect(courseGroups(page)).toHaveCount(0)
    await expect(filterNav(page).getByRole('status')).toHaveText('共 0 门课程')
    // 当前选择即使数量为 0 也保留，便于取消
    await expect(filterOption(page, '授课方式', '线下面授')).toHaveAttribute('aria-current', 'true')

    const empty = page.getByRole('region', { name: '没有符合条件的课程' })
    await empty.getByRole('button', { name: '咨询课程顾问' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await empty.getByRole('link', { name: '清除筛选' }).click()
    await expect(page).toHaveURL(/\/courses$/)
    await expect(courseTitles(page)).toHaveCount(24)
  })

  test('卡片“预约试听”打开弹窗，带上课程与专业，提交后记录来源 course_card', async ({
    page,
  }, testInfo) => {
    const ns = leadNamespace('courses-list', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    // 期望值来自数据库（不读页面自己写出的值）：卡片传错课程、或把课程与专业的 ID 传反，都会被发现
    const { courseId, disciplineId } = await readCourseIds('game-scene-design')
    expect(courseId, '课程与专业的 ID 相同时，断言发现不了两者被传反').not.toBe(disciplineId)
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto('/courses?discipline=game-art')

    try {
      await page.getByRole('button', { name: '预约试听：游戏场景设计提升班' }).click()
      const dialog = page.getByRole('dialog', { name: '预约免费试听' })
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('input[name="position"]')).toHaveValue('course_card')
      await expect(dialog.locator('input[name="course"]')).toHaveValue(String(courseId))
      // 意向专业预选为课程所属专业
      const discipline = dialog.getByLabel('意向专业')
      await expect(discipline).toHaveValue(String(disciplineId))
      await expect(discipline.locator('option:checked')).toHaveText('游戏美术')

      await dialog.getByLabel('姓名').fill('课程列表测试')
      await dialog.getByLabel('手机号').fill(phone)
      await dialog.getByLabel('所在城市').selectOption('上海')
      await dialog.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await dialog.getByRole('button', { name: '立即预约' }).click()
      await expect(dialog.getByRole('heading', { name: '提交成功' })).toBeVisible()

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        intent: 'trial',
        discipline: disciplineId,
        source: { position: 'course_card' },
        context: { course: courseId },
      })
      expect(lead?.source?.pageUrl).toContain('/courses?discipline=game-art')
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('移动端：无横向滚动，筛选行可横向滚动且标签在左', async ({ page, isMobile }) => {
    test.skip(!isMobile, '移动端专属')
    await page.goto('/courses')
    await expectNoHorizontalOverflow(page)

    const row = filterRow(page, '专业方向')
    const scroll = await row.evaluate((el) => ({
      overflowX: getComputedStyle(el).overflowX,
      scrollable: el.scrollWidth > el.clientWidth,
    }))
    expect(scroll).toEqual({ overflowX: 'auto', scrollable: true })

    // 标签在左、选项在右，同一行
    const label = filterNav(page).getByText('专业方向', { exact: true })
    const labelBox = await label.boundingBox()
    const rowBox = await row.boundingBox()
    expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(rowBox!.x + 1)
    expect(Math.abs(labelBox!.y - rowBox!.y)).toBeLessThan(12)

    // 横向滚动到末尾的选项，点选后页面仍无横向滚动，选中项可见
    const last = filterOption(page, '专业方向', '室内设计')
    await last.scrollIntoViewIfNeeded()
    await last.click()
    await expect(page).toHaveURL(/\/courses\?discipline=arch-viz$/)
    await expect(filterOption(page, '专业方向', '室内设计')).toBeInViewport()
    await expect(courseTitles(page)).toHaveCount(3)
    await expectNoHorizontalOverflow(page)

    // 触控目标不小于 44px
    const box = await filterOption(page, '班型', '全部').boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('桌面端：筛选项自动换行，不出现横向滚动', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属')
    await page.goto('/courses')
    for (const label of ['专业方向', '班型', '授课方式', '城市']) {
      const scrollable = await filterRow(page, label).evaluate(
        (el) => el.scrollWidth > el.clientWidth,
      )
      expect(scrollable, `${label}行不应横向滚动`).toBe(false)
    }
    await expectNoHorizontalOverflow(page)
  })
})
