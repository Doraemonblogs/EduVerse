import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { LeadForm } from '@/components/lead/lead-form'
import type { LeadFormConfig } from '@/components/lead/types'

export const CAMPUS_CTA_ID = 'campus-cta'

/** 留资位置标识：校区详情页结尾的页内表单 */
export const CAMPUS_CTA_POSITION = 'campus_cta'

type CampusCtaProps = {
  /** 标题与说明来自后台「校区页面设置 · 校区详情页」 */
  title: string
  description: string | null
  config: LeadFormConfig
}

/**
 * 校区详情页结尾的行动号召（深色区块）：标题与说明 + 页内留资表单（position=campus_cta，intent=consult）。
 * 页面以表单收尾，页脚的行动号召横幅隐藏（data-page-end-cta，见 globals.css）。
 * 版式与讲师详情页、专业方向页的行动号召区块一致。上一个区块一定是浅色（见 assignCampusSectionTones）。
 */
export function CampusCta({ title, description, config }: CampusCtaProps) {
  const titleId = `${CAMPUS_CTA_ID}-title`

  return (
    // 下方紧接页脚（同为深色），用描边分隔
    <Section
      id={CAMPUS_CTA_ID}
      tone="dark"
      aria-labelledby={titleId}
      className="border-b border-border"
      data-page-end-cta=""
    >
      {/* 表单贴着版心右缘：lg:avoid-floating-actions 给桌面端悬浮操作栏让出位置（全页统一，右缘对齐） */}
      <Container className="grid gap-8 lg:avoid-floating-actions lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
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
            position={CAMPUS_CTA_POSITION}
            intent="consult"
          />
        </div>
      </Container>
    </Section>
  )
}
