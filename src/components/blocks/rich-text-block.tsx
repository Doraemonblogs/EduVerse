import { RichText } from '@/components/common/rich-text'
import { cn } from '@/lib/utils'
import type { RichTextBlock as RichTextBlockData } from '@/payload-types'

import type { BlockWidth } from './types'

/** 富文本区块：常规版心下也限制在正文宽度内，保证行长适合阅读 */
export function RichTextBlock({ block, width }: { block: RichTextBlockData; width: BlockWidth }) {
  return (
    <RichText
      data={block.content}
      className={cn(width === 'site' && 'max-w-(--container-prose)')}
    />
  )
}
