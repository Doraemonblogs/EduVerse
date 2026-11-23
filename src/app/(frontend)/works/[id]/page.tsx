import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageLeadContext } from '@/components/lead/page-lead-context'
import { WorkDetailView } from '@/components/works/detail/work-detail-view'
import { workJsonLd } from '@/components/works/detail/work-json-ld'
import { getSiteUrl } from '@/config/site'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { getPublishedWorkIds, getWorkDetail, getWorkPagesSettings } from '@/lib/data/works'
import { JsonLd } from '@/lib/seo/json-ld'
import { buildMetadata } from '@/lib/seo/metadata'
import { workByline } from '@/lib/works/format'
import { workPath } from '@/lib/works/paths'
import type { WorkDetail } from '@/lib/works/types'

/**
 * 作品详情 /works/[id]。
 * 构建时预渲染全部已发布且已授权的作品；之后新发布的作品按需渲染（dynamicParams 默认 true），
 * 每小时重新生成一次（内容变更由缓存标签即时失效）。
 * ID 不是不带前导 0 的正整数、作品不存在、未发布或未确认学员授权 → 404。
 */

type WorkDetailPageProps = { params: Promise<{ id: string }> }

export const revalidate = 3600

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const ids = await getPublishedWorkIds()
  return ids.map((id) => ({ id: String(id) }))
}

/** 页面描述：作品说明 → “作品名，化名 · 届别的学员作品。” → 站点默认 */
function metaDescription(work: WorkDetail): string | null {
  if (work.description) return work.description
  const byline = workByline(work)
  return byline
    ? formatMessage(zh.works.detail.metaDescription, { title: work.title, byline })
    : null
}

export async function generateMetadata({ params }: WorkDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const work = await getWorkDetail(id)
  // 不存在时在元数据阶段就 404：返回空对象会让浏览器端（水合后）的标题回退成站点默认标题，
  // 而不是 not-found 的“页面不存在”标题
  if (!work) notFound()
  return buildMetadata({
    seo: work.seo,
    title: work.title,
    description: metaDescription(work),
    // 分享图：SEO 字段组的分享图 → 作品封面的 og 裁切（1200×630）→ 站点默认
    shareImage: work.shareImage,
    path: workPath(work.id),
  })
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { id } = await params
  const work = await getWorkDetail(id)
  if (!work) notFound()

  const settings = await getWorkPagesSettings()

  return (
    <>
      {/* 本页的弹窗（头部按钮、悬浮栏、移动端底部操作条）都带上作品所属的课程与专业方向 */}
      <PageLeadContext courseId={work.course?.id} disciplineId={work.discipline?.id} />
      <JsonLd data={workJsonLd(work, getSiteUrl())} />
      <WorkDetailView work={work} settings={settings} />
    </>
  )
}
