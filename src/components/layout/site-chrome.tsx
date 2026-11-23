import { LeadDialogProvider } from '@/components/lead/lead-dialog'
import { SourceTracker } from '@/components/lead/source-tracker'
import { zh } from '@/i18n/zh'
import { getLeadFormConfig } from '@/lib/data/lead-form'
import {
  getCampusList,
  getFooter,
  getMegaMenu,
  getNavigation,
  getSiteSettings,
  getThirdPartyConfig,
} from '@/lib/data/site'

import { FloatingActions, MobileActionBar } from './contact-actions'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'
import { ThirdPartyScripts } from './third-party-scripts'

/**
 * 全站框架：头部（导航 + 大菜单 / 移动端抽屉）、页脚、桌面悬浮栏、移动端底部操作条、留资弹窗。
 * 前台布局与全局 404 共用。数据全部来自后台配置（带缓存标签）。
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const [settings, navigation, footer, groups, campuses, leadConfig, thirdParty] =
    await Promise.all([
      getSiteSettings(),
      getNavigation(),
      getFooter(),
      getMegaMenu(),
      getCampusList(),
      getLeadFormConfig(),
      getThirdPartyConfig(),
    ])

  const ctaLabel = navigation.cta?.label || zh.layout.trial
  const contact = {
    hotline: settings.hotline ?? null,
    workHours: settings.workHours ?? null,
    wechatId: leadConfig.wechatId,
    wechatQr: leadConfig.wechatQr,
    chatUrl: thirdParty.customerService.enabled ? thirdParty.customerService.chatUrl : null,
    ctaLabel,
  }

  return (
    <LeadDialogProvider config={leadConfig}>
      <SourceTracker />
      <SiteHeader
        brand={{ name: settings.brandName, shortName: settings.shortName, logo: settings.logo }}
        items={(navigation.items ?? []).map((item) => ({
          label: item.label,
          type: item.type,
          href: item.href,
        }))}
        ctaLabel={ctaLabel}
        showSearch={navigation.showSearch !== false}
        hotline={settings.hotline ?? null}
        groups={groups}
        campuses={campuses}
      />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <SiteFooter footer={footer} settings={settings} />
      <FloatingActions {...contact} />
      <MobileActionBar {...contact} />
      <ThirdPartyScripts />
    </LeadDialogProvider>
  )
}
