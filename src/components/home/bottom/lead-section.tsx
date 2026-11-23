import { PhoneIcon } from 'lucide-react'

import { Container } from '@/components/common/container'
import { SectionHeading } from '@/components/common/section-heading'
import { Section } from '@/components/common/section'
import {
  HOME_LEAD_INTENTS,
  HOME_LEAD_POSITIONS,
  HOME_SECTION_IDS,
} from '@/components/home/constants'
import { HOME_CONTAINER_CLASS, type HomeDarkSectionFrameProps } from '@/components/home/rhythm'
import type { LeadSectionProps } from '@/components/home/types'
import { LeadForm } from '@/components/lead/lead-form'
import { zh } from '@/i18n/zh'
import { getLeadFormConfig } from '@/lib/data/lead-form'
import { telHref } from '@/lib/home/map'
import { cn } from '@/lib/utils'

/**
 * 区块 11：预约试听（服务端组件）。深色区块：左侧眉标 / 标题 / 说明（后台「首页 · 预约试听」）与咨询热线，
 * 右侧页内留资表单（position=home_form，intent=trial，提交按钮文字来自后台）。
 * 页面以表单收尾，加 data-page-end-cta 隐藏页脚重复的行动号召横幅（见 globals.css）；
 * 下方紧接页脚（同为深色），用描边分隔。版式与专业方向页、讲师详情页的行动号召区块一致。
 */
export async function LeadSection({
  section,
  config,
  className,
}: LeadSectionProps & HomeDarkSectionFrameProps) {
  const formConfig = config ?? (await getLeadFormConfig())
  const { heading, submitLabel } = section
  const hotlineHref = telHref(formConfig.hotline)

  return (
    <Section
      tone="dark"
      aria-labelledby={HOME_SECTION_IDS.leadForm}
      className={cn('border-b border-border', className)}
      data-page-end-cta=""
    >
      <Container
        className={cn(
          'grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16',
          HOME_CONTAINER_CLASS,
        )}
      >
        <div className="flex flex-col gap-8">
          <SectionHeading
            as="h2"
            id={HOME_SECTION_IDS.leadForm}
            eyebrow={heading.eyebrow ?? undefined}
            title={heading.title}
            description={heading.description ?? undefined}
          />
          {formConfig.hotline && hotlineHref ? (
            <p className="flex flex-col gap-1 border-t border-border pt-6">
              <span className="text-sm text-muted-foreground">{zh.layout.hotline}</span>
              <a
                href={hotlineHref}
                className="numeric inline-flex w-fit items-center gap-2 rounded-xs text-h3 text-foreground underline-offset-4 hover:underline"
              >
                <PhoneIcon aria-hidden className="size-5 text-muted-foreground" />
                {formConfig.hotline}
              </a>
            </p>
          ) : null}
        </div>
        <div className="rounded-md border border-border bg-card p-5 text-card-foreground md:p-8">
          <LeadForm
            config={formConfig}
            variant="inline"
            position={HOME_LEAD_POSITIONS.form}
            intent={HOME_LEAD_INTENTS.form}
            submitLabel={submitLabel}
          />
        </div>
      </Container>
    </Section>
  )
}
