import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

import { SectionHeading } from '@/components/common/section-heading'
import { Button } from '@/components/ui/button'
import type { HomeSectionHeading } from '@/lib/home/types'
import { cn } from '@/lib/utils'

/** “查看全部 →”：站内路径（交给 next/link）与文字 */
export type HomeMoreLink = { href: string; label: string }

type HomeSectionHeaderProps = {
  /** 标题 id（HOME_SECTION_IDS.x，区块的 aria-labelledby 指向它） */
  id: string
  heading: HomeSectionHeading
  /** ≥ md 时显示在标题右侧（文字链接）；移动端用 <HomeMoreLinkMobile> 放到区块末尾 */
  more?: HomeMoreLink
  className?: string
}

/**
 * 首页区块标题行（服务端组件，区块 2–10 共用）：眉标 + 标题 + 描述（运营文案），≥ md 时右侧是“查看全部 →”文字链接。
 * 移动端不在标题下方放链接（避免标题与卡片之间多出一行），改由 HomeMoreLinkMobile 放在区块末尾，
 * 两者按断点只显示一个（display:none 的一份不进入读屏与 Tab 顺序）。
 * 不用 SectionHeading 的 actions：它在移动端也保留操作区的位置（纵向排列时多出一段间距）。
 */
export function HomeSectionHeader({ id, heading, more, className }: HomeSectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-8', className)}>
      <SectionHeading
        as="h2"
        id={id}
        eyebrow={heading.eyebrow ?? undefined}
        title={heading.title}
        description={heading.description ?? undefined}
      />
      {more ? (
        <Button asChild variant="link" className="hidden min-h-11 text-base md:inline-flex">
          <Link href={more.href} prefetch={false}>
            {more.label}
            <ArrowRightIcon aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}

/** 移动端区块末尾的“查看全部 →”（整行描边按钮，拇指可达）；≥ md 隐藏，由标题行右侧的链接代替 */
export function HomeMoreLinkMobile({
  href,
  label,
  className,
}: HomeMoreLink & { className?: string }) {
  return (
    <Button asChild variant="outline" block className={cn('md:hidden', className)}>
      <Link href={href} prefetch={false}>
        {label}
        <ArrowRightIcon aria-hidden />
      </Link>
    </Button>
  )
}
