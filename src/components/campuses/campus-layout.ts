import type { LightboxImage } from '@/components/common/lightbox'
import type { SectionTone } from '@/components/common/section'
import { zh } from '@/i18n/zh'
import type { CampusCardData, CampusDetail, CampusPhoto } from '@/lib/campuses/types'
import { formatMessage } from '@/lib/course/format'
import { truncateText } from '@/lib/lexical-text'

/**
 * 校区列表 / 详情页的纯函数：区块取舍与底色、环境照片的灯箱序列、页面标题 / 描述的兜底。
 */

const t = zh.campuses.detail

/** 首屏之后、结尾行动号召之前的内容区块（按页面顺序） */
export type CampusSectionKey = 'photos' | 'courses' | 'cohorts' | 'teachers'

/** 页面描述兜底的最大字数（搜索结果摘要一般显示 80–120 个汉字） */
const META_DESCRIPTION_MAX = 120

/**
 * 实际渲染的内容区块：环境照片、开设课程、本校区讲师没有内容时整块不渲染；
 * 近期开班始终渲染（没有开班时显示空状态，引导预约到校参观）。
 */
export function campusSectionKeys(
  campus: Pick<CampusDetail, 'photos' | 'courses' | 'teachers'>,
): CampusSectionKey[] {
  const keys: CampusSectionKey[] = []
  if (campus.photos.length > 0) keys.push('photos')
  if (campus.courses.length > 0) keys.push('courses')
  keys.push('cohorts')
  if (campus.teachers.length > 0) keys.push('teachers')
  return keys
}

/**
 * 内容区块的底色：首屏与结尾行动号召是深色，中间的区块在白底 / 米色之间交替（从白底开始），
 * 中间缺了某个区块时相邻两个区块的底色仍然不同。
 */
export function assignCampusSectionTones(
  keys: readonly CampusSectionKey[],
): Map<CampusSectionKey, SectionTone> {
  return new Map(keys.map((key, index) => [key, index % 2 === 0 ? 'light' : 'paper']))
}

/**
 * 环境照片的灯箱序列。页面网格直接显示大图（hero 尺寸，经图片优化按 sizes 缩放），
 * 灯箱的占位图（thumb）也用同一张图、同一个 sizes，浏览器从 srcset 中选中同一个地址，直接命中缓存；
 * 400 宽的 thumbnail 尺寸放在约 410px 宽的网格里、高像素密度屏上会发虚，所以不用它。
 */
export function campusLightboxItems(photos: readonly CampusPhoto[]): LightboxImage[] {
  return photos.map(({ image, caption }) => ({ image, thumb: image, caption }))
}

/** 环境照片“查看大图”按钮的读屏名称：照片说明 → 图片替代文字 → 校区名 */
export function campusPhotoLabel(photo: CampusPhoto, campusName: string): string {
  const caption = photo.caption?.trim() || photo.image.alt.trim() || campusName
  return formatMessage(t.openPhoto, { caption })
}

/**
 * 环境照片网格（移动端 2 列、≥ md 3 列）里第 index 张是否加宽：
 * 移动端照片数为奇数时第一张占满一行，避免最后一行只剩一张。
 */
export function isWidePhoto(index: number, count: number): boolean {
  return index === 0 && count > 1 && count % 2 === 1
}

/** 校区分布的城市数（按城市名去重） */
export function countCampusCities(campuses: readonly Pick<CampusCardData, 'city'>[]): number {
  return new Set(campuses.map((campus) => campus.city.trim()).filter(Boolean)).size
}

/** SEO 标题未填写时的页面标题：“北京海淀校区 · 地址与交通” */
export function campusMetaTitle(campus: Pick<CampusDetail, 'name'>): string {
  return formatMessage(t.metaTitle, { name: campus.name.trim() })
}

/** SEO 描述未填写时的页面描述：校区名与地址，引导查看交通、课程并预约到校参观（超长截断） */
export function campusMetaDescription(campus: Pick<CampusDetail, 'name' | 'address'>): string {
  const description = formatMessage(t.metaDescription, {
    name: campus.name.trim(),
    address: campus.address.trim(),
  })
  return truncateText(description, META_DESCRIPTION_MAX)
}
