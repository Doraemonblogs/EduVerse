import type { TestInfo } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { cleanupTestUser, seedTestUser, TEST_PASSWORD } from '../helpers/seedUser'
import { expect, test } from './fixtures'

/**
 * PRD §10 完成标准中的完整路径：访客从首页（带推广参数）进入 → 打开一门课程的详情页 → 提交“预约试听”
 * → 管理员在后台的线索列表里能找到这条线索，详情中的来源字段（首次落地页、提交页面、按钮位置、UTM）正确。
 */

/**
 * 本用例专用的后台管理员账号：按项目、重复序号与重试序号区分（与 admin.e2e 的账号分开），
 * 并行运行（--repeat-each、重试）时不会互相删除
 */
const journeyAdminEmail = (info: TestInfo) =>
  `e2e-journey-${info.project.name}-${info.repeatEachIndex}-${info.retry}@example.test`

/** 课程详情页地址：/courses/<slug>（不含列表页与带筛选参数的地址） */
const COURSE_DETAIL_PATH = /^\/courses\/[a-z0-9-]+$/

test.describe('完整路径：首页 → 课程详情 → 预约试听 → 后台可见', () => {
  test('从首页进入课程详情提交预约试听，后台线索列表与详情中的来源字段正确', async ({
    page,
  }, testInfo) => {
    const ns = leadNamespace('journey', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const adminEmail = journeyAdminEmail(testInfo)
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })

    try {
      await seedTestUser(adminEmail, 'admin')

      // 1. 从首页落地（带推广参数）
      await page.goto('/?utm_source=e2e-journey&utm_medium=cpc&utm_campaign=m8')

      // 2. 点击首页上的第一门课程，进入课程详情
      const hrefs = await page
        .locator('main a[href^="/courses/"]')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
      const index = hrefs.findIndex((href) => COURSE_DETAIL_PATH.test(href))
      expect(index, '首页应有链接到课程详情的卡片').toBeGreaterThanOrEqual(0)
      const target = page.locator('main a[href^="/courses/"]').nth(index)
      const href = hrefs[index]
      await target.scrollIntoViewIfNeeded()
      await target.click()
      await expect(page).toHaveURL(new RegExp(`${href}$`))
      const slug = href.split('/').pop() ?? ''

      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'courses',
        where: { slug: { equals: slug } },
        depth: 0,
        limit: 1,
      })
      const course = docs[0]
      expect(course, `课程 ${slug} 应存在`).toBeTruthy()

      // 3. 课程详情首屏的“预约试听”：弹窗带上本课程
      const hero = page.getByRole('region', { name: course.title })
      const trial = hero.getByRole('button', { name: '预约试听', exact: true })
      await expect(trial).toBeEnabled()
      await trial.click()
      const dialog = page.getByRole('dialog', { name: '预约免费试听' })
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('input[name="course"]')).toHaveValue(String(course.id))

      await dialog.getByLabel('姓名').fill('完整路径测试')
      await dialog.getByLabel('手机号').fill(phone)
      await dialog.getByLabel('所在城市').selectOption('北京')
      await dialog.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await dialog.getByRole('button', { name: '立即预约' }).click()
      await expect(dialog.getByRole('heading', { name: '提交成功' })).toBeVisible()

      // 4. 数据库中的线索：来源字段完整（首次落地页是首页，提交页面是课程详情）
      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '完整路径测试',
        intent: 'trial',
        status: 'new',
        source: {
          position: 'course_hero',
          utmSource: 'e2e-journey',
          utmMedium: 'cpc',
          utmCampaign: 'm8',
        },
        context: { course: course.id },
        client: { ip },
        consent: { agreed: true },
      })
      expect(lead?.source?.landingUrl).toMatch(/\/\?utm_source=e2e-journey/)
      expect(lead?.source?.pageUrl).toContain(`/courses/${slug}`)

      // 5. 管理员在后台能找到这条线索
      await page.goto('/admin/login')
      await page.fill('#field-email', adminEmail)
      await page.fill('#field-password', TEST_PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/admin')

      await page.goto(`/admin/collections/leads?search=${phone}`)
      const row = page.locator('table tbody tr').filter({ hasText: phone })
      await expect(row).toHaveCount(1)
      await expect(row).toContainText('完整路径测试')

      // 详情的“来源”页签：首次落地页、提交页面、按钮位置与 UTM
      await page.goto(`/admin/collections/leads/${lead?.id}`)
      await page.getByRole('button', { name: '来源', exact: true }).click()
      await expect(page.getByLabel('首次落地页')).toHaveValue(/\/\?utm_source=e2e-journey/)
      await expect(page.getByLabel('提交页面')).toHaveValue(new RegExp(`/courses/${slug}`))
      await expect(page.getByLabel('utm_source')).toHaveValue('e2e-journey')
      await expect(page.getByLabel('utm_campaign')).toHaveValue('m8')
    } finally {
      await deleteLeadsByPhone(phone)
      await cleanupTestUser(adminEmail)
    }
  })
})
