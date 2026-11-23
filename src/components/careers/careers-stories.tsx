import { ChevronDownIcon, InfoIcon } from 'lucide-react'

import { HorizontalScroller } from '@/components/common/horizontal-scroller'
import { RichText } from '@/components/common/rich-text'
import { shiftRichTextHeadings } from '@/components/course/major/rich-text-headings'
import { zh } from '@/i18n/zh'
import type { CareerStory } from '@/lib/careers/types'
import { formatMessage } from '@/lib/course/format'
import { isRichTextFilled } from '@/lib/rich-text-filled'
import { cn } from '@/lib/utils'

import { StoryCard } from './story-card'

const t = zh.careers.stories
const p = zh.careers.page

/** 故事正文的图片：卡片内容宽度（桌面端三列约 360px，平板每屏 2.15 张，手机每屏 1.15 张） */
const STORY_IMAGE_SIZES =
  '(min-width: 1360px) 360px, (min-width: 1024px) 28vw, (min-width: 640px) 42vw, 80vw'

type CareersStoriesProps = {
  /** 列表的无障碍名称（区块标题） */
  label: string
  stories: CareerStory[]
  className?: string
}

/**
 * 学员故事（服务端组件，无需 JS）：卡片与首页共用 StoryCard（化名、岗位 · 公司、引言、学习前背景、所学课程；
 * 不展示任何薪资）。手机 / 平板横滑（露出下一张，带进度条与上一组 / 下一组按钮），桌面端（≥ lg）三列网格一次展示完。
 * 有正文的故事在卡片底部用原生 <details> 展开阅读（键盘可用，静态预览站同样可用）。
 * 默认卡片等高；有故事展开时整组改为按内容高度排列，其它卡片不会被撑出大片空白。
 * 末尾注明“学员姓名为化名”。
 */
export function CareersStories({ label, stories, className }: CareersStoriesProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <HorizontalScroller
        label={label}
        desktop="grid"
        columns={3}
        controls
        itemClassName="flex"
        listClassName="has-[details[open]]:items-start"
      >
        {stories.map((story) => (
          <StoryCard key={story.id} story={story}>
            <StoryBody story={story} />
          </StoryCard>
        ))}
      </HorizontalScroller>
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t.pseudonymNote}
      </p>
    </div>
  )
}

/**
 * 故事正文的展开区域：摘要行“阅读完整故事 / 收起”（读屏名称带化名），展开后是富文本正文
 * （标题整体降到 h4 起，接在卡片标题 h3 之下）。正文为空时不渲染。
 */
function StoryBody({ story }: { story: CareerStory }) {
  if (!isRichTextFilled(story.story)) return null
  const suffix = formatMessage(p.storyToggleSuffix, { name: story.displayName })

  return (
    <details className="group/story -mt-1">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm font-semibold text-foreground underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
        <span className="group-open/story:hidden">{t.readStory}</span>
        <span className="hidden group-open/story:inline">{t.collapse}</span>
        <span className="sr-only">{suffix}</span>
        <ChevronDownIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open/story:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <RichText
        data={shiftRichTextHeadings(story.story, 4)}
        imageSizes={STORY_IMAGE_SIZES}
        className="pt-2 pb-1"
      />
    </details>
  )
}
