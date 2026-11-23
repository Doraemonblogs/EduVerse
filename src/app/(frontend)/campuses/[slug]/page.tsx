import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CampusDetailView } from '@/components/campuses/campus-detail-view'
import { campusJsonLd } from '@/components/campuses/campus-json-ld'
import { campusMetaDescription, campusMetaTitle } from '@/components/campuses/campus-layout'
import { getSiteUrl, siteFallback } from '@/config/site'
import { campusPath } from '@/lib/campuses/paths'
import {
  getCampusDetail,
  getCampusPagesSettings,
  getPublishedCampusSlugs,
} from '@/lib/data/campuses'
import { getLeadFormConfig } from '@/lib/data/lead-form'
import { getSiteSettings } from '@/lib/data/site'
import { JsonLd } from '@/lib/seo/json-ld'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 校区详情 /campuses/[slug]。
 * 构建时预渲染全部已发布校区；之后新发布的按需渲染（dynamicParams 默认 true），
 * 每小时重新生成一次，让“近期开班”与课程卡片随日期推移更新（内容变更由缓存标签即时失效）。
 * 校区不存在或未发布 → 404。
 */

type CampusPageProps = { params: Promise<{ slug: string }> }

export const revalidate = 3600

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getPublishedCampusSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: CampusPageProps): Promise<Metadata> {
  const { slug } = await params
  const campus = await getCampusDetail(slug)
  if (!campus) return {}
  return buildMetadata({
    seo: campus.seo,
    title: campusMetaTitle(campus),
    description: campusMetaDescription(campus),
    // 分享图：SEO 字段组的分享图 → 校区封面的 og 裁切（1200×630）→ 站点默认
    shareImage: campus.shareImage,
    path: campusPath(campus.slug),
  })
}

export default async function CampusPage({ params }: CampusPageProps) {
  const { slug } = await params
  const campus = await getCampusDetail(slug)
  if (!campus) notFound()

  const [settings, leadConfig, site] = await Promise.all([
    getCampusPagesSettings(),
    getLeadFormConfig(),
    getSiteSettings(),
  ])

  return (
    <>
      <JsonLd
        data={campusJsonLd(campus, {
          siteUrl: getSiteUrl(),
          brandName: site.brandName || siteFallback.name,
        })}
      />
      <CampusDetailView
        campus={campus}
        settings={settings}
        leadConfig={leadConfig}
        now={new Date()}
      />
    </>
  )
}
