import { cleanupTestUser, seedTestUser, TEST_PASSWORD, testUserEmail } from '../helpers/seedUser'
import { expect, test } from './fixtures'

test.describe('后台', () => {
  test.beforeAll(async ({}, testInfo) => {
    await seedTestUser(testUserEmail(testInfo.project.name))
  })

  test.afterAll(async ({}, testInfo) => {
    await cleanupTestUser(testUserEmail(testInfo.project.name))
  })

  test('登录页为中文界面，管理员可以登录', async ({ page }, testInfo) => {
    await page.goto('/admin/login')
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh')
    await page.fill('#field-email', testUserEmail(testInfo.project.name))
    await page.fill('#field-password', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin')
    await expect(page.getByRole('link', { name: /用户|Users/ }).first()).toBeVisible()
  })
})
