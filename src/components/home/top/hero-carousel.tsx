import { ArrowRight } from 'lucide-react'
import { getImageProps } from 'next/image'

import { Container } from '@/components/common/container'
import {
  HOME_LEAD_INTENTS,
  HOME_LEAD_POSITIONS,
  HOME_SECTION_IDS,
} from '@/components/home/constants'
import { HOME_CONTAINER_CLASS } from '@/components/home/rhythm'
import type { HeroCarouselProps } from '@/components/home/types'
import { LeadCTA } from '@/components/lead/lead-cta'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { coverSizes, type CoverFrame } from '@/lib/home/cover-sizes'
import type { HomeBanner } from '@/lib/home/types'
import { cn } from '@/lib/utils'

import { HeroCarouselFrame } from './hero-carousel-frame'
import { HERO_VIEWPORT_CLASS } from './hero-carousel-logic'
import { HomeLinkAnchor } from './home-link'

const t = zh.home.top.hero

/**
 * 美术指导（art direction）：≥ 640px 由 <source> 提供桌面图（横幅），以下回落到 <img> 的移动端图（竖幅），
 * 浏览器只下载匹配的一张。
 */
const DESKTOP_MEDIA = '(min-width: 640px)'

/**
 * 横幅框在各断点的宽高比，与 SLIDE_ASPECT_CLASS 一一对应（改一处须同步另一处）；
 * 宽度：版心内缩，lg 以下两侧各留 gutter（≤ 95vw）；lg 起右侧给悬浮操作栏让位（≤ 92vw）；
 * ≥ 1360px 时版心封顶 1280px。
 */
const DESKTOP_FRAMES: readonly CoverFrame[] = [
  { minWidth: 1360, ratio: 12 / 5, width: { px: 1280 } },
  { minWidth: 1280, ratio: 12 / 5, width: { vw: 92 } },
  { minWidth: 1024, ratio: 2, width: { vw: 92 } },
  { minWidth: 768, ratio: 16 / 10, width: { vw: 95 } },
  { minWidth: 640, ratio: 3 / 2, width: { vw: 95 } },
]
const MOBILE_FRAMES: readonly CoverFrame[] = [{ minWidth: 0, ratio: 4 / 5, width: { vw: 95 } }]
const SLIDE_ASPECT_CLASS =
  'aspect-[4/5] sm:aspect-[3/2] md:aspect-[16/10] lg:aspect-[2/1] xl:aspect-[12/5]'

type HeroImage = {
  desktop: { src: string; srcSet: string | undefined; sizes: string }
  img: ReturnType<typeof getImageProps>['props']
}

/**
 * 一张轮播图的 <picture> 属性。只有第一张（eager）立即加载并提高优先级（fetchpriority=high），其余各张懒加载。
 * 不用 ReactDOM.preload：生产环境里任何指向首页的链接（Logo、面包屑）都会预取首页，预取数据中的
 * preload 提示会被 React 插入当前页面的 <head>，导致每个页面都高优先级下载首页轮播图、抢占自身的首屏图。
 * <picture> 在 HTML 中，浏览器的预加载扫描器同样能尽早发现第一张图。
 * 框是固定宽高比、图片 object-cover 铺满：sizes 按图片宽高比放大（coverSizes），
 * 比框更扁的图（如移动端没有竖图、回退到横幅桌面图）也能挑到足够宽的候选，不被拉伸；
 * 同一个 sizes 用于 <source> 与 <img>。
 * 静态预览站（images.unoptimized）没有 srcSet，回退到原图地址。
 */
function heroImage(banner: HomeBanner, eager: boolean): HeroImage {
  const desktopSizes = coverSizes(banner.image, DESKTOP_FRAMES)
  const mobileSizes = coverSizes(banner.mobileImage, MOBILE_FRAMES)
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
    alt: banner.image.alt || banner.mobileImage.alt,
    width: banner.mobileImage.width,
    height: banner.mobileImage.height,
    sizes: mobileSizes,
    loading: eager ? 'eager' : 'lazy',
    fetchPriority: eager ? 'high' : undefined,
  })

  return { desktop: { src: desktopSrc, srcSet: desktopSrcSet, sizes: desktopSizes }, img }
}

type HeroSlideProps = {
  banner: HomeBanner
  index: number
  total: number
}

/**
 * 一张轮播图：整张图铺底 + 石墨渐变遮罩（保证文字对比度，不用彩色渐变）+ 文字层。
 * 移动端与平板文字压在底部（自下而上的遮罩），桌面端居左垂直居中（自左向右的遮罩）。
 * 第一张标题是页面 h1（id = HOME_SECTION_IDS.hero），其余为 h2。
 * 按钮：有链接时跳转，否则打开留资弹窗（position home_hero）；ctaLabel 为空不显示按钮。
 * 文字较长时高度随内容增高（aspect-ratio 只是最小高度），同一轮播里各张等高。
 */
