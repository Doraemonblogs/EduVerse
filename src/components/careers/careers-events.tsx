import { ArrowDownIcon, CalendarDaysIcon, CalendarX2Icon } from 'lucide-react'
import Image from 'next/image'

import { CampusLink } from '@/components/campuses/campus-link'
import { zh } from '@/i18n/zh'
import { formatEventDateTime } from '@/lib/careers/mappers'
import type { CareerEvent } from '@/lib/careers/types'
import { cn } from '@/lib/utils'

import { CAREERS_SECTION_IDS, careerEventAnchor } from './careers-layout'

const e = zh.careers.events
const p = zh.careers.page

/** 活动图片：平板起占卡片左栏（约 2/5，桌面端固定 320px），手机通栏（2:1） */
const EVENT_IMAGE_SIZES = '(min-width: 1024px) 320px, (min-width: 768px) 40vw, 100vw'

type CareersEventsProps = {
  /** 已按当前时间过滤、按时间升序的近期活动（upcomingCareerEvents） */
  events: CareerEvent[]
  className?: string
}

/**
 * 近期招聘活动（服务端组件）：按时间先后排列的活动卡片——活动图片（可选）、时间（北京时间）、名称（h3）、
 * 地点、举办校区（链接到校区详情）、说明与报名方式。没有近期活动时显示空状态，引导到页尾的预约表单。
 */
export function CareersEvents({ events, className }: CareersEventsProps) {
  if (events.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-start gap-4 rounded-md border border-dashed border-border p-6 md:flex-row md:items-center md:justify-between md:p-8',
          className,
        )}
      >
        <p className="flex items-start gap-3 text-base text-muted-foreground">
          <CalendarX2Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
          {e.empty}
        </p>
        <a
          href={`#${CAREERS_SECTION_IDS.cta}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          {p.emptyAction}
          <ArrowDownIcon aria-hidden className="size-4" />
        </a>
      </div>
    )
  }

  return (
    <ol role="list" className={cn('flex flex-col gap-5 lg:gap-6', className)}>
      {events.map((event) => (
        <li key={event.id}>
          <CareerEventCard event={event} />
        </li>
      ))}
    </ol>
  )
}

function CareerEventCard({ event }: { event: CareerEvent }) {
  const anchor = careerEventAnchor(event.id)
  const titleId = `${anchor}-title`
  const time = formatEventDateTime(event.date)

  return (
    <article
      id={anchor}
      aria-labelledby={titleId}
      className={cn(
        'grid overflow-hidden rounded-md border border-border bg-card text-card-foreground',
        event.image &&
          'md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-cols-[20rem_minmax(0,1fr)]',
      )}
    >
      {event.image ? (
        <div className="aspect-[2/1] bg-muted md:aspect-auto md:min-h-full">
          <Image
            src={event.image.src}
            alt={event.image.alt || event.title}
            width={event.image.width}
            height={event.image.height}
            sizes={EVENT_IMAGE_SIZES}
            loading="lazy"
            className="size-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-4 p-5 md:p-6 lg:p-8">
        <div className="flex flex-col gap-2">
          {time ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDaysIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">{e.date}：</span>
              <time dateTime={event.date} className="numeric">
                {time}
              </time>
            </p>
          ) : null}
          <h3 id={titleId} className="text-h4 text-foreground">
            {event.title}
          </h3>
        </div>

        {event.location || event.campus ? (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
            {event.location ? (
              <>
                <dt className="text-muted-foreground">{e.location}</dt>
                <dd className="text-foreground">{event.location}</dd>
              </>
            ) : null}
            {event.campus ? (
              <>
                <dt className="text-muted-foreground">{e.campus}</dt>
                <dd className="flex flex-col gap-0.5">
                  <span>
                    <CampusLink
                      campus={event.campus}
                      className="relative inline-block before:absolute before:inset-x-0 before:-inset-y-2.5"
                    >
                      {event.campus.name}
                    </CampusLink>
                  </span>
                  <span className="text-muted-foreground">{event.campus.address}</span>
                </dd>
              </>
            ) : null}
          </dl>
        ) : null}

        {event.description ? (
          <p className="max-w-3xl text-base text-muted-foreground">{event.description}</p>
        ) : null}

        {event.registrationNote ? (
          <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4 text-sm">
            <p className="font-semibold text-foreground">{e.registration}</p>
            <p className="text-muted-foreground">{event.registrationNote}</p>
          </div>
        ) : null}
      </div>
    </article>
  )
}
