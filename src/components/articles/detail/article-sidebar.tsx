import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

import { LeadForm } from '@/components/lead/lead-form'
import type { LeadFormConfig } from '@/components/lead/types'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import type { ArticlePagesSettings } from '@/lib/articles/types'
import { COURSES_PATH } from '@/lib/course/paths'
import type { CourseCardData } from '@/lib/course/types'
import { cn } from '@/lib/utils'

import { HotCourseList } from './hot-course-list'

const t = zh.articles.detail

/** 留资位置标识（M6 规格 §6） */
export const ARTICLE_SIDEBAR_POSITION = 'article_sidebar'

export const ARTICLE_HOT_COURSES_TITLE_ID = 'article-hot-courses-title'
export const ARTICLE_LEAD_TITLE_ID = 'article-lead-title'

/**
 * 桌面端吸顶：头部 64px 下方留 16px。视口高度不够放下整张卡片时（表单出现校验提示、矮屏），
 * 卡片自身限高、内部滚动，提交按钮始终够得着；视口很矮（< 720px）时不吸顶，随页面滚动。
 * （与课程详情侧栏一致）
 */
const STICKY =
  '[@media(min-height:45rem)]:lg:sticky [@media(min-height:45rem)]:lg:top-20 [@media(min-height:45rem)]:lg:max-h-[calc(100dvh-6rem)] [@media(min-height:45rem)]:lg:overflow-y-auto'

type ArticleSidebarProps = {
  /** 侧栏热门课程（精选课程最多 3 门）；为空时不显示该区块 */
  hotCourses: CourseCardData[]
  /** 后台「资讯页面设置 → 资讯详情」的留资卡片标题与说明 */
  settings: ArticlePagesSettings['detail']
  leadConfig: LeadFormConfig
  className?: string
}

/**
 * 资讯详情侧栏（服务端组件）：热门课程 + 留资卡片（侧栏形态表单，position article_sidebar）。
 * 桌面端在右栏：侧栏本身与正文栏等高，热门课程随页面滚走，留资卡片吸顶；
 * 移动端随网格排在正文之后（同一个 DOM 实例，页面上只有这一份表单）。
 */
export function ArticleSidebar({
  hotCourses,
  settings,
  leadConfig,
  className,
}: ArticleSidebarProps) {
  return (
    <aside aria-label={t.sidebarLabel} className={cn('flex flex-col gap-8', className)}>
      {hotCourses.length > 0 ? (
        <section aria-labelledby={ARTICLE_HOT_COURSES_TITLE_ID} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 border-b border-foreground pb-3">
            <h2 id={ARTICLE_HOT_COURSES_TITLE_ID} className="text-h4 text-foreground">
              {t.hotCourses}
            </h2>
            <Button asChild variant="link" className="min-h-11 text-sm">
              <Link href={COURSES_PATH} prefetch={false}>
                {t.allCourses}
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
          </div>
          <HotCourseList courses={hotCourses} />
        </section>
      ) : null}

      <section
        aria-labelledby={ARTICLE_LEAD_TITLE_ID}
        className={cn(
          'surface-paper flex flex-col gap-4 rounded-md border border-border p-5 md:p-6',
          STICKY,
        )}
      >
        <div className="flex flex-col gap-2">
          <h2 id={ARTICLE_LEAD_TITLE_ID} className="text-h3 text-foreground">
            {settings.sidebarTitle}
          </h2>
          {settings.sidebarDescription ? (
            <p className="text-sm text-muted-foreground">{settings.sidebarDescription}</p>
          ) : null}
        </div>
        <LeadForm
          config={leadConfig}
          variant="sidebar"
          position={ARTICLE_SIDEBAR_POSITION}
          intent="trial"
          className="gap-3"
        />
      </section>
    </aside>
  )
}
