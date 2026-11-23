import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CourseDetailView } from '@/components/course/detail/course-detail-view'
import { PageLeadContext } from '@/components/lead/page-lead-context'
import { getSiteUrl, siteFallback } from '@/config/site'
import { courseJsonLd, faqPageJsonLd } from '@/lib/course/json-ld'
import { coursePath } from '@/lib/course/paths'
import {
  getCourseDetail,
  getCoursePagesSettings,
  getPublishedCourseSlugs,
} from '@/lib/data/courses'
import { getLeadFormConfig } from '@/lib/data/lead-form'
import { getSiteSettings } from '@/lib/data/site'
import { JsonLd } from '@/lib/seo/json-ld'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 课程详情 /courses/[slug]。
 * 构建时预渲染全部已发布课程；之后新发布的课程按需渲染（dynamicParams 默认 true），
 * 每小时重新生成一次，让“近期开班”随日期推移更新（内容变更由缓存标签即时失效）。
 * 课程不存在、未发布或所属专业方向未发布 → 404。
 */

type CourseDetailPageProps = { params: Promise<{ slug: string }> }

export const revalidate = 3600

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getPublishedCourseSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const course = await getCourseDetail(slug)
  // 不存在时在元数据阶段就 404：返回空对象会让浏览器端（水合后）的标题回退成站点默认标题，
  // 而不是 not-found 的“页面不存在”标题
  if (!course) notFound()
  return buildMetadata({
    seo: course.seo,
    title: course.title,
    description: course.summary,
    // 分享图：SEO 字段组的分享图 → 课程封面的 og 裁切（1200×630）→ 站点默认
    shareImage: course.shareImage,
    path: coursePath(course.slug),
  })
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params
  const course = await getCourseDetail(slug)
  if (!course) notFound()

  const [settings, leadConfig, site] = await Promise.all([
    getCoursePagesSettings(),
    getLeadFormConfig(),
    getSiteSettings(),
  ])
  const now = new Date()
  const faqData = faqPageJsonLd(course.faqs)

  return (
    <>
      {/* 本页的弹窗（头部按钮、悬浮栏、移动端底部操作条）都带上课程与专业 */}
      <PageLeadContext courseId={course.id} disciplineId={course.discipline.id} />
      <JsonLd
        data={courseJsonLd(course, {
          siteUrl: getSiteUrl(),
          brandName: site.brandName || siteFallback.name,
          now,
        })}
      />
      {faqData ? <JsonLd data={faqData} /> : null}
      <CourseDetailView course={course} settings={settings} leadConfig={leadConfig} now={now} />
    </>
  )
}
