import type { CareerProcessStep } from '@/lib/careers/types'
import { cn } from '@/lib/utils'

import { processGridClass, stepNumber } from './careers-layout'

type CareersProcessProps = {
  steps: CareerProcessStep[]
  className?: string
}

/**
 * 服务流程（服务端组件）：有序列表，每一步是两位序号 + 步骤名称（h3）+ 说明。
 * 桌面端一行排完（不超过 4 步；5、6 步排成 3 列），平板两列，手机单列（序号在左）；顶部粗线把各步连成一条时间线。
 * 序号只是视觉装饰（aria-hidden）：有序列表本身向读屏传达“第几步”。
 */
export function CareersProcess({ steps, className }: CareersProcessProps) {
  return (
    <ol
      role="list"
      className={cn(
        'grid gap-x-6 gap-y-6 sm:gap-y-10 lg:gap-x-8',
        processGridClass(steps.length),
        className,
      )}
    >
      {steps.map((step, index) => (
        <li
          key={`${index}-${step.title}`}
          // 手机：序号在左、名称与说明在右（节省纵向空间）；平板起序号在上
          className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] content-start gap-x-3 gap-y-1.5 border-t-2 border-foreground pt-4 sm:flex sm:flex-col sm:gap-3 sm:pt-5"
        >
          <span
            aria-hidden
            className="numeric row-span-2 text-xl leading-tight text-emphasis sm:text-h3"
          >
            {stepNumber(index)}
          </span>
          <h3 className="text-h4 text-foreground">{step.title}</h3>
          {step.description ? (
            <p className="col-start-2 text-base text-muted-foreground">{step.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
