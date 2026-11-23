import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { LeadForm } from '@/components/lead/lead-form'
import type { LeadFormConfig } from '@/components/lead/types'
import { cn } from '@/lib/utils'

export const TEACHER_CTA_ID = 'teacher-cta'

type TeacherCtaProps = {
  /** 标题与说明来自后台「师资页面设置 · 讲师详情页」 */
  title: string
  description: string | null
  /** 预选的意向专业（讲师的第一个专业方向）；讲师没有专业方向时不预选 */
  disciplineId?: number
  config: LeadFormConfig
  /** 上一个区块也是深色（如学员作品）时加一条分隔线 */
  separated?: boolean
}

/**
 * 讲师详情页结尾的行动号召（深色区块）：标题与说明 + 页内留资表单（position=teacher_cta，带专业方向）。
 * 页面以表单收尾，页脚的行动号召横幅隐藏（data-page-end-cta，见 globals.css）。
 * 版式与专业方向页、通用页面的行动号召区块一致。
 */
export function TeacherCta({
  title,
  description,
  disciplineId,
  config,
  separated,
}: TeacherCtaProps) {
  const titleId = `${TEACHER_CTA_ID}-title`

  return (
    // 下方紧接页脚（同为深色），用描边分隔
    <Section
      id={TEACHER_CTA_ID}
      tone="dark"
      aria-labelledby={titleId}
      className={cn('border-b border-border', separated && 'border-t')}
      data-page-end-cta=""
    >
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2 id={titleId} className="text-h2 text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-base text-muted-foreground md:text-lg">{description}</p>
          ) : null}
        </div>
        <div className="rounded-md border border-border bg-card p-5 text-card-foreground md:p-8">
          <LeadForm
            config={config}
            variant="inline"
            position="teacher_cta"
            intent="trial"
            disciplineId={disciplineId}
          />
        </div>
      </Container>
    </Section>
  )
}
