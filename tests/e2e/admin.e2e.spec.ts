import type { Page } from '@playwright/test'

import {
  cleanupTestUser,
  seedTestUser,
  TEST_PASSWORD,
  testUserEmail,
  type TestRole,
} from '../helpers/seedUser'
import { expect, test } from './fixtures'

const ROLES: TestRole[] = ['admin', 'editor', 'consultant']

async function login(page: Page, email: string) {
  await page.goto('/admin/login')
  await page.fill('#field-email', email)
  await page.fill('#field-password', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin')
}

/** 侧边栏中的集合链接 */
const navLink = (page: Page, collection: string) =>
  page.locator(`nav a[href$="/admin/collections/${collection}"]`).first()

test.describe('后台', () => {
  test.beforeAll(async ({}, testInfo) => {
    // 先建管理员（库为空时第一个账号会被自动设为管理员）
    for (const role of ROLES) await seedTestUser(testUserEmail(testInfo.project.name, role), role)
  })

  test.afterAll(async ({}, testInfo) => {
    for (const role of ROLES) await cleanupTestUser(testUserEmail(testInfo.project.name, role))
  })

  test('登录页为中文界面，管理员可以看到全部菜单', async ({ page }, testInfo) => {
    await page.goto('/admin/login')
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh')
    await login(page, testUserEmail(testInfo.project.name, 'admin'))
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(navLink(page, 'courses')).toBeAttached()
    await expect(navLink(page, 'leads')).toBeAttached()
    await expect(navLink(page, 'users')).toBeAttached()
  })

  test('内容编辑看不到线索菜单', async ({ page }, testInfo) => {
    await login(page, testUserEmail(testInfo.project.name, 'editor'))
    await expect(navLink(page, 'courses')).toBeAttached()
    await expect(navLink(page, 'leads')).toHaveCount(0)
  })

  test('课程顾问只看到线索，看不到内容菜单', async ({ page }, testInfo) => {
    await login(page, testUserEmail(testInfo.project.name, 'consultant'))
    await expect(navLink(page, 'leads')).toBeAttached()
    await expect(navLink(page, 'courses')).toHaveCount(0)
    await expect(navLink(page, 'media')).toHaveCount(0)
  })
})
