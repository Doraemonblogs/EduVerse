import { ArrowRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useId } from 'react'

import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { HOME_SECTION_IDS } from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeSectionFrameProps } from '@/components/home/rhythm'
import { HomeMoreLinkMobile, HomeSectionHeader } from '@/components/home/section-header'
import type { HotDisciplinesProps } from '@/components/home/types'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { COURSES_PATH, majorPath } from '@/lib/course/paths'
import type { HomeDiscipline } from '@/lib/home/types'
import { cn } from '@/lib/utils'

const t = zh.home.top.hotDisciplines

/** 封面宽度：移动端 2 列、≥ md 4 列（版心 1280px） */
const COVER_SIZES = '(min-width: 1360px) 300px, (min-width: 768px) 23vw, 46vw'

/**
 * 专业方向卡片：整张卡片是一个链接（→ /majors/{slug}），封面、名称（h3）、一句话卖点、课程数。
 * 链接的无障碍名称只取名称（aria-labelledby），卖点与课程数作为描述，读屏不会把封面替代文字连读进去。
 */
function DisciplineCard({ discipline }: { discipline: HomeDiscipline }) {
  const id = useId()
  const titleId = `${id}-title`
  const taglineId = `${id}-tagline`
  const countId = `${id}-count`
  const describedBy = [discipline.tagline && taglineId, discipline.courseCount > 0 && countId]
    .filter(Boolean)
    .join(' ')

  return (
    <Link
      href={majorPath(discipline.slug)}
      prefetch={false}
      aria-labelledby={titleId}
      aria-describedby={describedBy || undefined}
      className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground transition-colors duration-150 ease-standard hover:border-foreground"
    >
      <div className="aspect-video overflow-hidden bg-muted">
        {discipline.cover ? (
          <Image
            src={discipline.cover.src}
            alt={discipline.cover.alt}
            width={discipline.cover.width}
            height={discipline.cover.height}
            sizes={COVER_SIZES}
            className="size-full object-cover transition-transform duration-500 ease-standard group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4 lg:p-5">
        <h3
          id={titleId}
          className="text-base leading-snug font-semibold text-foreground md:text-lg"
        >
          {discipline.name}
        </h3>
        {discipline.tagline ? (
          <p id={taglineId} className="line-clamp-2 text-sm text-muted-foreground">
            {discipline.tagline}
          </p>
        ) : null}
        <p className="mt-auto flex items-center justify-between gap-2 pt-2 text-sm">
          {discipline.courseCount > 0 ? (
            <span id={countId} className="numeric text-muted-foreground">
              {formatMessage(t.courseCount, { count: discipline.courseCount })}
            </span>
          ) : (
            <span />
          )}
          <ArrowRightIcon
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground transition-[color,translate] duration-150 ease-standard group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </p>
      </div>
    </Link>
  )
}

/**
 * 区块 3：热门专业（服务端组件，米色区块）。专业方向卡片：移动端 2 列宫格、≥ md 4 列；
 * “查看全部课程 →”在桌面端位于标题右侧，移动端位于区块末尾。
 */
export function HotDisciplines({
  section,
  tone = 'paper',
  className,
}: HotDisciplinesProps & HomeSectionFrameProps) {
  const { heading, items } = section
  const more = { href: COURSES_PATH, label: t.allCourses }
  return (
    <Section tone={tone} aria-labelledby={HOME_SECTION_IDS.hotDisciplines} className={className}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', HOME_CONTAINER_CLASS)}>
        <HomeSectionHeader id={HOME_SECTION_IDS.hotDisciplines} heading={heading} more={more} />
        <ul role="list" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:gap-6">
          {items.map((discipline) => (
            <li key={discipline.id} className="flex flex-col">
              <DisciplineCard discipline={discipline} />
            </li>
          ))}
        </ul>
        <HomeMoreLinkMobile {...more} />
      </Container>
    </Section>
  )
}
