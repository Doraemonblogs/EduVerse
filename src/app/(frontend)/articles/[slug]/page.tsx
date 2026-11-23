import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticleDetailView } from '@/components/articles/detail/article-detail-view'
import { articleJsonLd } from '@/components/articles/detail/article-json-ld'
import { getSiteUrl, siteFallback } from '@/config/site'
import { articlePath } from '@/lib/articles/paths'
import {
  getArticleDetail,
  getArticleHotCourses,
  getArticlePagesSettings,
  getPublishedArticleSlugs,
} from '@/lib/data/articles'
import { getLeadFormConfig } from '@/lib/data/lead-form'
import { getSiteSettings } from '@/lib/data/site'
import { imageSource } from '@/lib/media'
import { JsonLd } from '@/lib/seo/json-ld'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 资讯详情 /articles/[slug]。
 * 构建时预渲染全部已发布文章；之后新发布的按需渲染（dynamicParams 默认 true），每小时重新生成一次
 * （内容变更由缓存标签即时失效；阅读量不触发失效，显示值最迟 1 小时更新）。
 * slug 不合法、文章不存在或未发布 → 404。
 */

type ArticlePageProps = { params: Promise<{ slug: string }> }

export const revalidate = 3600

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getPublishedArticleSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleDetail(slug)
  // 不存在时在元数据阶段就 404：返回空对象会让浏览器端（水合后）的标题回退成站点默认标题，
  // 而不是 not-found 的“页面不存在”标题
  if (!article) notFound()
  const metadata = await buildMetadata({
    seo: article.seo,
    title: article.title,
    description: article.excerpt,
    // 分享图：SEO 字段组的分享图 → 封面的 og 裁切（1200×630）→ 站点默认
    shareImage: article.shareImage,
    path: articlePath(article.slug),
  })
  // Open Graph 类型为文章：带上发布 / 修改时间、分类与作者
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      section: article.category?.name,
      authors: article.authorName ? [article.authorName] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await getArticleDetail(slug)
  if (!article) notFound()

  const [settings, hotCourses, leadConfig, site] = await Promise.all([
    getArticlePagesSettings(),
    getArticleHotCourses(),
    getLeadFormConfig(),
    getSiteSettings(),
  ])

  return (
    <>
      <JsonLd
        data={articleJsonLd(article, {
          siteUrl: getSiteUrl(),
          brandName: site.brandName || siteFallback.name,
          logoSrc: imageSource(site.logo)?.src ?? null,
        })}
      />
      <ArticleDetailView
        article={article}
        settings={settings}
        hotCourses={hotCourses}
        leadConfig={leadConfig}
        now={new Date()}
      />
    </>
  )
}
