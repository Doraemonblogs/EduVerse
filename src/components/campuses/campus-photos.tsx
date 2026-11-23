import { Maximize2Icon } from 'lucide-react'
import Image from 'next/image'

import { Lightbox, LightboxTrigger } from '@/components/common/lightbox'
import type { CampusPhoto } from '@/lib/campuses/types'
import { cn } from '@/lib/utils'

import { campusLightboxItems, campusPhotoLabel, isWidePhoto } from './campus-layout'

/**
 * 网格里照片的显示宽度（移动端 2 列、≥ md 3 列，版心 1280px；移动端加宽的第一张按通栏计）。
 * 灯箱的占位图用同一个 sizes（见 campusLightboxItems），浏览器选中同一个地址、直接命中缓存。
 */
export const CAMPUS_PHOTO_SIZES =
  '(min-width: 1360px) 410px, (min-width: 768px) 31vw, (min-width: 640px) 46vw, 100vw'

type CampusPhotosProps = {
  photos: readonly CampusPhoto[]
  /** 校区名：灯箱标题；照片没有说明与替代文字时用作读屏名称 */
  campusName: string
}

/**
 * 校区环境照片（服务端组件，灯箱是通用的客户端组件 Lightbox）：
 * 4:3 网格（移动端 2 列，照片数为奇数时第一张占满一行；≥ md 3 列），每张图下方是说明文字；
 * 点击照片打开大图灯箱（左右切换、Esc 关闭，焦点回到点击的照片）。照片在首屏之下，全部懒加载。
 */
export function CampusPhotos({ photos, campusName }: CampusPhotosProps) {
  const items = campusLightboxItems(photos)
  return (
    <Lightbox items={items} title={campusName} thumbSizes={CAMPUS_PHOTO_SIZES}>
      <ul
        role="list"
        className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 md:gap-x-5 md:gap-y-8"
      >
        {photos.map((photo, index) => (
          <li
            key={`${index}-${photo.image.src}`}
            className={cn(isWidePhoto(index, photos.length) && 'col-span-2 md:col-span-1')}
          >
            <figure className="flex flex-col gap-2 md:gap-3">
              <LightboxTrigger
                index={index}
                label={campusPhotoLabel(photo, campusName)}
                className="group relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-muted"
              >
                <Image
                  src={photo.image.src}
                  alt={photo.image.alt || photo.caption || campusName}
                  width={photo.image.width}
                  height={photo.image.height}
                  sizes={CAMPUS_PHOTO_SIZES}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
                />
                <span
                  aria-hidden
                  className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-xs bg-background/85 text-foreground transition-colors group-hover:bg-background"
                >
                  <Maximize2Icon className="size-4" />
                </span>
              </LightboxTrigger>
              {photo.caption ? (
                <figcaption className="text-sm text-muted-foreground md:text-base">
                  {photo.caption}
                </figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>
    </Lightbox>
  )
}
