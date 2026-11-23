import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Container } from '@/components/common/container'
import { Pagination } from '@/components/common/pagination'
import { Section } from '@/components/common/section'
import { isStaticPreview } from '@/config/site'
import { zh } from '@/i18n/zh'
import { articlesPageHref } from '@/lib/articles/paths'
import type { ArticleCardData } from '@/lib/articles/types'
import type { PageSlice } from '@/lib/pagination'
import type { BreadcrumbItem } from '@/lib/seo/json-ld'
import { cn } from '@/lib/utils'

import { ArticleCategoryNav } from './article-category-nav'
import { ArticleGrid } from './article-grid'
import { hasArticleHeadline, type ArticleCategoryNavItem } from './articles-list'
import { ArticlesListEmpty } from './articles-list-empty'

export type ArticlesListViewProps = {
  /** h1：资讯列表页为后台「资讯页面设置」的标题，分类页为分类名 */
  title: string
  description: string | null
  /** 首页之后的面包屑（最后一项为当前页） */
  breadcrumbs: BreadcrumbItem[]
  /** 分类导航（“全部”+ 有文章的分类）；还没有任何文章时为空数组，不显示 */
  nav: ArticleCategoryNavItem[]
  /** 当前页（已切好的文章与页码） */
  slice: PageSlice<ArticleCardData>
  /** 分类页的分类 slug（分页链接保持在分类内）；资讯列表页为 null */
  categorySlug: string | null
}

/**
 * 两个版心都给桌面端悬浮操作栏让位（lg:avoid-floating-actions，见 globals.css）：
 * 1024–1439px 时第三列卡片贴着版心右缘，会被固定在视口中部的悬浮栏盖住；标题区同样让位，上下右缘对齐。
 */
const LIST_CONTAINER_CLASS = 'lg:avoid-floating-actions'

/**
 * 资讯列表 / 分类页的主体（服务端组件，不取数据）：
 * 米色标题区（面包屑、h1、简介，底部是分类导航）→ 文章网格（第 1 页头条大卡）→ 分页 → 空状态。
 * 分类与页码只存在于 URL 里，全部是普通链接，不需要客户端 JS（分类导航的“滚到当前项”除外）。
 */
export function ArticlesListView({
  title,
  description,
  breadcrumbs,
  nav,
  slice,
  categorySlug,
}: ArticlesListViewProps) {
  const hasNav = nav.length > 1

  return (
    <>
      <Section tone="paper" spacing="none" className={hasNav ? 'pt-section-sm' : 'py-section-sm'}>
        <Container className={cn('flex flex-col gap-5 md:gap-6', LIST_CONTAINER_CLASS)}>
          <Breadcrumbs items={breadcrumbs} />
          <div className="flex max-w-3xl flex-col gap-3">
            <h1 className="text-h1 text-foreground">{title}</h1>
            {description ? (
              <p className="text-base text-muted-foreground md:text-lg">{description}</p>
            ) : null}
          </div>
          {hasNav ? <ArticleCategoryNav items={nav} className="mt-1 md:mt-3" /> : null}
        </Container>
      </Section>

      <Section tone="light" spacing="none" className="pt-8 pb-section md:pt-12">
        <Container className={cn('flex flex-col gap-10 md:gap-12', LIST_CONTAINER_CLASS)}>
          {slice.items.length > 0 ? (
            <>
              <ArticleGrid
                articles={slice.items}
                headline={hasArticleHeadline(slice.page, slice.items.length)}
              />
              <div className="flex flex-col items-center gap-3">
                <Pagination
                  page={slice.page}
                  totalPages={slice.totalPages}
                  href={(page) => articlesPageHref(page, categorySlug)}
                />
                {isStaticPreview && slice.totalPages > 1 ? (
                  <p role="note" className="text-sm text-muted-foreground">
                    {zh.articles.list.previewNotice}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <ArticlesListEmpty />
          )}
        </Container>
      </Section>
    </>
  )
}
