import { ChevronDownIcon } from 'lucide-react'

import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import type { CourseStage } from '@/lib/course/types'
import { cn } from '@/lib/utils'

const t = zh.course.syllabus

export type SyllabusListProps = {
  stages: CourseStage[]
  className?: string
}

/**
 * 分阶段课程大纲（服务端组件，无需 JS）：每个阶段一个原生 <details>，第一阶段默认展开。
 * 摘要行：“第 N 阶段” + 阶段名 + 时长；展开后是阶段目标与知识点。可用键盘展开收起。空数组不渲染。
 */
export function SyllabusList({ stages, className }: SyllabusListProps) {
  if (stages.length === 0) return null
  return (
    <ol role="list" className={cn('flex flex-col gap-3', className)}>
      {stages.map((stage, index) => (
        <li key={`${index}-${stage.title}`}>
          <details
            open={index === 0}
            className="group rounded-md border border-border bg-card text-card-foreground"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-start gap-4 p-5 md:px-6 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-baseline md:gap-4">
                <span className="numeric shrink-0 text-sm font-semibold text-emphasis md:w-20">
                  {formatMessage(t.stage, { index: index + 1 })}
                </span>
                <span className="text-lg font-semibold text-foreground">{stage.title}</span>
                {stage.duration ? (
                  <span className="text-sm text-muted-foreground md:ml-auto">{stage.duration}</span>
                ) : null}
              </span>
              <ChevronDownIcon
                aria-hidden
                className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
              />
            </summary>
            <div className="flex flex-col gap-4 border-t border-border px-5 pt-4 pb-5 md:px-6 md:pl-30">
              {stage.goals ? (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-foreground">{t.goals}</p>
                  <p className="text-muted-foreground">{stage.goals}</p>
                </div>
              ) : null}
              {stage.topics.length > 0 ? (
                // 知识点按自身可用宽度（容器查询）分两列：放在详情页主栏等窄栏里也不会把词拆开
                <div className="@container flex flex-col gap-2">
                  <p className="text-sm font-semibold text-foreground">{t.topics}</p>
                  <ul className="grid list-disc gap-x-8 gap-y-1.5 pl-5 text-muted-foreground marker:text-muted-foreground @lg:grid-cols-2">
                    {stage.topics.map((topic, i) => (
                      <li key={`${i}-${topic}`}>{topic}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>
        </li>
      ))}
    </ol>
  )
}
