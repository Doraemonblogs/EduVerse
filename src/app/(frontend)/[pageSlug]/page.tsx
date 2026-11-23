import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RenderBlocks } from '@/components/blocks/render-blocks'
import type { BlockWidth } from '@/components/blocks/types'
import { PageHeader } from '@/components/common/page-header'
import { RESERVED_PAGE_SLUGS } from '@/collections/Pages'
import { getPageBySlug, getPublishedPageSlugs } from '@/lib/data/pages'
import { buildMetadata } from '@/lib/seo/metadata'
import type { Page } from '@/payload-types'

/**
 * 通用页面：关于我们、联系我们、隐私政策、用户协议等（pages 集合）。
 * 标题、区块与 TDK 全部来自后台；构建时预渲染已发布页面，之后新发布的页面按需渲染。
 */

type CmsPageProps = { params: Promise<{ pageSlug: string }> }

/** 法律文本使用正文版心 */
const PROSE_SLUGS = new Set<string>([RESERVED_PAGE_SLUGS.privacy, RESERVED_PAGE_SLUGS.terms])

function contentWidth(page: Page): BlockWidth {
  const textOnly = page.layout.every((block) => block.blockType === 'richText')
  return PROSE_SLUGS.has(page.slug) || textOnly ? 'prose' : 'site'
}

export async function generateStaticParams(): Promise<{ pageSlug: string }[]> {
  const slugs = await getPublishedPageSlugs()
  return slugs.map((pageSlug) => ({ pageSlug }))
}

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const { pageSlug } = await params
  const page = await getPageBySlug(pageSlug)
  if (!page) return {}
  return buildMetadata({ seo: page.seo, title: page.title, path: `/${page.slug}` })
}

export default async function CmsPage({ params }: CmsPageProps) {
  const { pageSlug } = await params
  const page = await getPageBySlug(pageSlug)
  if (!page) notFound()

  const width = contentWidth(page)

  return (
    <>
      <PageHeader
        title={page.title}
        breadcrumbs={[{ label: page.title, href: `/${page.slug}` }]}
        size={width}
      />
      <RenderBlocks blocks={page.layout} width={width} />
    </>
  )
}
