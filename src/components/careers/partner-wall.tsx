import Image from 'next/image'

import { HorizontalScroller } from '@/components/common/horizontal-scroller'
import { logoWallColumns } from '@/components/home/bottom/layout'
import { zh } from '@/i18n/zh'
import type { HomePartner } from '@/lib/home/types'

/** Logo 宽度：移动端每屏 2.6 列、sm 3.6、md 4.6，≥ lg 5–6 列网格（版心 1280px） */
const LOGO_SIZES =
  '(min-width: 1360px) 240px, (min-width: 1024px) 20vw, (min-width: 768px) 22vw, (min-width: 640px) 28vw, 38vw'

export type PartnerWallProps = {
  partners: HomePartner[]
  /** 列表的无障碍名称，默认 zh.careers.partners.listLabel */
  label?: string
}

/**
 * 合作企业 Logo 墙（服务端组件；首页“合作企业”与就业服务页共用）：灰度显示、悬停恢复原色，alt 为企业名称；
 * 移动端两行横滑（按列吸附，露出下一列的一部分），≥ lg 为 5 或 6 列网格（见 logoWallColumns）。
 * 不输出企业官网链接（避免外链第三方），Logo 不可点击。
 */
export function PartnerWall({ partners, label = zh.careers.partners.listLabel }: PartnerWallProps) {
  return (
    <HorizontalScroller
      label={label}
      size="logo"
      desktop="grid"
      columns={logoWallColumns(partners.length)}
      // < lg：两行、按列排布的横滑（列宽公式与 scroller-item 一致）；≥ lg 由 desktop="grid" 接管
      listClassName="max-lg:grid max-lg:grid-flow-col max-lg:grid-rows-2 max-lg:auto-cols-[calc((100%_-_(var(--scroller-per-view)_-_1)_*_var(--scroller-gap))_/_var(--scroller-per-view))] [--scroller-gap:0.75rem] lg:[--scroller-gap:1rem]"
    >
      {partners.map((partner) => (
        <PartnerLogo key={partner.id} partner={partner} />
      ))}
    </HorizontalScroller>
  )
}

function PartnerLogo({ partner }: { partner: HomePartner }) {
  return (
    <div className="group flex aspect-[2/1] items-center justify-center overflow-hidden rounded-sm border border-border bg-card lg:aspect-[5/2] lg:px-3">
      <Image
        src={partner.logo.src}
        alt={partner.logo.alt || partner.name}
        width={partner.logo.width}
        height={partner.logo.height}
        sizes={LOGO_SIZES}
        loading="lazy"
        className="size-full object-contain opacity-75 grayscale transition duration-300 ease-standard group-hover:opacity-100 group-hover:grayscale-0 motion-reduce:transition-none"
      />
    </div>
  )
}
