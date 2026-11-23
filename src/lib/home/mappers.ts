import { safeHref } from '@/components/common/rich-text'
import { populated, relationId, toDisciplineRef } from '@/lib/course/mappers'
import type { CourseCardData } from '@/lib/course/types'
import { imageSource } from '@/lib/media'
import type {
  Article,
  ArticleCategory,
  Banner,
  Campus,
  Discipline,
  HomePage,
  Partner,
  Story,
} from '@/payload-types'

import { amapMarkerUrl, telHref } from './map'
import type {
  HomeArticle,
  HomeBanner,
  HomeCampus,
  HomeDiscipline,
  HomeLink,
  HomePartner,
  HomeQuickEntry,
  HomeStory,
} from './types'

/**
 * Payload 文档 → 首页视图模型（纯函数，供 src/lib/data/home.ts 使用，可单测）。
 * 发布状态、授权由查询条件保证；按 depth 填充进来的关联（课程、分类、合作企业）在这里再判断。
 */

type Relation<T> = number | T | null | undefined

const textOrNull = (value: string | null | undefined) => value?.trim() || null

/**
 * 后台填写的链接地址 → HomeLink：经 safeHref 校验（只允许站内路径、页内锚点、http(s)、mailto、tel），
 * 指向本站的完整地址转为站内路径；不合法或为空时返回 null。
 * 以 // 开头的协议相对地址（指向其它域名，后台校验本就不允许）同样返回 null。
 */
export function toHomeLink(href: string | null | undefined): HomeLink | null {
  const safe = safeHref(href)
  if (!safe || safe.startsWith('//')) return null
  return { href: safe, external: /^https?:/i.test(safe) }
}

export type BannerSource = Pick<
  Banner,
  'id' | 'title' | 'subtitle' | 'ctaLabel' | 'href' | 'image' | 'mobileImage' | 'startAt' | 'endAt'
>

/**
 * 轮播图；桌面图未填充 / 没有地址时返回 null（不展示）。
 * 两张图都取 hero 尺寸（最宽 1920，原图更小时保持原尺寸，不放大）：主视觉是首屏最大内容（LCP），
 * 移动端竖框用 object-cover 裁切横幅桌面图时实际绘制宽度约为框宽的 3 倍，800 宽的 card 尺寸不够用。
 * 组件按图片宽高比给出 sizes（见 coverSizes），浏览器再从 srcset 里挑合适的宽度，不会多下载。
 */
export function toHomeBanner(banner: BannerSource): HomeBanner | null {
  const image = imageSource(banner.image, 'hero')
  const mobileImage = imageSource(banner.mobileImage, 'hero') ?? image
  if (!image || !mobileImage) return null
  return {
    id: banner.id,
    title: banner.title.trim(),
    subtitle: textOrNull(banner.subtitle),
    ctaLabel: textOrNull(banner.ctaLabel),
    link: toHomeLink(banner.href),
    image,
    mobileImage,
    startAt: banner.startAt ?? null,
    endAt: banner.endAt ?? null,
  }
}

type QuickEntrySource = NonNullable<NonNullable<HomePage['quickEntries']>['items']>[number]

/** 入口卡片；点击行为为“跳转链接”但地址不合法时返回 null（不展示） */
export function toQuickEntry(item: QuickEntrySource, index: number): HomeQuickEntry | null {
  const title = item.title?.trim()
  if (!title) return null
  let action: HomeQuickEntry['action']
  if (item.action === 'lead') {
    action = { kind: 'lead' }
  } else {
    const link = toHomeLink(item.href)
    if (!link) return null
    action = { kind: 'link', link }
  }
  return {
    id: item.id ?? `entry-${index}`,
    title,
    description: textOrNull(item.description),
    image: imageSource(item.image, 'thumbnail'),
    action,
  }
}

export type HomeDisciplineSource = Pick<
  Discipline,
  'id' | 'name' | 'shortName' | 'slug' | 'tagline' | 'cover'