function HeroSlide({ banner, index, total }: HeroSlideProps) {
  const Heading = index === 0 ? 'h1' : 'h2'
  const { desktop, img } = heroImage(banner, index === 0)
  const carousel = total > 1

  return (
    <div
      role={carousel ? 'group' : undefined}
      aria-roledescription={carousel ? t.slideRoleDescription : undefined}
      aria-label={carousel ? formatMessage(t.slideLabel, { index: index + 1, total }) : undefined}
      className={cn(
        'relative flex w-full shrink-0 snap-start snap-always flex-col justify-end lg:justify-center',
        SLIDE_ASPECT_CLASS,
      )}
    >
      <picture>
        <source
          media={DESKTOP_MEDIA}
          srcSet={desktop.srcSet ?? desktop.src}
          sizes={desktop.srcSet ? desktop.sizes : undefined}
        />
        {/* 属性来自 next/image 的 getImageProps（官方的美术指导写法）：已优化的 srcSet、宽高与加载策略 */}
        <img {...img} alt={img.alt} className="absolute inset-0 size-full object-cover" />
      </picture>
      <div
        aria-hidden
        className={cn(
          'absolute inset-0',
          'bg-linear-to-t from-background/90 via-background/75 via-50% to-background/0 to-90%',
          'lg:bg-linear-to-r lg:from-background/90 lg:via-background/70 lg:via-50% lg:to-background/0 lg:to-85%',
        )}
      />
      <div
        className={cn(
          'relative flex w-full max-w-2xl flex-col items-start gap-3 p-5 pb-6',
          'sm:gap-4 sm:p-8 md:p-10 lg:max-w-[40rem] lg:p-14 xl:p-16',
        )}
      >
        <Heading
          id={index === 0 ? HOME_SECTION_IDS.hero : undefined}
          className="text-h1 text-foreground"
        >
          {banner.title}
        </Heading>
        {banner.subtitle ? (
          <p className="max-w-xl text-base text-foreground/80 md:text-lg lg:max-w-md">
            {banner.subtitle}
          </p>
        ) : null}
        {banner.ctaLabel ? (
          <div className="pt-2 sm:pt-3">
            {banner.link ? (
              <Button asChild size="lg">
                <HomeLinkAnchor link={banner.link}>
                  {banner.ctaLabel}
                  <ArrowRight aria-hidden />
                </HomeLinkAnchor>
              </Button>
            ) : (
              <LeadCTA
                position={HOME_LEAD_POSITIONS.hero}
                intent={HOME_LEAD_INTENTS.hero}
                size="lg"
              >
                {banner.ctaLabel}
              </LeadCTA>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * 区块 1：主视觉（服务端组件）。内缩横幅（左右留白、令牌圆角），桌面图 / 移动端图按断点切换。
 * - 没有轮播图：只输出视觉隐藏的 h1（站点品牌名）；
 * - 1 张：静态横幅，不加载任何轮播脚本、不显示控件；
 * - 多张：客户端外壳 HeroCarouselFrame 负责滑动（CSS scroll-snap）、上一张 / 下一张、圆点、
 *   暂停 / 播放与自动轮播（悬停、键盘聚焦时暂停，系统开启“减少动态效果”时默认不自动播放）。
 * 各张内容在服务端渲染后作为 children 传入，客户端只多出控件与计时逻辑。
 */
export function HeroCarousel({
  hero,
  brandName,
  className,
}: HeroCarouselProps & {
  /** 追加到 <section> 的类名（页面按整页节奏补底部留白，见 src/components/home/rhythm.ts） */
  className?: string
}) {
  const { banners } = hero
  if (banners.length === 0) {
    return (
      <h1 id={HOME_SECTION_IDS.hero} className="sr-only">
        {brandName}
      </h1>
    )
  }

  const total = banners.length
  const slides = banners.map((banner, index) => (
    <HeroSlide key={banner.id} banner={banner} index={index} total={total} />
  ))

  return (
    <section
      aria-roledescription={total > 1 ? t.roleDescription : undefined}
      aria-label={t.label}
      className={cn('pt-3 sm:pt-5 lg:pt-6', className)}
    >
      {/* lg 起右侧给悬浮操作栏让位：下一张按钮等贴右的控件不被盖住，与其它区块右缘对齐 */}
      <Container className={HOME_CONTAINER_CLASS}>
        {total > 1 ? (
          <HeroCarouselFrame
            titles={banners.map((banner) => banner.title)}
            autoplay={hero.autoplay}
            intervalMs={hero.intervalMs}
            focusableTrack={banners.every((banner) => !banner.ctaLabel)}
          >
            {slides}
          </HeroCarouselFrame>
        ) : (
          <div className={HERO_VIEWPORT_CLASS}>{slides}</div>
        )}
      </Container>
    </section>
  )
}
