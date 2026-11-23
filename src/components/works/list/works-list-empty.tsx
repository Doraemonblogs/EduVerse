import Link from 'next/link'

import { LeadCTA } from '@/components/lead/lead-cta'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { cn } from '@/lib/utils'
import { WORKS_PATH } from '@/lib/works/paths'

const t = zh.works.list

/** 空状态留资的位置标识（M4 规格 §9） */
export const WORKS_LIST_EMPTY_POSITION = 'works_list_empty'

export type WorksListEmptyProps = {
  /**
   * 是否选择了筛选条件：
   * - true：筛选无结果——说明 + “预约试听” + “清除筛选”（回到全部作品）；
   * - false：还没有任何可展示的作品——说明 + “预约试听”（没有可清除的条件）。
   */
  filtered: boolean
  className?: string
}

/**
 * 作品列表空状态：说明 + 预约试听（留资弹窗，intent trial，position works_list_empty）
 * + 有筛选条件时“清除筛选”。
 */
export function WorksListEmpty({ filtered, className }: WorksListEmptyProps) {
  return (
    <section
      aria-labelledby="works-list-empty-title"
      className={cn(
        'flex flex-col items-start gap-4 rounded-md bg-muted px-5 py-8 md:px-10 md:py-12',
        className,
      )}
    >
      <h2 id="works-list-empty-title" className="text-h3 text-foreground">
        {filtered ? t.emptyTitle : t.noWorksTitle}
      </h2>
      <p className="max-w-2xl text-base text-muted-foreground">
        {filtered ? t.emptyDescription : t.noWorksDescription}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <LeadCTA position={WORKS_LIST_EMPTY_POSITION} intent="trial">
          {t.emptyTrial}
        </LeadCTA>
        {filtered ? (
          <Button asChild variant="outline">
            <Link href={WORKS_PATH} rel="nofollow" prefetch={false} scroll={false}>
              {zh.filterBar.clear}
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  )
}
