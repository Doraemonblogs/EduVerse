import Image from 'next/image'

import { RichText } from '@/components/common/rich-text'
import { imageSource } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { ImageTextBlock as ImageTextBlockData } from '@/payload-types'

import type { BlockWidth } from './types'

/**
 * 图文区块：≥ md 两栏（图片可在左 / 右），移动端统一图片在上、文字在下。
 * 正文版心（prose）下始终单栏。
 */
export function ImageTextBlock({ block, width }: { block: ImageTextBlockData; width: BlockWidth }) {
  const image = imageSource(block.image, 'hero')
  const twoColumns = width === 'site' && Boolean(image)
  const imageRight = block.imagePosition === 'right'

  return (
    <div
      className={cn(
        'grid gap-8',
        twoColumns && 'md:grid-cols-2 md:items-center md:gap-10 lg:gap-16',
      )}
    >
      {image ? (
        <div className={cn(twoColumns && imageRight && 'md:order-last')}>
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes={
              twoColumns
                ? '(min-width: 1360px) 608px, (min-width: 768px) 45vw, 100vw'
                : '(min-width: 768px) 736px, 100vw'
            }
            className="h-auto w-full rounded-md bg-muted"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-5">
        {block.title ? <h2 className="text-h2 text-foreground">{block.title}</h2> : null}
        <RichText data={block.content} />
      </div>
    </div>
  )
}
