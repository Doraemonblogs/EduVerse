import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { LeadForm } from '@/components/lead/lead-form'
import { getLeadFormConfig } from '@/lib/data/lead-form'
import { cn } from '@/lib/utils'
import type { CtaBlock as CtaBlockData } from '@/payload-types'

import type { BlockWidth } from './types'

/**
 * 行动号召区块：深色区块，标题与描述 + 页内留资表单（意向类型、按钮文字来自区块配置）。
 * 服务端读取表单配置，渲染客户端 LeadForm。
 */
export async function CtaBlock({
  block,
  width,
  anchorId,
  endsPage = false,
}: {
  block: CtaBlockData
  width: BlockWidth
  /** 区块标题的 id（用于 aria-labelledby），同一页面内唯一 */
  anchorId: string
  /** 是页面最后一个区块：页脚的行动号召横幅会被隐藏，避免连续两个转化区（见 globals.css） */
  endsPage?: boolean
}) {
  const config = await getLeadFormConfig()
  const twoColumns = width === 'site'

  return (
    // 下方紧接页脚的深色转化区，用描边分隔
    <Section
      tone="dark"
      aria-labelledby={anchorId}
      className="border-b border-border"
      data-page-end-cta={endsPage ? '' : undefined}
    >
      <Container
        size={width}
        className={cn(
          'grid gap-8',
          twoColumns && 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16',
        )}
      >
        <div className="flex max-w-2xl flex-col gap-4">
          <h2 id={anchorId} className="text-h2 text-foreground">
            {block.title}
          </h2>
          {block.description ? (
            <p className="text-base text-muted-foreground md:text-lg">{block.description}</p>
          ) : null}
        </div>
        <div className="rounded-md border border-border bg-card p-5 text-card-foreground md:p-8">
          <LeadForm
            config={config}
            variant="inline"
            position="page_cta"
            intent={block.intent}
            submitLabel={block.buttonLabel}
          />
        </div>
      </Container>
    </Section>
  )
}
