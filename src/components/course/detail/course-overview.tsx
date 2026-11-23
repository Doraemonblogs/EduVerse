import { zh } from '@/i18n/zh'
import type { CourseDetail } from '@/lib/course/types'

import { DetailSection } from './detail-section'

const t = zh.course.detail.sections

type CourseOverviewProps = Pick<CourseDetail, 'highlights' | 'audience'>

/**
 * 课程亮点与适合人群（页内导航“亮点与适合人群”的锚点）。
 * 有亮点时：标题“课程亮点” + 编号列表，适合人群作为右侧（窄屏在下方）的米色卡片；
 * 只有适合人群时，区块标题就是“适合人群”。两者都没有时页面不渲染本区块。
 */
export function CourseOverview({ highlights, audience }: CourseOverviewProps) {
  if (highlights.length === 0) {
    return (
      <DetailSection id="overview" title={t.audience}>
        <AudienceList items={audience} />
      </DetailSection>
    )
  }

  return (
    <DetailSection id="overview" title={t.highlights}>
      <div className="grid gap-8 @2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @2xl:gap-10">
        <ol role="list" className="self-start divide-y divide-border border-y border-border">
          {highlights.map((text, index) => (
            <li key={`${index}-${text}`} className="flex gap-4 py-4">
              <span className="numeric w-6 shrink-0 font-semibold text-emphasis">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 text-foreground">{text}</span>
            </li>
          ))}
        </ol>
        {audience.length > 0 ? (
          <div className="surface-paper flex flex-col gap-4 self-start rounded-md p-5 md:p-6">
            <h3 className="text-h4 text-foreground">{t.audience}</h3>
            <AudienceList items={audience} />
          </div>
        ) : null}
      </div>
    </DetailSection>
  )
}

function AudienceList({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-foreground marker:text-muted-foreground">
      {items.map((text, index) => (
        <li key={`${index}-${text}`}>{text}</li>
      ))}
    </ul>
  )
}
