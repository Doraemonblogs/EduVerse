import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import type { CampusCardData } from '@/lib/campuses/types'
import { formatMessage } from '@/lib/course/format'
import { COURSES_PATH } from '@/lib/course/paths'
import { cn } from '@/lib/utils'

import { CampusCard } from './campus-card'
import { countCampusCities } from './campus-layout'

const t = zh.campuses.list

/** 封面宽度：移动端 1 列、sm 2 列、≥ lg 3 列（版心 1280px） */
export const CAMPUS_LIST_COVER_SIZES =
  '(min-width: 1360px) 410px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 100vw'

/** 首屏预加载的封面数：只给第一张（各视口下都在首屏，通常是最大内容绘制） */
const PRELOAD_COVERS = 1

type CampusListProps = {
  campuses: readonly CampusCardData[]
  className?: string
}

/**
 * 校区列表（服务端组件）：概要（校区数、城市数）+ 校区卡片网格（后台排序；1 / 2 / 3 列）。
 * 卡片是与首页共用的 CampusCard：封面（左上角城市标签）、校区名（h2，页面没有区块标题）、地址、
 * 电话（tel: 链接）、开放时间、“查看校区”与“在高德地图中打开”。没有校区时显示空状态。
 */
export function CampusList({ campuses, className }: CampusListProps) {
  if (campuses.length === 0) return <CampusListEmpty className={className} />

  return (
    <div className={cn('flex flex-col gap-6 md:gap-8', className)}>
      <p className="text-sm text-muted-foreground md:text-base">
        {formatMessage(t.summary, {
          count: campuses.length,
          cities: countCampusCities(campuses),
        })}
      </p>
      <ul role="list" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {campuses.map((campus, index) => (
          <li key={campus.id} className="flex">
            <CampusCard
              campus={campus}
              headingLevel="h2"
              imageSizes={CAMPUS_LIST_COVER_SIZES}
              preload={index < PRELOAD_COVERS}
              showCity
              namedMapLink
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 还没有任何已发布校区时的空状态：说明 + 专业课程（线上课程不受校区限制） */
function CampusListEmpty({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="campus-list-empty-title"
      className={cn(
        'flex flex-col items-start gap-4 rounded-md bg-muted px-5 py-8 md:px-10 md:py-12',
        className,
      )}
    >
      <h2 id="campus-list-empty-title" className="text-h3 text-foreground">
        {t.emptyTitle}
      </h2>
      <p className="max-w-2xl text-base text-muted-foreground">{t.emptyDescription}</p>
      <Button asChild variant="outline" className="mt-2">
        <Link href={COURSES_PATH} prefetch={false}>
          {t.viewCourses}
        </Link>
      </Button>
    </section>
  )
}
