import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { LeadForm } from '@/components/lead/lead-form'
import type { LeadFormConfig } from '@/components/lead/types'
import type { CareersPageData } from '@/lib/careers/types'
import { cn } from '@/lib/utils'

import { CAREERS_CONTAINER_CLASS, CAREERS_SECTION_IDS } from './careers-layout'

type CareersCtaProps = {
  /** 标题与说明来自后台「就业服务页 · 行动号召」（未填写时数据层给出默认文案） */
  cta: CareersPageData['cta']
  config: LeadFormConfig
}

/**
 * 就业服务页结尾的行动号召（深色区块）：标题与说明 + 页内留资表单（position=careers_cta，意向 consult）。
 * 页面以表单收尾，页脚的行动号召横幅隐藏（data-page-end-cta，见 globals.css）。
 * 版式与讲师详情、专业方向页的行动号召区块一致。
 */
export function CareersCta({ cta, config }: CareersCtaProps) {
  const titleId = `${CAREERS_SECTION_IDS.cta}-title`

  return (
    // 下方紧接页脚（同为深色），用描边分隔
    <Section
      id={CAREERS_SECTION_IDS.cta}
      tone="dark"
      aria-labelledby={titleId}
      className="border-b border-border"
      data-page-end-cta=""
    >
      <Container
        className={cn(
          'grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16',
          CAREERS_CONTAINER_CLASS,
        )}
      >
        <div className="flex max-w-2xl flex-col gap-4">
          <h2 id={titleId} className="text-h2 text-foreground">
            {cta.title}
          </h2>
          {cta.description ? (
            <p className="text-base text-muted-foreground md:text-lg">{cta.description}</p>
          ) : null}
        </div>
        <div className="rounded-md border border-border bg-card p-5 text-card-foreground md:p-8">
          <LeadForm config={config} variant="inline" position="careers_cta" intent="consult" />
        </div>
      </Container>
    </Section>
  )
}
