import 'server-only'

import { unstable_cache } from 'next/cache'

import { siteFallback } from '@/config/site'
import { cacheTags } from '@/hooks/revalidate'
import { getPayloadClient } from '@/lib/payload'

/**
 * 全站框架用到的数据（导航、页脚、站点设置、大菜单、留资表单选项）。
 * 统一用 unstable_cache 缓存，并打上与 Payload 钩子一致的标签，后台保存后立即失效。
 * 注意：Local API 默认 overrideAccess=true，这里只读取可公开的数据，带草稿的集合显式过滤已发布。
 */

const published = { _status: { equals: 'published' } } as const

export const getSiteSettings = unstable_cache(
  async () => {
    const payload = await getPayloadClient()
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 1 })
    // 第三方脚本相关字段单独读取，这里剔除，避免被意外渲染到页面
    const {
      customerService: _cs,
      baiduTongjiId: _bt,
      baiduSiteVerification: _bv,
      ...rest
    } = settings
    // 全新的空库里站点设置从未保存过，必填的品牌名也是空的：兜底为默认品牌名（头部 / 页脚 Logo 依赖它）
    return { ...rest, brandName: rest.brandName?.trim() || siteFallback.name }
  },
  ['site-settings'],
  { tags: [cacheTags.global('site-settings'), cacheTags.collection('media')] },
)

/** 第三方脚本配置（百度统计、在线客服），只给 ThirdPartyScripts 组件使用 */
export const getThirdPartyConfig = unstable_cache(
  async () => {
    const payload = await getPayloadClient()
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    return {
      baiduTongjiId: settings.baiduTongjiId ?? null,
      baiduSiteVerification: settings.baiduSiteVerification ?? null,
      customerService: {
        enabled: Boolean(settings.customerService?.enabled),
        scriptUrl: settings.customerService?.scriptUrl ?? null,
        chatUrl: settings.customerService?.chatUrl ?? null,
      },
    }
  },
  ['third-party-config'],
  { tags: [cacheTags.global('site-settings')] },
)

export const getNavigation = unstable_cache(
  async () => {
    const payload = await getPayloadClient()
    return payload.findGlobal({ slug: 'navigation', depth: 0 })
  },
  ['navigation'],
  { tags: [cacheTags.global('navigation')] },
)

export const getFooter = unstable_cache(
  async () => {
    const payload = await getPayloadClient()
    return payload.findGlobal({ slug: 'footer', depth: 1 })
  },
  ['footer'],
  { tags: [cacheTags.global('footer'), cacheTags.collection('media')] },
)

export type MegaMenuCourse = { title: string; slug: string; classType: 'long_term' | 'short_term' }
export type MegaMenuGroup = {
  id: number
  name: string
  shortName: string
  slug: string
  tagline: string | null
  courses: MegaMenuCourse[]
}

/** 专业课程大菜单：显示在导航中的专业方向及其已发布课程 */
export const getMegaMenu = unstable_cache(
  async (): Promise<MegaMenuGroup[]> => {
    const payload = await getPayloadClient()
    const { docs: disciplines } = await payload.find({
      collection: 'disciplines',
      where: { and: [published, { showInNav: { equals: true } }] },
      sort: 'order',
      limit: 20,
      depth: 0,
      select: { name: true, shortName: true, slug: true, tagline: true },
    })
    const { docs: courses } = await payload.find({
      collection: 'courses',
      where: { and: [published, { discipline: { in: disciplines.map((d) => d.id) } }] },
      sort: 'order',
      limit: 200,
      depth: 0,
      select: { title: true, slug: true, classType: true, discipline: true },
    })
    return disciplines.map((d) => ({
      id: d.id,
      name: d.name,
      shortName: d.shortName || d.name,
      slug: d.slug ?? '',
      tagline: d.tagline ?? null,
      courses: courses
        .filter((c) => c.discipline === d.id)
        .map((c) => ({ title: c.title, slug: c.slug ?? '', classType: c.classType })),
    }))
  },
  ['mega-menu'],
  { tags: [cacheTags.collection('disciplines'), cacheTags.collection('courses')] },
)

export type CampusCity = { name: string; slug: string; city: string; citySlug: string }

/** 校区列表（移动端菜单、页脚等） */
export const getCampusList = unstable_cache(
  async (): Promise<CampusCity[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'campuses',
      where: published,
      sort: 'order',
      limit: 50,
      depth: 0,
      select: { name: true, slug: true, city: true, citySlug: true },
    })
    return docs.map((c) => ({
      name: c.name,
      slug: c.slug ?? '',
      city: c.city,
      citySlug: c.citySlug,
    }))
  },
  ['campus-list'],
  { tags: [cacheTags.collection('campuses')] },
)

export type LeadFormOptions = {
  disciplines: { id: number; name: string }[]
  cities: string[]
  successTitle: string
  successMessage: string
  privacyPolicyVersion: string
  wechatId: string | null
  wechatQr: unknown
  hotline: string | null
}

/**
 * 留资表单需要的公开选项。只读取可公开的字段——留资设置里的群机器人地址与密钥绝不下发到前台。
 */
export const getLeadFormOptions = unstable_cache(
  async (): Promise<LeadFormOptions> => {
    const payload = await getPayloadClient()
    const [leadSettings, settings, disciplines] = await Promise.all([
      payload.findGlobal({
        slug: 'lead-settings',
        depth: 1,
        select: { cityOptions: true, successTitle: true, successMessage: true, wechatQr: true },
      }),
      payload.findGlobal({
        slug: 'site-settings',
        depth: 1,
        select: { privacyPolicyVersion: true, wechatId: true, wechatQr: true, hotline: true },
      }),
      payload.find({
        collection: 'disciplines',
        where: published,
        sort: 'order',
        limit: 50,
        depth: 0,
        select: { name: true },
      }),
    ])
    return {
      disciplines: disciplines.docs.map((d) => ({ id: d.id, name: d.name })),
      cities: (leadSettings.cityOptions ?? []).map((c) => c.name).filter(Boolean),
      successTitle: leadSettings.successTitle || '提交成功',
      successMessage: leadSettings.successMessage || '',
      privacyPolicyVersion: settings.privacyPolicyVersion,
      wechatId: settings.wechatId ?? null,
      wechatQr: leadSettings.wechatQr || settings.wechatQr || null,
      hotline: settings.hotline ?? null,
    }
  },
  ['lead-form-options'],
  {
    tags: [
      cacheTags.global('lead-settings'),
      cacheTags.global('site-settings'),
      cacheTags.collection('disciplines'),
      cacheTags.collection('media'),
    ],
  },
)
