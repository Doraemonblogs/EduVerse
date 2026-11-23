'use client'

import {
  ArrowUpIcon,
  CalendarCheckIcon,
  MessageCircleIcon,
  PhoneIcon,
  QrCodeIcon,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import { useLeadDialog } from '@/components/lead/lead-dialog'
import { WechatIdCopy } from '@/components/lead/wechat-id-copy'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { zh } from '@/i18n/zh'
import type { ImageSource } from '@/lib/media'
import { cn } from '@/lib/utils'

import { FloatingItem } from './floating-item'

const t = zh.layout

export type ContactActionsProps = {
  hotline: string | null
  workHours: string | null
  wechatId: string | null
  wechatQr: ImageSource | null
  /** 第三方在线客服的对话链接；未配置时“在线咨询”打开留资弹窗 */
  chatUrl: string | null
  ctaLabel: string
}

const tel = (hotline: string) => `tel:${hotline.replace(/[^\d+]/g, '')}`

/** 页面滚动超过一屏后显示“返回顶部” */
function useScrolledPast(threshold: number) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return past
}

function scrollToTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  document.getElementById('main')?.focus({ preventScroll: true })
}

/** 在线咨询：优先打开第三方客服；未配置时退回到留资弹窗（意向：在线咨询） */
function useConsult(chatUrl: string | null, position: string) {
  const { open } = useLeadDialog()
  return () => {
    if (chatUrl) window.open(chatUrl, '_blank', 'noopener')
    else open({ position, intent: 'consult', title: t.consult })
  }
}

