import { zh } from '@/i18n/zh'
import type { SalaryReference } from '@/lib/course/types'
import { cn } from '@/lib/utils'

const t = zh.course.salary

export type SalaryReferenceCardProps = {
  /** pickSalary() 的结果；为 null 时页面不要渲染本组件 */
  salary: SalaryReference
  /** 卡片标题，默认“薪资参考” */
  title?: string
  /** 卡片标题的层级，默认 h3 */
  headingLevel?: 'h2' | 'h3' | 'h4'
  className?: string
}

/**
 * 薪资参考卡片（服务端组件）：薪资区间 + “数据来源：… · 统计时间：…” + 补充说明 + 免责声明。
 * 广告法第十一条要求标明出处与时间；免责声明（来自站点设置）始终显示，不能省略。
 */
export function SalaryReferenceCard({
  salary,
  title = t.title,
  headingLevel: Heading = 'h3',
  className,
}: SalaryReferenceCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-md border border-border bg-card p-5 text-card-foreground md:p-6',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <Heading className="text-sm font-semibold text-muted-foreground">{title}</Heading>
        <p className="numeric text-h3 text-foreground">{salary.range}</p>
      </div>
      {/* 分隔点用不换行空格接在来源末尾：换行时只会留在第一行行尾，不会落到第二行行首 */}
      <p className="flex flex-wrap gap-x-2 text-sm text-muted-foreground">
        <span>
          {t.source}：{salary.source}
          <span aria-hidden>{'\u00a0·'}</span>
        </span>
        <span>
          {t.statDate}：{salary.statDate}
        </span>
      </p>
      {salary.note ? <p className="text-sm text-foreground">{salary.note}</p> : null}
      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        {salary.disclaimer}
      </p>
    </div>
  )
}
