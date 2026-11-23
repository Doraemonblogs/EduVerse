import { SectionHeading } from '@/components/common/section-heading'
import { cn } from '@/lib/utils'

import { sectionTitleId, type CourseDetailSectionId } from './sections'

type DetailSectionProps = {
  id: CourseDetailSectionId
  title: string
  description?: string
  /** 标题右侧的操作区 */
  actions?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/**
 * 课程详情主栏里的一个内容区块：id 即页内导航的锚点，h2 标题用 aria-labelledby 关联。
 * 锚点跳转时避开吸顶头部（html 的 scroll-padding-top 5rem）与桌面端吸顶的页内导航（再加 4rem）。
 */
export function DetailSection({
  id,
  title,
  description,
  actions,
  className,
  children,
}: DetailSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={sectionTitleId(id)}
      className={cn('flex scroll-mt-4 flex-col gap-6 md:gap-8 lg:scroll-mt-16', className)}
    >
      <SectionHeading
        id={sectionTitleId(id)}
        title={title}
        description={description}
        actions={actions}
      />
      {children}
    </section>
  )
}
