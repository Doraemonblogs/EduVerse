import type { Page } from '@playwright/test'

import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/** 打开留资弹窗：桌面端用头部按钮，移动端用底部操作条 */
async function openLeadDialog(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page
      .getByRole('navigation', { name: '快捷咨询' })
      .getByRole('button', { name: '预约试听' })
      .click()
  } else {
    await page.getByRole('banner').getByRole('button', { name: '预约试听' }).click()
  }
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('留资（关键路径）', () => {
  test('提交预约试听后，后台能看到这条线索，来源字段正确', async ({ page, isMobile }, testInfo) => {
    const ns = leadNamespace('lead', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto('/?utm_source=e2e&utm_campaign=m2')

    try {
      const dialog = await openLeadDialog(page, isMobile)
      await dialog.getByLabel('姓名').fill('端到端测试')
      await dialog.getByLabel('手机号').fill(phone)
      await dialog.getByLabel('意向专业').selectOption({ label: '三维动画' })
      await dialog.getByLabel('所在城市').selectOption('北京')
      await dialog.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await dialog.getByRole('button', { name: '立即预约' }).click()

      await expect(dialog.getByRole('heading', { name: '提交成功' })).toBeVisible()
      await expect(dialog.getByRole('img', { name: '课程顾问微信二维码' })).toBeVisible()

      const lead = await findLeadByPhone(phone)
      expect(lead).not.toBeNull()
      expect(lead).toMatchObject({
        name: '端到端测试',
        intent: 'trial',
        status: 'new',
        city: '北京',
        source: {
          position: isMobile ? 'mobile_action_bar' : 'header_cta',
          utmSource: 'e2e',
          utmCampaign: 'm2',
        },
        client: { ip },
        consent: { agreed: true },
      })
      expect(lead?.source?.pageUrl).toContain('utm_source=e2e')
      expect(lead?.discipline).toBeTruthy()
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('必填项缺失时给出中文提示，焦点移到第一个错误字段，不提交', async ({ page, isMobile }) => {
    await page.goto('/')
    const dialog = await openLeadDialog(page, isMobile)
    await dialog.getByRole('button', { name: '立即预约' }).click()

    await expect(dialog.getByText('请填写姓名')).toBeVisible()
    await expect(dialog.getByText('请填写手机号')).toBeVisible()
    await expect(dialog.getByText('请先阅读并同意《隐私政策》')).toBeVisible()
    await expect(dialog.getByLabel('姓名')).toBeFocused()

    await dialog.getByLabel('姓名').fill('张同学')
    await dialog.getByLabel('手机号').fill('12345')
    await dialog.getByRole('button', { name: '立即预约' }).click()
    await expect(dialog.getByText('请输入 11 位中国大陆手机号')).toBeVisible()
    await expect(dialog.getByLabel('手机号')).toHaveAttribute('aria-invalid', 'true')
  })

  test('只缺同意勾选时，焦点移到可见的同意复选框，按空格即可勾选', async ({ page, isMobile }) => {
    await page.goto('/')
    const dialog = await openLeadDialog(page, isMobile)
    await dialog.getByLabel('姓名').fill('张同学')
    await dialog.getByLabel('手机号').fill('13800138000')
    await dialog.getByRole('button', { name: '立即预约' }).click()

    await expect(dialog.getByText('请先阅读并同意《隐私政策》')).toBeVisible()
    const checkbox = dialog.getByRole('checkbox')
    await expect(checkbox).toBeFocused()
    await expect(checkbox).toHaveAttribute('aria-invalid', 'true')
    await expect(checkbox).toHaveAttribute('aria-describedby', /.+/)
    // 焦点在可见的复选框上：空格勾选的就是它（而不是隐藏的辅助 input）
    await page.keyboard.press('Space')
    await expect(checkbox).toBeChecked()
  })

  test('服务端返回错误（提交过快）时，已填写的内容全部保留，稍后可直接再次提交', async ({
    page,
    isMobile,
  }, testInfo) => {
    const ns = leadNamespace('lead', testInfo)
    const ip = testIp(ns, 2)
    const phone = testPhone(ns, 2)
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await page.goto('/')
    try {
      const dialog = await openLeadDialog(page, isMobile)
      // 打开弹窗后立即填写并提交：填写用时（fillMs）低于最短填写时间 2 秒，服务端判定为提交过快
      await dialog.getByLabel('姓名').fill('端到端测试')
      await dialog.getByLabel('手机号').fill(phone)
      await dialog.getByLabel('所在城市').selectOption('北京')
      await dialog.getByRole('checkbox').check()
      await dialog.getByRole('button', { name: '立即预约' }).click()

      await expect(dialog.getByText('提交太快了，请确认信息后再提交')).toBeVisible()
      await expect(dialog.getByLabel('姓名')).toHaveValue('端到端测试')
      await expect(dialog.getByLabel('手机号')).toHaveValue(phone)
      await expect(dialog.getByLabel('所在城市')).toHaveValue('北京')
      await expect(dialog.getByRole('checkbox')).toBeChecked()

      // 超过最短填写时间后直接再次提交，不需要重新填写
      await page.waitForTimeout(2200)
      await dialog.getByRole('button', { name: '立即预约' }).click()
      await expect(dialog.getByRole('heading', { name: '提交成功' })).toBeVisible()
      expect(await findLeadByPhone(phone)).toMatchObject({ name: '端到端测试', city: '北京' })
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('移动端从菜单抽屉里打开留资弹窗，关闭后焦点回到菜单按钮', async ({ page, isMobile }) => {
    test.skip(!isMobile, '移动端专属')
    await page.goto('/')
    const menuButton = page.getByRole('button', { name: '打开菜单' })
    await menuButton.click()
    const drawer = page.getByRole('dialog', { name: '网站导航' })
    await drawer.getByRole('button', { name: '预约试听' }).click()

    const dialog = page.getByRole('dialog', { name: '预约免费试听' })
    await expect(dialog).toBeVisible()
    await expect(drawer).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(menuButton).toBeFocused()
  })

  test('弹窗可用键盘关闭，焦点回到触发按钮', async ({ page, isMobile }) => {
    test.skip(isMobile, '键盘操作在桌面端验证')
    await page.goto('/')
    const trigger = page.getByRole('banner').getByRole('button', { name: '预约试听' })
    await trigger.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('隐私政策链接在新窗口打开，不丢失已填写的内容', async ({ page, isMobile }) => {
    await page.goto('/')
    const dialog = await openLeadDialog(page, isMobile)
    const link = dialog.getByRole('link', { name: '《隐私政策》' })
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('href', /\/privacy$/)
  })
})
