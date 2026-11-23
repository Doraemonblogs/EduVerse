import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { SectionHeading } from '@/components/common/section-heading'
import { LeadCTA } from '@/components/lead/lead-cta'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WorkMasonry } from '@/components/works/work-masonry'
import { zh } from '@/i18n/zh'
import { formatCohortDate, toBeijingIsoDate } from '@/lib/course/format'
import { coursePath, majorPath } from '@/lib/course/paths'
import { cn } from '@/lib/utils'
import { workByline } from '@/lib/works/format'
import { WORKS_PATH, workPath } from '@/lib/works/paths'
import type { WorkDetail, WorkPagesSettings } from '@/lib/works/types'

import { WorkMedia } from './work-media'

const t = zh.works.detail

/** 留资位置标识：作品详情页的“预约试听” */
export const WORK_DETAIL_POSITION = 'work_detail'

export const WORK_TITLE_ID = 'work-title'
const DESCRIPTION_TITLE_ID = 'work-description-title'
const CTA_TITLE_ID = 'work-cta-title'
const RELATED_TITLE_ID = 'related-works-title'

/**
 * 桌面端主媒体吸顶（头部 64px 下方留 16px）：信息栏较长时，读到下方的信息与行动号召仍能看到作品。
 * 主图最大高度 72vh，加上缩略图在高度 ≥ 720px 的视口里放得下；更矮的视口不吸顶，随页面滚动。
 */
const STICKY = '[@media(min-height:45rem)]:lg:sticky [@media(min-height:45rem)]:lg:top-20'

/** 信息栏里的链接：下划线常驻（不只靠颜色区分），扩大上下点击区域到 44px 而不改变行高 */
const FACT_LINK =
  '-my-3 inline-block py-3 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-current'

export type WorkDetailViewProps = {
  work: WorkDetail
  settings: WorkPagesSettings
}

/**
 * 作品详情页主体（服务端组件，不取数据）：
 * 深色首屏（面包屑 → 作品名与署名 → 主媒体与图集 → 作品信息与行动号召）→ 相关作品（浅色）。
 * 桌面端两栏：左侧主媒体（作品是主角），右侧信息栏；移动端依次为作品名、主媒体、信息与行动号召。
 * DOM 顺序为 作品名 → 主媒体 → 信息栏，桌面端用网格把作品名放到右栏顶部，键盘焦点顺序与视觉一致（先左后右）。
 */
export function WorkDetailView({ work, settings }: WorkDetailViewProps) {
  return (
    <>
      <Section tone="dark" spacing="sm" aria-labelledby={WORK_TITLE_ID}>
        {/* 右侧信息栏贴着版心右缘：lg:avoid-floating-actions 给桌面端悬浮操作栏让出位置 */}
        <Container className="flex flex-col gap-6 md:gap-8 lg:avoid-floating-actions">
          <Breadcrumbs
            items={[
              { label: settings.list.title, href: WORKS_PATH },
              { label: work.title, href: workPath(work.id) },
            ]}
          />
          <div className="grid gap-y-6 md:gap-y-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-8 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-x-16">
            <WorkHeader work={work} className="lg:col-start-2 lg:row-start-1" />
            <WorkMedia
              work={work}
              className={cn('lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start', STICKY)}
            />
            <WorkInfo work={work} settings={settings} className="lg:col-start-2 lg:row-start-2" />
          </div>
        </Container>
      </Section>

      {work.related.length > 0 ? (
        <Section tone="light" aria-labelledby={RELATED_TITLE_ID}>
          <Container className="flex flex-col gap-8 md:gap-10">
            <SectionHeading
              id={RELATED_TITLE_ID}
              title={t.related}
              actions={
                <Button asChild variant="link" className="min-h-11 text-sm md:text-base">
                  <Link href={WORKS_PATH} prefetch={false}>
                    {t.allWorks}
                    <ArrowRightIcon aria-hidden />
                  </Link>
                </Button>
              }
            />
            <WorkMasonry works={work.related} />
          </Container>
        </Section>
      ) : null}
    </>
  )
}

