import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { MajorView } from '@/components/course/major/major-view'
import { PageLeadContext } from '@/components/lead/page-lead-context'
import { getSiteUrl } from '@/config/site'
import { courseItemListJsonLd } from '@/lib/course/json-ld'
import { majorPath } from '@/lib/course/paths'
import {
  getCoursePagesSettings,
  getDisciplineDetail,
  getPublishedDisciplineSlugs,
} from '@/lib/data/courses'
import { getLeadFormConfig } from '@/lib/data/lead-form'
import { JsonLd } from '@/lib/seo/json-ld'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 专业方向落地页 /majors/[slug]（承接“三维动画培训”一类的搜索流量）。
 * 构建时预渲染全部已发布的专业方向；之后新发布的按需渲染（dynamicParams 默认 true），
 * 每小时重新生成一次，让课程卡片的“近期开班”随日期推移更新（内容变更由缓存标签即时失效）。
 * 专业方向不存在或未发布 → 404。
 */

type MajorPageProps = { params: Promise<{ slug: string }> }

export const revalidate = 3600

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getPublishedDisciplineSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: MajorPageProps): Promise<Metadata> {
  const { slug } = await params
  const discipline = await getDisciplineDetail(slug)
  if (!discipline) return {}
  return buildMetadata({
    seo: discipline.seo,
    title: discipline.name,
    description: discipline.tagline,
    // 分享图：SEO 字段组的分享图 → 专业方向封面的 og 裁切（1200×630）→ 站点默认
    shareImage: discipline.shareImage,
    path: majorPath(discipline.slug),
  })
}

export default async function MajorPage({ params }: MajorPageProps) {
  const { slug } = await params
  const discipline = await getDisciplineDetail(slug)
  if (!discipline) notFound()

  const [settings, leadConfig] = await Promise.all([getCoursePagesSettings(), getLeadFormConfig()])
  const courseList = courseItemListJsonLd(discipline.courses, getSiteUrl())

  return (
    <>
      {/* 本页的弹窗（头部按钮、悬浮栏、移动端底部操作条）都带上专业方向 */}
      <PageLeadContext disciplineId={discipline.id} />
      {courseList ? <JsonLd data={courseList} /> : null}
      <MajorView
        discipline={discipline}
        settings={settings}
        leadConfig={leadConfig}
        now={new Date()}
      />
    </>
  )
}
