import Image from 'next/image'

import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { LeadCTA } from '@/components/lead/lead-cta'
import { zh } from '@/i18n/zh'
import {
  classTypeLabel,
  courseCities,
  deliveryModeLabel,
  formatMessage,
  LIST_SEPARATOR,
  noCampusLabel,
} from '@/lib/course/format'
import { COURSES_PATH, majorPath } from '@/lib/course/paths'
import type { DisciplineDetail } from '@/lib/course/types'
import { cn } from '@/lib/utils'

import { summarizeMajor } from './major-layout'

const t = zh.course

/** 首屏大图：桌面端占半栏（版心 1280px），移动端通栏 */
const HERO_SIZES = '(min-width: 1360px) 620px, (min-width: 1024px) 46vw, 100vw'

export const MAJOR_TITLE_ID = 'major-title'

type MajorHeroProps = {
  discipline: DisciplineDetail
  /** 面包屑第二级（课程列表页）的名称，与列表页标题一致 */
  coursesLabel: string
}

/**
 * 概况的一项：多个取值逐个不断行，只在取值之间的“/”后换行
 * （中文默认可在任意字间断行；“/”前是不换行空格，不会出现在行首）
 */
type Fact = { label: string; values: string[]; numeric?: boolean; className?: string }

/**
 * 专业方向首屏（深色区块）：面包屑、专业名（h1）、一句话定位、两个转化按钮
 * （预约试听 / 领取学习资料，position=major_hero），右侧封面大图（唯一的高优先级图片），
 * 下方是由该方向课程汇总的概况（开设课程数、班型、授课方式、开课城市）。
 */
export function MajorHero({ discipline, coursesLabel }: MajorHeroProps) {
  const image = discipline.heroImage
  const facts = majorFacts(discipline)

  return (
    <Section tone="dark" spacing="sm" aria-labelledby={MAJOR_TITLE_ID}>
      <Container className="flex flex-col gap-8 md:gap-10">
        <Breadcrumbs
          items={[
            { label: coursesLabel, href: COURSES_PATH },
            { label: discipline.name, href: majorPath(discipline.slug) },
          ]}
        />

        <div
          className={cn(
            'grid gap-8',
            image && 'lg:grid-cols-2 lg:items-center lg:gap-12 xl:gap-16',
          )}
        >
          <div className="flex min-w-0 flex-col gap-5">
            <p className="eyebrow flex items-center gap-3 text-muted-foreground">
              <span aria-hidden className="h-px w-6 bg-current" />
              {t.major.eyebrow}
            </p>
            <h1 id={MAJOR_TITLE_ID} className="text-h1 text-foreground">
              {discipline.name}
            </h1>
            {discipline.tagline ? (
              <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
                {discipline.tagline}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 pt-2 sm:flex sm:flex-wrap">
              <LeadCTA position="major_hero" intent="trial" disciplineId={discipline.id} size="lg">
                {t.major.trial}
              </LeadCTA>
              <LeadCTA
                position="major_hero"
                intent="materials"
                disciplineId={discipline.id}
                title={t.major.materialsDialogTitle}
                description={formatMessage(t.major.materialsDialogDescription, {
                  name: discipline.name,
                })}
                submitLabel={t.major.materialsSubmit}
                variant="outline"
                size="lg"
              >
                {t.major.materials}
              </LeadCTA>
            </div>
          </div>

          {image ? (
            <div className="aspect-video overflow-hidden rounded-md bg-muted">
              <Image
                src={image.src}
                alt={image.alt || discipline.name}
                width={image.width}
                height={image.height}
                sizes={HERO_SIZES}
                preload
                className="size-full object-cover"
              />
            </div>
          ) : null}
        </div>

        {facts.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-6 sm:gap-x-8 lg:grid-cols-4">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className={cn(
                  'flex min-w-0 flex-col gap-1 border-t border-border py-4',
                  fact.className,
                )}
              >
                <dt className="text-sm text-muted-foreground">{fact.label}</dt>
                <dd className={cn('font-semibold text-foreground', fact.numeric && 'numeric')}>
                  {fact.values.map((value, index) => (
                    <span key={value}>
                      <span className="whitespace-nowrap">{value}</span>
                      {index < fact.values.length - 1 ? LIST_SEPARATOR : null}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Container>
    </Section>
  )
}

/**
 * 首屏概况：开设课程数、班型、授课方式、开课城市
 * （没有已发布校区时：全部课程纯线上显示“线上”，否则显示“待定”）。
 * 该方向还没有课程时不显示。授课方式与城市取值较长，手机上各占一整行。
 */
function majorFacts(discipline: DisciplineDetail): Fact[] {
  const summary = summarizeMajor(discipline.courses)
  if (summary.courseCount === 0) return []

  const cities = courseCities(summary.campuses)
  const facts: Fact[] = [
    {
      label: t.major.courseCountLabel,
      values: [formatMessage(t.major.courseCount, { count: summary.courseCount })],
      numeric: true,
    },
    { label: t.meta.classType, values: summary.classTypes.map(classTypeLabel) },
  ]
  if (summary.deliveryModes.length > 0) {
    facts.push({
      label: t.meta.mode,
      values: summary.deliveryModes.map(deliveryModeLabel),
      className: 'col-span-2 sm:col-span-1',
    })
  }
  facts.push({
    label: t.meta.city,
    values: cities.length > 0 ? cities : [noCampusLabel(summary.deliveryModes)],
    className: 'col-span-2 sm:col-span-1',
  })
  return facts
}
