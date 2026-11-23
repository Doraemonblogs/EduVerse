import { MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { LeadCTA } from '@/components/lead/lead-cta'
import { zh } from '@/i18n/zh'
import type { getFooter, getSiteSettings } from '@/lib/data/site'
import { imageSource } from '@/lib/media'
import { cn } from '@/lib/utils'

import { Logo } from './logo'

type FooterData = Awaited<ReturnType<typeof getFooter>>
type SettingsData = Awaited<ReturnType<typeof getSiteSettings>>

const t = zh.layout

/**
 * 滚到页面底部时，页脚右侧（热线、二维码）会停在桌面端悬浮操作栏旁边：
 * 页脚各行都给悬浮栏让出右侧位置（视口 ≥ 1440px 时不变），各行右缘保持对齐。
 */
const AVOID_FLOATING = 'lg:avoid-floating-actions'

/** 站内链接走 next/link（自动带 basePath），外链新窗口打开 */
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className = 'text-sm text-muted-foreground transition-colors hover:text-foreground'
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} prefetch={false} className={className}>
      {children}
    </Link>
  )
}

/**
 * 页脚：顶部深色转化区（标题、按钮、说明），其下为品牌与联系方式、链接栏、二维码，
 * 底部为版权、隐私政策 / 用户协议与 ICP / 公安备案号（全部来自后台配置）。
 */
export function SiteFooter({ footer, settings }: { footer: FooterData; settings: SettingsData }) {
  const year = new Date().getFullYear()
  const copyright = (footer.copyright ?? '').replace('{year}', String(year))
  const cta = footer.cta
  const psbCode = settings.psb?.code

  return (
    // 移动端底部有固定操作条：页脚底部留出同样高度，避免遮挡备案信息
    <footer className="surface-dark pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      {cta?.enabled && cta.title ? (
        <div className="border-b border-border" data-footer-cta="">
          {/*
            lg 以下标题与按钮上下排列；lg 起左右排列，按钮组不收缩（热线号码不会被挤成竖排），
            由标题一侧换行。
          */}
          <div
            className={cn(
              'container-site flex flex-col gap-6 py-section-sm lg:flex-row lg:items-center lg:justify-between lg:gap-10',
              AVOID_FLOATING,
            )}
          >
            <div className="flex max-w-2xl min-w-0 flex-col gap-2">
              <h2 className="text-h2">{cta.title}</h2>
              {cta.description ? <p className="text-muted-foreground">{cta.description}</p> : null}
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <LeadCTA position="footer_cta" intent="trial" size="lg">
                {cta.buttonLabel || zh.lead.submit}
              </LeadCTA>
              {settings.hotline ? (
                <a
                  href={`tel:${settings.hotline.replace(/[^\d+]/g, '')}`}
                  className="flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
                >
                  <PhoneIcon className="size-4 shrink-0" aria-hidden />
                  {t.hotline} <span className="numeric text-foreground">{settings.hotline}</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'container-site grid gap-10 py-12 lg:grid-cols-[1.3fr_2fr_auto] lg:gap-12',
          AVOID_FLOATING,
        )}
      >
        <div className="flex flex-col gap-4">
          <Logo
            brandName={settings.brandName}
            shortName={settings.shortName}
            logo={settings.logoOnDark}
          />
          {settings.brandDescription ? (
            <p className="max-w-sm text-sm text-muted-foreground">{settings.brandDescription}</p>
          ) : null}
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {settings.hotline ? (
              <li className="flex items-center gap-2">
                <PhoneIcon className="size-4 shrink-0" aria-hidden />
                <span>
                  {t.hotline}：<span className="numeric text-foreground">{settings.hotline}</span>
                  {settings.workHours ? `（${settings.workHours}）` : ''}
                </span>
              </li>
            ) : null}
            {settings.email ? (
              <li className="flex items-center gap-2">
                <MailIcon className="size-4 shrink-0" aria-hidden />
                <a href={`mailto:${settings.email}`} className="hover:text-foreground">
                  {settings.email}
                </a>
              </li>
            ) : null}
            {settings.address ? (
              <li className="flex items-start gap-2">
                <MapPinIcon className="mt-1 size-4 shrink-0" aria-hidden />
                <span>{settings.address}</span>
              </li>
            ) : null}
          </ul>
        </div>

        {footer.columns?.length ? (
          <nav aria-label={t.footerNav} className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footer.columns.map((column) => (
              <div key={column.id ?? column.title} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold">{column.title}</h2>
                <ul className="flex flex-col gap-2">
                  {(column.links ?? []).map((link) => (
                    <li key={link.id ?? link.href}>
                      <FooterLink href={link.href}>{link.label}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        ) : null}

        {footer.qrcodes?.length ? (
          // 二维码多于一行能放下的数量时换行，而不是被压窄（max-w-none：二维码始终保持正方形）
          <div className="flex flex-wrap gap-4">
            {footer.qrcodes.map((qr) => {
              const image = imageSource(qr.image, 'thumbnail')
              return image ? (
                <figure key={qr.id ?? qr.label} className="flex flex-col items-center gap-2">
                  <Image
                    src={image.src}
                    alt={qr.label}
                    width={112}
                    height={112}
                    sizes="112px"
                    className="size-28 max-w-none rounded-sm bg-white p-1.5"
                  />
                  <figcaption className="text-xs text-muted-foreground">{qr.label}</figcaption>
                </figure>
              ) : null
            })}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border">
        <div
          className={cn(
            'container-site flex flex-col gap-3 py-6 text-xs text-muted-foreground lg:flex-row lg:items-center lg:justify-between',
            AVOID_FLOATING,
          )}
        >
          <p>{copyright}</p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {(footer.bottomLinks ?? []).map((link) => (
              <li key={link.id ?? link.href}>
                <FooterLink href={link.href}>{link.label}</FooterLink>
              </li>
            ))}
            {settings.icp?.number ? (
              <li>
                <a
                  href={settings.icp.link || 'https://beian.miit.gov.cn/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  {settings.icp.number}
                </a>
              </li>
            ) : null}
            {settings.psb?.number ? (
              <li>
                {psbCode ? (
                  <a
                    href={`https://beian.mps.gov.cn/#/query/webSearch?code=${psbCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground"
                  >
                    {settings.psb.number}
                  </a>
                ) : (
                  settings.psb.number
                )}
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </footer>
  )
}
