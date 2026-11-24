import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { buildArticleCategoryNav, articlesPagedTitle } from '@/components/articles/articles-list'
import { ArticlesListView } from '@/components/articles/articles-list-view'
import { ARTICLES_PAGE_SIZE, ARTICLES_PATH, articlesPageHref } from '@/lib/articles/paths'
import { getArticleList, getArticlePagesSettings } from '@/lib/data/articles'
import { paginate, parsePageParam } from '@/lib/pagination'
import { readSearchParam } from '@/lib/search-params'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 资讯列表 /articles：全部已发布文章（发布时间降序），每页 12 篇，第 1 页首篇做头条大卡；分类导航链接到分类页。
 * 页码只存在于 URL（?page=N）：读取 searchParams 使页面按请求渲染，文章数据走 unstable_cache
 * （后台保存后按标签失效，阅读量最迟 1 小时更新），渲染时分页。
 * 收录：每一页都可收录，canonical 为 articlesPageHref(page)（第 1 页不带 ?page=，非法页码按第 1 页），
 * 第 2 页起标题加“（第 N 页）”；页码超出总页数 → 404（没有文章时只有第 1 页，显示空状态）。
 */

type ArticlesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** 解析页码并分页；超出总页数时 notFound()（generateMetadata 与页面共用，数据来自同一份缓存） */
async function loadArticlesPage(searchParamsPromise: ArticlesPageProps['searchParams']) {
  const [list, searchParams] = await Promise.all([getArticleList(), searchParamsPromise])
  const slice = paginate(
    list.articles,
    parsePageParam(readSearchParam(searchParams, 'page')),
    ARTICLES_PAGE_SIZE,
  )
  if (slice.outOfRange) notFound()
  return { list, slice }
}

export async function generateMetadata({ searchParams }: ArticlesPageProps): Promise<Metadata> {
  const [{ list: settings }, { slice }] = await Promise.all([
    getArticlePagesSettings(),
    loadArticlesPage(searchParams),
  ])
  // 后台填写的 SEO 标题是完整标题（不套模板），同样加上页码
  const seo = settings.seo?.title
    ? { ...settings.seo, title: articlesPagedTitle(settings.seo.title, slice.page) }
    : settings.seo
  return buildMetadata({
    seo,
    title: articlesPagedTitle(settings.title, slice.page),
    description: settings.description,
    path: articlesPageHref(slice.page),
    page: slice.page,
  })
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const [{ list: settings }, { list, slice }] = await Promise.all([
    getArticlePagesSettings(),
    loadArticlesPage(searchParams),
  ])

  return (
    <ArticlesListView
      title={settings.title}
      description={settings.description}
      breadcrumbs={[{ label: settings.title, href: ARTICLES_PATH }]}
      nav={
        list.articles.length > 0
          ? buildArticleCategoryNav(list.categories, list.articles.length, null)
          : []
      }
      slice={slice}
      categorySlug={null}
    />
  )
}
