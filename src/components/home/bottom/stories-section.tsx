import { InfoIcon, QuoteIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Container } from '@/components/common/container'
import { HorizontalScroller } from '@/components/common/horizontal-scroller'
import { Section } from '@/components/common/section'
import { HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeSectionFrameProps } from '@/components/home/rhythm'
import { HomeSectionHeader } from '@/components/home/section-header'
import type { StoriesSectionProps } from '@/components/home/types'
import { zh } from '@/i18n/zh'
import { coursePath } from '@/lib/course/paths'
import type { HomeStory } from '@/lib/home/types'
import { cn } from '@/lib/utils'

import { cardDesktopLayout, scrollerLayoutProps } from './layout'

const t = zh.home.bottom.stories

/**
 * 岗位与公司之间的分隔：“·”前的空格换成不换行空格，换行时“·”留在岗位后面、不会出现在行首。
 * 配合 break-keep（中文词内不断行）使用：只在“·”后面换行，公司名不会被拆成两行。
 */
const ROLE_SEPARATOR = t.roleSeparator.replace(/^ /, '\u00a0')

/**
 * 区块 6：学员故事（服务端组件）。横滑卡片（移动端露出下一张，下方进度条与上一组 / 下一组按钮；
 * 不超过 4 个故事时桌面端改为一行网格，更多时继续横滑）。一行 4 张从 xl 开始：1024–1279px 的版心排 4 列时
 * 卡片约 210px，引言与“岗位 · 公司”逐字折行，这一段继续横滑（每屏 3 张）。卡片：化名、现任岗位 · 公司（纯文字，不链接合作企业）、
 * 引言、学习前背景、所学课程（可公开访问时链接到课程）。
 * 不展示任何薪资；没有故事详情页，卡片本身不是链接；区块末尾注明“学员姓名为化名”。
 */
export function StoriesSection({
  section,
  tone = 'light',
  className,
}: StoriesSectionProps & HomeSectionFrameProps) {
  const { heading, items } = section
  const layout = cardDesktopLayout(items.length, { maxColumns: 4, maxRows: 1, lgMaxColumns: 3 })

  return (
    <Section tone={tone} aria-labelledby={HOME_SECTION_IDS.stories} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', HOME_CONTAINER_CLASS)}>
        <HomeSectionHeader id={HOME_SECTION_IDS.stories} heading={heading} />
        <div className="flex flex-col gap-5">
          <HorizontalScroller
            label={heading.title}
            {...scrollerLayoutProps(layout)}
            controls
            itemClassName="flex"
          >
            {items.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </HorizontalScroller>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t.pseudonymNote}
          </p>
        </div>
      </Container>
    </Section>
  )
}

/** 现任岗位 · 公司（任一为空时只显示另一个；都为空时为 null；分隔见 ROLE_SEPARATOR） */
export function storyRoleLine(story: Pick<HomeStory, 'currentRole' | 'companyName'>) {
  const parts = [story.currentRole, story.companyName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(ROLE_SEPARATOR) : null
}

function StoryCard({ story }: { story: HomeStory }) {
  const role = storyRoleLine(story)
  const hasFacts = Boolean(story.background || story.course)

  return (
    <article className="flex w-full flex-col gap-5 rounded-md border border-border bg-card p-5 text-card-foreground md:p-6">
      <div className="flex items-center gap-3.5">
        <div className="size-12 shrink-0 overflow-hidden rounded-sm bg-muted">
          {story.avatar ? (
            <Image
              src={story.avatar.src}
              alt={story.avatar.alt || story.displayName}
              width={story.avatar.width}
              height={story.avatar.height}
              sizes="48px"
              loading="lazy"
              className="size-full object-cover"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col">
          <h3 className="text-h4 text-foreground">{story.displayName}</h3>
          {role ? (
            <p className="text-sm break-keep text-muted-foreground wrap-break-word">
              <span className="sr-only">{t.currentRole}：</span>
              {role}
            </p>
          ) : null}
        </div>
      </div>

      {story.quote ? (
        <blockquote className="flex flex-1 flex-col gap-2">
          <QuoteIcon aria-hidden className="size-5 text-emphasis" />
          <p className="text-base text-foreground">{story.quote}</p>
        </blockquote>
      ) : (
        <div className="flex-1" />
      )}

      {hasFacts ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-border pt-4 text-sm">
          {story.background ? (
            <>
              <dt className="text-muted-foreground">{t.background}</dt>
              <dd className="text-foreground">{story.background}</dd>
            </>
          ) : null}
          {story.course ? (
            <>
              <dt className="text-muted-foreground">{t.course}</dt>
              <dd>
                <Link
                  href={coursePath(story.course.slug)}
                  prefetch={false}
                  className="text-foreground underline decoration-muted-foreground underline-offset-4 hover:decoration-current"
                >
                  {story.course.title}
                </Link>
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </article>
  )
}
