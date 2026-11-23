import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageLeadContext } from '@/components/lead/page-lead-context'
import { TeacherDetailView } from '@/components/teachers/teacher-detail-view'
import { teacherPersonJsonLd } from '@/components/teachers/teacher-json-ld'
import { teacherMetaDescription, teacherMetaTitle } from '@/components/teachers/teacher-layout'
import { getSiteUrl, siteFallback } from '@/config/site'
import { getLeadFormConfig } from '@/lib/data/lead-form'
import { getSiteSettings } from '@/lib/data/site'
import {
  getPublishedTeacherSlugs,
  getTeacherDetail,
  getTeacherPagesSettings,
} from '@/lib/data/teachers'
import { JsonLd } from '@/lib/seo/json-ld'
import { buildMetadata } from '@/lib/seo/metadata'
import { teacherPath } from '@/lib/teachers/paths'

/**
 * 讲师详情 /teachers/[slug]。
 * 构建时预渲染全部已发布讲师；之后新发布的按需渲染（dynamicParams 默认 true），
 * 每小时重新生成一次，让授课课程卡片的“近期开班”随日期推移更新（内容变更由缓存标签即时失效）。
 * 讲师不存在或未发布 → 404。
 */

type TeacherPageProps = { params: Promise<{ slug: string }> }

export const revalidate = 3600

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getPublishedTeacherSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: TeacherPageProps): Promise<Metadata> {
  const { slug } = await params
  const teacher = await getTeacherDetail(slug)
  if (!teacher) return {}
  return buildMetadata({
    seo: teacher.seo,
    title: teacherMetaTitle(teacher),
    description: teacherMetaDescription(teacher),
    // 分享图：SEO 字段组的分享图 → 头像的 og 裁切（1200×630）→ 站点默认
    shareImage: teacher.shareImage,
    path: teacherPath(teacher.slug),
  })
}

export default async function TeacherPage({ params }: TeacherPageProps) {
  const { slug } = await params
  const teacher = await getTeacherDetail(slug)
  if (!teacher) notFound()

  const [settings, leadConfig, site] = await Promise.all([
    getTeacherPagesSettings(),
    getLeadFormConfig(),
    getSiteSettings(),
  ])

  return (
    <>
      {/* 本页的弹窗（头部按钮、悬浮栏、移动端底部操作条）都带上讲师的第一个专业方向 */}
      <PageLeadContext disciplineId={teacher.disciplines[0]?.id} />
      <JsonLd
        data={teacherPersonJsonLd(teacher, {
          siteUrl: getSiteUrl(),
          brandName: site.brandName || siteFallback.name,
        })}
      />
      <TeacherDetailView
        teacher={teacher}
        settings={settings}
        leadConfig={leadConfig}
        now={new Date()}
      />
    </>
  )
}
