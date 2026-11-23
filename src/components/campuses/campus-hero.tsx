import { ArrowUpRightIcon, MapPinIcon } from 'lucide-react'
import Image from 'next/image'
import type * as React from 'react'

import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { LeadCTA } from '@/components/lead/lead-cta'
import { Badge } from '@/components/ui/badge'
import { zh } from '@/i18n/zh'
import { CAMPUSES_PATH, campusPath } from '@/lib/campuses/paths'
import type { CampusDetail, CampusPagesSettings } from '@/lib/campuses/types'
import { formatMessage } from '@/lib/course/format'
import { cn } from '@/lib/utils'

const t = zh.campuses.detail
const tMap = zh.campuses.map

/** 留资位置标识：校区详情首屏的“预约到校参观” */
export const CAMPUS_HERO_POSITION = 'campus_hero'

export const CAMPUS_TITLE_ID = 'campus-title'

/** 首屏大图：桌面端占半栏（版心 1280px），移动端通栏 */
const HERO_SIZES = '(min-width: 1360px) 620px, (min-width: 1024px) 46vw, 100vw'

/** 地图外链：下划线常驻（不只靠颜色区分），高度 44px 满足触控目标 */
const MAP_LINK =
  'inline-flex min-h-11 items-center gap-1 rounded-xs text-sm font-medium text-foreground underline decoration-muted-foreground underline-offset-4 transition-colors hover:decoration-foreground'

type CampusHeroProps = {
  campus: CampusDetail
  settings: CampusPagesSettings
}

type Fact = { label: string; value: React.ReactNode; className?: string; plain?: boolean }

/**
 * 校区详情首屏（深色区块）：面包屑、城市、校区名（h1）、封面大图（唯一的高优先级图片），
 * 概况 <dl>（地址与高德 / 百度地图外链、电话（tel: 链接）、开放时间、交通指引），
 * 以及“预约到校参观”（留资弹窗 position=campus_hero，标题与说明来自后台「校区页面设置」）。
 * 地图只是普通外链（新窗口、rel="noopener noreferrer"），页面不加载地图脚本、不请求第三方。
 * 桌面端左栏文字、右栏大图；移动端依次为校区名、大图、概况与按钮
 * （DOM 顺序即阅读顺序，桌面端用网格把大图放到右栏）。
 */
export function CampusHero({ campus, settings }: CampusHeroProps) {
  const image = campus.heroImage ?? campus.cover
  const facts = campusFacts(campus)

  return (
    <Section tone="dark" spacing="sm" aria-labelledby={CAMPUS_TITLE_ID}>
      {/* 右栏大图贴着版心右缘：lg:avoid-floating-actions 给桌面端悬浮操作栏让出位置（全页统一，右缘对齐） */}
      <Container className="flex flex-col gap-8 md:gap-10 lg:avoid-floating-actions">
        <Breadcrumbs
          items={[
            { label: settings.list.title, href: CAMPUSES_PATH },
            { label: campus.name, href: campusPath(campus.slug) },
          ]}
        />

        <div className="grid gap-y-6 md:gap-y-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-12 xl:gap-x-16">
          <div className="flex min-w-0 flex-col items-start gap-4 lg:col-start-1 lg:row-start-1">
            {campus.city ? (
              <Badge variant="outline">
                <MapPinIcon aria-hidden />
                {campus.city}
              </Badge>
            ) : null}
            <h1 id={CAMPUS_TITLE_ID} className="text-h1 text-foreground">
              {campus.name}
            </h1>
          </div>

          {image ? (
            <div className="aspect-video overflow-hidden rounded-md bg-muted lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:aspect-[4/3] lg:self-center">
              <Image
                src={image.src}
                alt={image.alt || campus.name}
                width={image.width}
                height={image.height}
                sizes={HERO_SIZES}
                preload
                className="size-full object-cover"
              />
            </div>
          ) : null}

          <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
            <dl className="grid gap-x-8 sm:grid-cols-2">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className={cn(
                    'flex min-w-0 flex-col gap-1 border-t border-border py-4',
                    fact.className,
                  )}
                >
                  <dt className="text-sm text-muted-foreground">{fact.label}</dt>
                  <dd
                    className={cn(
                      'text-foreground wrap-break-word',
                      fact.plain ? 'text-base' : 'font-semibold break-keep',
                    )}
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div>
              <LeadCTA
                position={CAMPUS_HERO_POSITION}
                intent="consult"
                title={settings.detail.ctaTitle}
                description={settings.detail.ctaDescription ?? undefined}
                size="lg"
                className="w-full sm:w-auto"
              >
                {t.visit}
              </LeadCTA>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}

/**
 * 首屏概况：地址（附地图外链）与交通指引较长，独占一行；电话、开放时间并排。没有数据的项不显示。
 */
function campusFacts(campus: CampusDetail): Fact[] {
  const facts: Fact[] = [
    {
      label: t.facts.address,
      value: (
        <>
          <span className="block">{campus.address}</span>
          <MapLinks campus={campus} />
        </>
      ),
      className: 'sm:col-span-2',
    },
  ]
  if (campus.phone) {
    facts.push({
      label: t.facts.phone,
      value: campus.phoneHref ? (
        // 伪元素把点击区域上下各扩 10px（补足 44px 高），链接本身仍贴合文字
        <a
          href={campus.phoneHref}
          className="numeric relative inline-block rounded-xs underline decoration-muted-foreground underline-offset-4 transition-colors before:absolute before:inset-x-0 before:-inset-y-2.5 hover:decoration-foreground"
        >
          {campus.phone}
        </a>
      ) : (
        <span className="numeric">{campus.phone}</span>
      ),
    })
  }
  if (campus.openingHours) {
    facts.push({ label: t.facts.openingHours, value: campus.openingHours })
  }
  if (campus.transit) {
    facts.push({
      label: t.facts.transit,
      value: <span className="whitespace-pre-line">{campus.transit}</span>,
      className: 'sm:col-span-2',
      plain: true,
    })
  }
  return facts
}

type MapLink = { key: 'amap' | 'baidu'; label: string; href: string }

/** 高德 / 百度地图标注页外链（新窗口）；没有坐标时都为 null，整组不显示 */
function MapLinks({ campus }: { campus: Pick<CampusDetail, 'name' | 'mapUrl' | 'baiduMapUrl'> }) {
  const links: MapLink[] = []
  if (campus.mapUrl) links.push({ key: 'amap', label: tMap.amap, href: campus.mapUrl })
  if (campus.baiduMapUrl) links.push({ key: 'baidu', label: tMap.baidu, href: campus.baiduMapUrl })
  if (links.length === 0) return null
  return (
    <ul
      role="list"
      aria-label={t.mapLinksLabel}
      className="mt-1 flex flex-wrap gap-x-6 text-sm font-normal"
    >
      {links.map((link) => (
        <li key={link.key}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={formatMessage(tMap.linkLabel, { label: link.label, name: campus.name })}
            className={MAP_LINK}
          >
            {link.label}
            <ArrowUpRightIcon aria-hidden className="size-4" />
          </a>
        </li>
      ))}
    </ul>
  )
}