/** 微信二维码弹窗（移动端操作条、桌面悬浮栏共用） */
function WechatDialog({
  open,
  onOpenChange,
  wechatId,
  wechatQr,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  wechatId: string | null
  wechatQr: ImageSource | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.wechatTitle}</DialogTitle>
          <DialogDescription>{t.wechatDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 px-6 pt-5">
          {wechatQr ? (
            <Image
              src={wechatQr.src}
              alt={zh.lead.success.qrAlt}
              width={192}
              height={192}
              sizes="192px"
              className="size-48 rounded-sm border border-border"
            />
          ) : null}
          {/* 复制状态在弹窗内容里：关闭弹窗即复位 */}
          {wechatId ? <WechatIdCopy wechatId={wechatId} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 桌面端右侧悬浮栏（≥1024px）：在线咨询 / 电话 / 微信 / 预约试听 / 返回顶部。
 * 电话与微信在悬停或键盘聚焦时展开详情（可移入、可按 Esc 关闭，见 FloatingItem）。
 */
export function FloatingActions({
  hotline,
  workHours,
  wechatId,
  wechatQr,
  chatUrl,
  ctaLabel,
}: ContactActionsProps) {
  const { open } = useLeadDialog()
  const consult = useConsult(chatUrl, 'floating_consult')
  const showTop = useScrolledPast(600)
  const [wechatOpen, setWechatOpen] = useState(false)

  return (
    <aside
      aria-label={t.quickActions}
      className="fixed top-1/2 right-[max(0.75rem,env(safe-area-inset-right,0px))] z-30 hidden -translate-y-1/2 flex-col items-end gap-2 lg:flex"
    >
      <div className="surface-light flex flex-col overflow-visible rounded-md border border-border bg-background shadow-md">
        <FloatingItem
          icon={<MessageCircleIcon aria-hidden />}
          label={t.consult}
          onClick={consult}
        />
        {hotline ? (
          <FloatingItem
            icon={<PhoneIcon aria-hidden />}
            label={t.phone}
            href={tel(hotline)}
            detail={
              <>
                <span className="text-xs text-muted-foreground">{t.hotline}</span>
                <span className="numeric text-lg font-semibold">{hotline}</span>
                {workHours ? (
                  <span className="text-xs text-muted-foreground">{workHours}</span>
                ) : null}
              </>
            }
          />
        ) : null}
        {wechatQr || wechatId ? (
          <FloatingItem
            icon={<QrCodeIcon aria-hidden />}
            label={t.wechat}
            onClick={() => setWechatOpen(true)}
            detail={
              wechatQr ? (
                <>
                  {/*
                    max-w-none：浮层按最小内容宽度收缩（定位在按钮左侧，可用宽度为 0），
                    预设的 img { max-width: 100% } 会把二维码压到说明文字的宽度（变形且 Next 告警）
                  */}
                  <Image
                    src={wechatQr.src}
                    alt={zh.lead.success.qrAlt}
                    width={128}
                    height={128}
                    sizes="128px"
                    className="size-32 max-w-none"
                  />
                  <span className="text-xs text-muted-foreground">{t.wechatTitle}</span>
                </>
              ) : undefined
            }
          />
        ) : null}
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => open({ position: 'floating_trial', intent: 'trial' })}
          className="flex w-14 cursor-pointer flex-col items-center gap-1 rounded-b-md bg-primary px-0.5 py-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <CalendarCheckIcon className="size-5" aria-hidden />
          {ctaLabel}
        </button>
      </div>
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={t.backToTop}
        tabIndex={showTop ? 0 : -1}
        aria-hidden={!showTop}
        className={cn(
          'surface-light grid size-14 cursor-pointer place-items-center rounded-md border border-border bg-background shadow-md transition-opacity duration-200',
          showTop ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <ArrowUpIcon className="size-5" aria-hidden />
      </button>
      <WechatDialog
        open={wechatOpen}
        onOpenChange={setWechatOpen}
        wechatId={wechatId}
        wechatQr={wechatQr}
      />
    </aside>
  )
}

/**
 * 移动端底部固定操作条（< 1024px）：电话 / 微信 / 在线咨询 / 预约试听，拇指可达。
 * 预留安全区（底部横条；横屏时左右的刘海 / 圆角）；页面底部相应留白，避免遮挡页脚内容。
 */
export function MobileActionBar({
  hotline,
  wechatId,
  wechatQr,
  chatUrl,
  ctaLabel,
}: ContactActionsProps) {
  const { open } = useLeadDialog()
  const consult = useConsult(chatUrl, 'mobile_bar_consult')
  const showTop = useScrolledPast(600)
  const [wechatOpen, setWechatOpen] = useState(false)
  const item =
    'flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-xs text-foreground [&_svg]:size-5'

  return (
    <>
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={t.backToTop}
        tabIndex={showTop ? 0 : -1}
        aria-hidden={!showTop}
        className={cn(
          'surface-light fixed right-[calc(1rem+env(safe-area-inset-right,0px))] bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 grid size-11 cursor-pointer place-items-center rounded-full border border-border bg-background shadow-md transition-opacity duration-200 lg:hidden',
          showTop ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <ArrowUpIcon className="size-5" aria-hidden />
      </button>
      <nav
        aria-label={t.quickActions}
        className="surface-light fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-background pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] shadow-bar lg:hidden"
      >
        {hotline ? (
          <a href={tel(hotline)} className={item}>
            <PhoneIcon aria-hidden />
            {t.phone}
          </a>
        ) : null}
        {wechatQr || wechatId ? (
          <button
            type="button"
            onClick={() => setWechatOpen(true)}
            className={item}
            aria-haspopup="dialog"
          >
            <QrCodeIcon aria-hidden />
            {t.wechat}
          </button>
        ) : null}
        <button type="button" onClick={consult} className={item}>
          <MessageCircleIcon aria-hidden />
          {t.consult}
        </button>
        <div className="flex flex-[1.6] items-center px-3 py-2">
          <Button
            type="button"
            block
            aria-haspopup="dialog"
            onClick={() => open({ position: 'mobile_action_bar', intent: 'trial' })}
          >
            {ctaLabel}
          </Button>
        </div>
      </nav>
      <WechatDialog
        open={wechatOpen}
        onOpenChange={setWechatOpen}
        wechatId={wechatId}
        wechatQr={wechatQr}
      />
    </>
  )
}
