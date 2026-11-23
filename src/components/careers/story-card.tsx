import { QuoteIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type * as React from 'react'

import { zh } from '@/i18n/zh'
import { coursePath } from '@/lib/course/paths'
import type { HomeStory } from '@/lib/home/types'
import { cn } from '@/lib/utils'

const t = zh.careers.stories

/**
 * 岗位与公司之间的分隔：“·”前的空格换成不换行空格，换行时“·”留在岗位后面、不会出现在行首。
 * 配合 break-keep（中文词内不断行）使用：只在“·”后面换行，公司名不会被拆成两行。
 */
const ROLE_SEPARATOR = t.roleSeparator.replace(/^ /, '\u00a0')

/** 现任岗位 · 公司（任一为空时只显示另一个；都为空时为 null；分隔见 ROLE_SEPARATOR） */
export function storyRoleLine(story: Pick<HomeStory, 'currentRole' | 'companyName'>) {
  const parts = [story.currentRole, story.companyName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(ROLE_SEPARATOR) : null
}

export type StoryCardProps = {
  story: HomeStory
  /** 卡片标题（化名）的层级：区块标题是 h2 时用 h3（默认） */
  headingLevel?: 'h3' | 'h4'
  /** 卡片底部追加的内容（如就业服务页“阅读完整故事”的展开区域），放在事实标签之后 */
  children?: React.ReactNode
  className?: string
}

/**
 * 学员故事卡片（服务端组件；首页“学员故事”与就业服务页共用）：头像、化名、现任岗位 · 公司（纯文字，不链接合作企业）、
 * 引言、学习前背景、所学课程（可公开访问时链接到课程）。不展示任何薪资；卡片本身不是链接。
 * 区块末尾必须注明化名（zh.careers.stories.pseudonymNote），由使用方输出。
 */
export function StoryCard({
  story,
  headingLevel: Heading = 'h3',
  children,
  className,
}: StoryCardProps) {
  const role = storyRoleLine(story)
  const hasFacts = Boolean(story.background || story.course)

  return (
    <article
      className={cn(
        'flex w-full flex-col gap-5 rounded-md border border-border bg-card p-5 text-card-foreground md:p-6',
        className,
      )}
    >
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
          <Heading className="text-h4 text-foreground">{story.displayName}</Heading>
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
      {children}
    </article>
  )
}