/** 作品名（h1）、精选标记与署名（学员化名 · 届别，附化名说明） */
function WorkHeader({ work, className }: { work: WorkDetail; className?: string }) {
  const byline = workByline(work)
  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      {work.featured ? <Badge variant="inverse">{zh.works.featured}</Badge> : null}
      <h1 id={WORK_TITLE_ID} className="text-h2 text-foreground">
        {work.title}
      </h1>
      {byline ? (
        <p className="flex flex-col gap-1">
          <span className="text-base font-medium text-foreground md:text-lg">{byline}</span>
          <span className="text-xs text-muted-foreground">{zh.works.pseudonymNote}</span>
        </p>
      ) : null}
    </div>
  )
}

type Fact = { label: string; value: React.ReactNode }

/** 作品说明、作品信息（专业方向 / 所属课程 / 所用软件 / 发布时间）与行动号召 */
function WorkInfo({
  work,
  settings,
  className,
}: WorkDetailViewProps & {
  className?: string
}) {
  const facts = workFacts(work)
  return (
    // 平板（md）横向空间富余：说明与信息在左、行动号召在右；桌面端回到右栏里的单列
    <div
      className={cn(
        'flex min-w-0 flex-col gap-8 md:grid md:grid-cols-[minmax(0,1fr)_18rem] md:items-start md:gap-x-10 lg:flex lg:items-stretch',
        className,
      )}
    >
      {work.description ? (
        <section
          aria-labelledby={DESCRIPTION_TITLE_ID}
          className="flex flex-col gap-2 md:col-start-1"
        >
          <h2 id={DESCRIPTION_TITLE_ID} className="text-h4 text-foreground">
            {t.descriptionTitle}
          </h2>
          <p className="whitespace-pre-line text-muted-foreground">{work.description}</p>
        </section>
      ) : null}

      {facts.length > 0 ? (
        <dl className="flex flex-col border-t border-border text-sm md:col-start-1">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="grid grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-4 border-b border-border py-3"
            >
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="min-w-0 text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <section
        aria-labelledby={CTA_TITLE_ID}
        className="flex flex-col gap-4 rounded-md border border-border bg-card p-5 text-card-foreground md:col-start-2 md:row-span-2 md:row-start-1 md:p-6"
      >
        <div className="flex flex-col gap-2">
          <h2 id={CTA_TITLE_ID} className="text-h3 text-foreground">
            {settings.detail.ctaTitle}
          </h2>
          {settings.detail.ctaDescription ? (
            <p className="text-sm text-muted-foreground">{settings.detail.ctaDescription}</p>
          ) : null}
        </div>
        <LeadCTA
          position={WORK_DETAIL_POSITION}
          intent="trial"
          courseId={work.course?.id}
          disciplineId={work.discipline?.id}
          size="lg"
          block
        >
          {t.trial}
        </LeadCTA>
      </section>
    </div>
  )
}

/** 信息栏各项：没有数据的项不显示；专业方向、课程可访问时链接到对应页面 */
function workFacts(work: WorkDetail): Fact[] {
  const facts: Fact[] = []
  if (work.discipline) {
    facts.push({
      label: t.facts.discipline,
      value: (
        <Link href={majorPath(work.discipline.slug)} prefetch={false} className={FACT_LINK}>
          {work.discipline.name}
        </Link>
      ),
    })
  }
  if (work.course) {
    facts.push({
      label: t.facts.course,
      value: (
        <Link href={coursePath(work.course.slug)} prefetch={false} className={FACT_LINK}>
          {work.course.title}
        </Link>
      ),
    })
  }
  if (work.software.length > 0) {
    facts.push({
      label: t.facts.software,
      value: (
        <ul role="list" className="flex flex-wrap gap-1.5">
          {work.software.map((item) => (
            <li key={item.slug}>
              <Badge variant="outline" className="text-foreground">
                {item.name}
              </Badge>
            </li>
          ))}
        </ul>
      ),
    })
  }
  const date = formatCohortDate(work.publishedAt)
  if (date) {
    facts.push({
      label: t.facts.publishedAt,
      value: (
        <time dateTime={toBeijingIsoDate(work.publishedAt)} className="numeric">
          {date}
        </time>
      ),
    })
  }
  return facts
}