>

export function toHomeDiscipline(
  discipline: HomeDisciplineSource,
  courseCount: number,
): HomeDiscipline {
  return {
    ...toDisciplineRef(discipline),
    tagline: textOrNull(discipline.tagline),
    cover: imageSource(discipline.cover, 'card'),
    courseCount,
  }
}

export type HomeStorySource = Pick<
  Story,
  'id' | 'displayName' | 'background' | 'avatar' | 'currentRole' | 'companyName' | 'quote'
> & {
  course?: Relation<{ id: number }>
  partner?: Relation<Pick<Partner, 'name'>>
}

/**
 * 学员故事卡片。所属课程只有在 reachableCourses（可公开访问的课程卡片）里时给出；
 * 就职公司为空时取关联合作企业的名称（只作文字）。故事里的薪资、正文、作品都不输出。
 */
export function toHomeStory(
  story: HomeStorySource,
  reachableCourses: ReadonlyMap<number, Pick<CourseCardData, 'title' | 'slug'>>,
): HomeStory {
  const courseId = relationId(story.course)
  const course = courseId === null ? undefined : reachableCourses.get(courseId)
  return {
    id: story.id,
    displayName: story.displayName.trim(),
    background: textOrNull(story.background),
    avatar: imageSource(story.avatar, 'thumbnail'),
    currentRole: textOrNull(story.currentRole),
    companyName: textOrNull(story.companyName) ?? textOrNull(populated(story.partner)?.name),
    quote: textOrNull(story.quote),
    course: course ? { title: course.title, slug: course.slug } : null,
  }
}

export type HomePartnerSource = Pick<Partner, 'id' | 'name' | 'industry' | 'logo'>

/** 合作企业；Logo 未填充 / 没有地址时返回 null（Logo 墙不展示没有 Logo 的企业）。官网地址不输出 */
export function toHomePartner(partner: HomePartnerSource): HomePartner | null {
  const logo = imageSource(partner.logo, 'thumbnail')
  if (!logo) return null
  const name = partner.name.trim()
  return {
    id: partner.id,
    name,
    industry: textOrNull(partner.industry),
    // Logo 的替代文字统一用企业名（媒体库里的替代文字可能是“××标识（占位图）”）
    logo: { ...logo, alt: name },
  }
}

export type HomeCampusSource = Pick<
  Campus,
  'id' | 'name' | 'slug' | 'city' | 'address' | 'phone' | 'openingHours' | 'cover' | 'location'
>

export function toHomeCampus(campus: HomeCampusSource): HomeCampus {
  const phone = textOrNull(campus.phone)
  return {
    id: campus.id,
    name: campus.name,
    slug: campus.slug,
    city: campus.city,
    address: campus.address,
    phone,
    phoneHref: telHref(phone),
    openingHours: textOrNull(campus.openingHours),
    cover: imageSource(campus.cover, 'card'),
    mapUrl: amapMarkerUrl(campus.location, campus.name),
  }
}

export type ArticleCategorySource = Pick<ArticleCategory, 'id' | 'name' | 'slug' | 'order'>

/** 文章的分类（已填充时）；未填充（只有 ID）或已删除时为 null */
export function articleCategoryOf(
  category: Relation<ArticleCategorySource>,
): ArticleCategorySource | null {
  return populated(category)
}

export type HomeArticleSource = Pick<
  Article,
  'id' | 'slug' | 'title' | 'excerpt' | 'publishedAt' | 'cover'
> & {
  category: Relation<ArticleCategorySource>
}

export function toHomeArticle(article: HomeArticleSource): HomeArticle {
  const category = articleCategoryOf(article.category)
  return {
    id: article.id,
    slug: article.slug,
    title: article.title.trim(),
    excerpt: article.excerpt.trim(),
    publishedAt: article.publishedAt,
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
    cover: imageSource(article.cover, 'card'),
  }
}
