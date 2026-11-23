import { ArrowDownIcon, CalendarDaysIcon, MapPinIcon } from 'lucide-react'
import { getImageProps } from 'next/image'

import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { LeadCTA } from '@/components/lead/lead-cta'
import { zh } from '@/i18n/zh'
import { formatEventDateTime } from '@/lib/careers/mappers'
import { CAREERS_PATH } from '@/lib/careers/paths'
import type { CareerEvent, CareersHeroBanner, CareersPageData } from '@/lib/careers/types'
import { coverSizes, type CoverFrame } from '@/lib/home/cover-sizes'
import { cn } from '@/lib/utils'

import {
  CAREERS_CONTAINER_CLASS,
  CAREERS_HERO_SCRIM_CLASS,
  CAREERS_SECTION_IDS,
  CAREERS_TITLE_ID,
} from './careers-layout'

const p = zh.careers.page
const e = zh.careers.events

/**
 * 美术指导（art direction）：≥ 640px 由 <source> 提供桌面图（横幅），以下回落到 <img> 的移动端图（竖幅），
 * 浏览器只下载匹配的一张（与首页主视觉同一断点）。
 */
const DESKTOP_MEDIA = '(min-width: 640px)'

/**
 * 首屏通栏（100vw）在各断点的宽高比：高度由文字撑开，按种子文案实测（1280px 约 2.56:1、1440px 约 2.8:1；
 * 1024px 约 2.16:1；640px 约 1.63:1、768px 约 1.83:1；390px 约 0.98:1）再取偏窄的值留出余量
 * （文案更长时首屏更高）。sizes 按图片宽高比放大（coverSizes），object-cover 铺满时不被拉伸发虚。
 */
const DESKTOP_FRAMES: readonly CoverFrame[] = [
  // 文案与活动卡片左右两栏
  { minWidth: 1280, ratio: 2.5, width: { vw: 100 } },
  { minWidth: 1024, ratio: 2, width: { vw: 100 } },
  // 单栏（活动卡片隐藏）
  { minWidth: 640, ratio: 1.6, width: { vw: 100 } },
]
const MOBILE_FRAMES: readonly CoverFrame[] = [{ minWidth: 0, ratio: 0.8, width: { vw: 100 } }]

type CareersHeroProps = {
  intro: CareersPageData['intro']
  /** 留资弹窗的标题与说明（与结尾行动号召同一份后台文案） */
  cta: CareersPageData['cta']
  /** 背景图：投放期内的“就业服务页顶部”轮播图；没有时为纯深色底 */
  banner: CareersHeroBanner | null
  /** 最近一场（尚未过去的）招聘活动；没有时首屏只有文案一栏 */
  nextEvent: CareerEvent | null
}

/**
 * 就业服务页首屏（深色区块）：面包屑、英文眉标、标题（h1）、描述（均来自后台「就业服务页 · 页面介绍」），
 * “预约就业咨询”（position=careers_hero，意向 consult）；桌面端右侧是最近一场招聘活动的提示卡片
 * （链接到页内的招聘活动区块；移动端不显示，活动列表紧随其后）。不展示任何就业率、薪资类数字。
 * 后台「轮播图」有投放期内的“就业服务页顶部”时，它的图片铺满首屏做背景（石墨遮罩之下）；没有时是纯深色底。
 */
export function CareersHero({ intro, cta, banner, nextEvent }: CareersHeroProps) {
  return (
    <Section
      tone="dark"
      aria-labelledby={CAREERS_TITLE_ID}
      // isolate：背景层（-z-10）画在区块自身底色之上、内容之下
      className={cn('pt-section-sm', banner && 'relative isolate')}
    >
      <Container className={cn('flex flex-col gap-10 md:gap-14', CAREERS_CONTAINER_CLASS)}>
        <Breadcrumbs items={[{ label: intro.title, href: CAREERS_PATH }]} />

        <div
          className={cn(
            'grid gap-10',
            nextEvent && 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16',
          )}
        >
          <div className="flex max-w-3xl min-w-0 flex-col gap-5">
            {intro.eyebrow ? (
              <p className="eyebrow flex items-center gap-3 text-muted-foreground">
                <span aria-hidden className="h-px w-6 bg-current" />
                {intro.eyebrow}
              </p>
            ) : null}
            <h1 id={CAREERS_TITLE_ID} className="text-h1 text-foreground">
              {intro.title}
            </h1>
            {intro.description ? (
              <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
                {intro.description}
              </p>
            ) : null}
            <div className="pt-3">
              <LeadCTA
                position="careers_hero"
                intent="consult"
                title={cta.title}
                description={cta.description ?? undefined}
                size="lg"
                className="w-full sm:w-auto"
              >
                {p.consult}
              </LeadCTA>
            </div>
          </div>

          {nextEvent ? <NextEventCard event={nextEvent} /> : null}
        </div>
      </Container>

      {banner ? (
        <CareersHeroBackdrop banner={banner} scrim={nextEvent ? 'split' : 'single'} />
      ) : null}
    </Section>
  )
}

