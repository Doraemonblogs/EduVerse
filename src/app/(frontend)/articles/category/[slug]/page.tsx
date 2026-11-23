import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { articlesPagedTitle, buildArticleCategoryNav } from '@/components/articles/articles-list'
import { ArticlesListView } from '@/components/articles/articles-list-view'
import { articleCategoryDescription } from '@/lib/articles/format'
import { articlesInCategory, findArticleCategory } from '@/lib/articles/mappers'
import {
  ARTICLES_PAGE_SIZE,
  ARTICLES_PATH,
  articleCategoryPath,
  articlesPageHref,
} from '@/lib/articles/paths'
import {
  getArticleCategorySlugs,
  getArticleList,
  getArticlePagesSettings,
} from '@/lib/data/articles'
import { paginate, parsePageParam } from '@/lib/pagination'
import { isValidSlug, readSearchParam } from '@/lib/search-params'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 资讯分类页 /articles/category/[slug]：可收录的落地页（h1 为分类名，简介为分类描述；
 * 未填写描述时用含分类名与文章数的模板，见 articleCategoryDescription，各分类页的描述互不相同），
 * 版式与分页规则同资讯列表（每页 12 篇，canonical 带页码，第 2 页起标题加页码，超出总页数 404）。
 * 构建时预渲染有文章的分类；读取 ?page= 后按请求渲染，文章数据与资讯列表共用一份缓存。
 * slug 不合法、分类不存在或没有已发布的文章 → 404。
 */

type CategoryPageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const revalidate = 3600

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getArticleCategorySlugs()
  return slugs.map((slug) => ({ slug }))
}

/** 找分类、过滤、分页；找不到或页码超出时 notFound()（generateMetadata 与页面共用） */
async function loadCategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ slug }, query, list] = await Promise.all([params, searchParams, getArticleList()])
  const category = isValidSlug(slug) ? findArticleCategory(list.categories, slug) : null
  if (!category) notFound()
  const slice = paginate(
    articlesInCategory(list.articles, category.slug),
    parsePageParam(readSearchParam(query, 'page')),
    ARTICLES_PAGE_SIZE,
  )
  if (slice.outOfRange) notFound()
  return { list, category, slice }
}

export async function generateMetadata(props: CategoryPageProps): Promise<Metadata> {
  const { category, slice } = await loadCategoryPage(props)
  return buildMetadata({
    title: articlesPagedTitle(category.name, slice.page),
    // 与页面上 h1 下的简介一致（没有填写描述的分类也不会和资讯列表、其它分类重复）
    description: articleCategoryDescription(category),
    path: articlesPageHref(slice.page, category.slug),
  })
}

export default async function ArticleCategoryPage(props: CategoryPageProps) {
  const [{ list: settings }, { list, category, slice }] = await Promise.all([
    getArticlePagesSettings(),
    loadCategoryPage(props),
  ])

  return (
    <ArticlesListView
      title={category.name}
      description={articleCategoryDescription(category)}
      breadcrumbs={[
        { label: settings.title, href: ARTICLES_PATH },
        { label: category.name, href: articleCategoryPath(category.slug) },
      ]}
      nav={buildArticleCategoryNav(list.categories, list.articles.length, category.slug)}
      slice={slice}
      categorySlug={category.slug}
    />
  )
}
