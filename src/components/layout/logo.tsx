import Image from 'next/image'
import Link from 'next/link'

import { zh } from '@/i18n/zh'
import { imageSource } from '@/lib/media'
import { cn } from '@/lib/utils'

/**
 * 品牌标识：后台上传了 Logo 则显示图片，否则用文字标（西文 + 中文）。
 * 文字标中的西文用 Space Grotesk，中文用系统字体。
 */
export function Logo({
  brandName,
  shortName,
  logo,
  loading,
  className,
}: {
  brandName: string
  shortName?: string | null
  logo?: unknown
  /**
   * 图片 Logo 的加载方式。头部 Logo 在首屏内，传 'eager' 立即加载；页脚等首屏外的 Logo 不传（默认懒加载）。
   * 不用 preload（Next 16 起取代已弃用的 priority）：Logo 不是 LCP 元素，不必占用 <head> 里的预加载。
   */
  loading?: 'eager' | 'lazy'
  className?: string
}) {
  const image = imageSource(logo)
  const [latin, ...rest] = brandName.split(' ')
  const hasLatinPrefix = Boolean(shortName && latin === shortName && rest.length > 0)

  return (
    <Link
      href="/"
      className={cn('flex shrink-0 items-center gap-2 text-foreground', className)}
      // 用函数作替换值：品牌名来自后台，其中的 $&、$' 等不能被当作替换模式展开
      aria-label={zh.layout.logoHomeLabel.replace('{brand}', () => brandName)}
    >
      {image ? (
        <Image
          src={image.src}
          alt=""
          width={image.width}
          height={image.height}
          className="h-8 w-auto"
          loading={loading}
        />
      ) : hasLatinPrefix ? (
        <span className="flex items-baseline gap-1.5 leading-none">
          <span className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold tracking-tight">
            {latin}
          </span>
          <span className="text-sm font-semibold">{rest.join(' ')}</span>
        </span>
      ) : (
        <span className="text-lg font-bold">{brandName}</span>
      )}
    </Link>
  )
}