/**
 * 首屏背景：<picture>（桌面图 / 移动端图按断点切换）铺满整个区块 + 石墨遮罩。
 * 纯装饰（文案来自页面介绍，图片不承载信息）：整层 aria-hidden，图片 alt 为空。
 * 首屏最大的图（LCP）：立即加载、提高优先级（fetchpriority=high）。
 * 不用 ReactDOM.preload / next/image 的 preload：生产环境里导航链接会预取 /careers，预取数据中的
 * preload 提示会被插入当前页面的 <head>，让其它页面也高优先级下载这张图；
 * <picture> 在 HTML 里，浏览器的预加载扫描器同样能尽早发现它。
 * 属性来自 next/image 的 getImageProps（官方的美术指导写法）：已优化的 srcSet、宽高与加载策略；
 * 静态预览站（images.unoptimized）没有 srcSet，回退到原图地址。
 */
function CareersHeroBackdrop({
  banner,
  scrim,
}: {
  banner: CareersHeroBanner
  scrim: keyof typeof CAREERS_HERO_SCRIM_CLASS
}) {
  const desktopSizes = coverSizes(banner.image, DESKTOP_FRAMES)
  const {
    props: { src: desktopSrc, srcSet: desktopSrcSet },
  } = getImageProps({
    src: banner.image.src,
    alt: '',
    width: banner.image.width,
    height: banner.image.height,
    sizes: desktopSizes,
  })
  const { props: img } = getImageProps({
    src: banner.mobileImage.src,
    alt: '',
    width: banner.mobileImage.width,
    height: banner.mobileImage.height,
    sizes: coverSizes(banner.mobileImage, MOBILE_FRAMES),
    loading: 'eager',
    fetchPriority: 'high',
  })

  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <picture>
        <source
          media={DESKTOP_MEDIA}
          srcSet={desktopSrcSet ?? desktopSrc}
          sizes={desktopSrcSet ? desktopSizes : undefined}
        />
        <img {...img} alt="" className="absolute inset-0 size-full object-cover" />
      </picture>
      <div className={cn('absolute inset-0', CAREERS_HERO_SCRIM_CLASS[scrim])} />
    </div>
  )
}

/** 最近一场招聘活动（≥ lg 显示）：时间、名称、地点，底部链接到页内的活动列表 */
function NextEventCard({ event }: { event: CareerEvent }) {
  const time = formatEventDateTime(event.date)
  const place = event.location ?? event.campus?.name ?? null

  return (
    <div className="hidden flex-col gap-4 rounded-md border border-border bg-card p-6 text-card-foreground lg:flex xl:p-8">
      <p className="eyebrow text-muted-foreground">{p.nextEvent}</p>
      <p className="text-h4 text-foreground">{event.title}</p>
      <dl className="flex flex-col gap-2 text-sm text-muted-foreground">
        {time ? (
          <div className="flex items-start gap-2">
            <dt className="shrink-0 pt-0.5">
              <CalendarDaysIcon aria-hidden className="size-4" />
              <span className="sr-only">{e.date}</span>
            </dt>
            <dd className="numeric">
              <time dateTime={event.date}>{time}</time>
            </dd>
          </div>
        ) : null}
        {place ? (
          <div className="flex items-start gap-2">
            <dt className="shrink-0 pt-0.5">
              <MapPinIcon aria-hidden className="size-4" />
              <span className="sr-only">{e.location}</span>
            </dt>
            <dd>{place}</dd>
          </div>
        ) : null}
      </dl>
      <a
        href={`#${CAREERS_SECTION_IDS.events}`}
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 self-start border-t border-border pt-4 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
      >
        {p.allEvents}
        <ArrowDownIcon aria-hidden className="size-4" />
      </a>
    </div>
  )
}
