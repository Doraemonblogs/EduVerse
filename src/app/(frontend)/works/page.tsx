import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Container } from '@/components/common/container'
import { FilterBar } from '@/components/common/filter-bar'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { Section } from '@/components/common/section'
import { WorksListEmpty } from '@/components/works/list/works-list-empty'
import {
  pagedTitle,
  worksListIndexing,
  worksResultTemplate,
} from '@/components/works/list/works-list'
import { WorkMasonry } from '@/components/works/work-masonry'
import { isStaticPreview } from '@/config/site'
import { zh } from '@/i18n/zh'
import { getWorkList, getWorkPagesSettings } from '@/lib/data/works'
import { paginate } from '@/lib/pagination'
import type { SearchParamsInput } from '@/lib/search-params'
import { buildMetadata } from '@/lib/seo/metadata'
import {
  buildWorkFilterRows,
  filterWorks,
  hasActiveWorkFilters,
  parseWorkFilters,
  WORKS_PER_PAGE,
  workListHref,
} from '@/lib/works/filters'
import { WORKS_PATH } from '@/lib/works/paths'

/**
 * 学员作品列表 /works：瀑布流 + 三个维度单选筛选（专业方向 / 软件 / 只看精选）+ 分页（每页 24 件）。
 * 筛选与页码只存在于 URL（筛选项、页码都是普通链接，不需要客户端 JS）；读取 searchParams 使页面按请求渲染，
 * 作品数据走 unstable_cache（后台保存后按标签失效），不同筛选组合共用一份缓存，渲染时过滤与分页。
 * 收录规则见 worksListIndexing：带筛选参数 noindex, follow（canonical /works）；无筛选的第 N 页可收录
 * （canonical /works?page=N）；页码超出总页数 → 404（没有作品时只有第 1 页，显示空状态）。
 */

type WorksPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const t = zh.works

/** 解析参数、过滤、分页；页码超出总页数时 notFound()（generateMetadata 与页面共用，数据来自同一份缓存） */
async function loadWorksPage(searchParamsPromise: Promise<SearchParamsInput>) {
  const [{ works, facets }, searchParams] = await Promise.all([getWorkList(), searchParamsPromise])
  const { filters, page, hasFilterParams } = parseWorkFilters(searchParams)
  const results = filterWorks(works, filters)
  const slice = paginate(results, page, WORKS_PER_PAGE)
  if (slice.outOfRange) notFound()
  return { works, facets, filters, hasFilterParams, results, slice }
}

export async function generateMetadata({ searchParams }: WorksPageProps): Promise<Metadata> {
  const [{ list }, { hasFilterParams, slice }] = await Promise.all([
    getWorkPagesSettings(),
    loadWorksPage(searchParams),
  ])
  const { path, noindex, titlePage } = worksListIndexing({ hasFilterParams, page: slice.page })
  // 后台填写的 SEO 标题是完整标题（不套模板），同样加上页码
  const seo = list.seo?.title
    ? { ...list.seo, title: pagedTitle(list.seo.title, titlePage) }
    : list.seo
  const metadata = await buildMetadata({
    seo,
    title: pagedTitle(list.title, titlePage),
    description: list.description,
    path,
    page: titlePage ?? undefined,
  })
  return noindex ? { ...metadata, robots: { index: false, follow: true } } : metadata
}

export default async function WorksPage({ searchParams }: WorksPageProps) {
  const [{ list }, { works, facets, filters, results, slice }] = await Promise.all([
    getWorkPagesSettings(),
    loadWorksPage(searchParams),
  ])
  const hasActive = hasActiveWorkFilters(filters)

  return (
    <>
      <PageHeader
        title={list.title}
        description={list.description}
        breadcrumbs={[{ label: list.title, href: WORKS_PATH }]}
      />
      <Section tone="light" className="pt-8 md:pt-12">
        <Container className="flex flex-col gap-10 md:gap-12">
          {/* 还没有任何作品时不显示筛选栏（每行只有“全部 0”） */}
          {works.length > 0 ? (
            <FilterBar
              label={t.filters.label}
              idPrefix="work-filter"
              rows={buildWorkFilterRows(works, filters, facets)}
              resultCount={results.length}
              resultTemplate={worksResultTemplate(slice.page, slice.totalPages)}
              optionCountTemplate={t.filters.optionCount}
              clearHref={hasActive ? WORKS_PATH : null}
              notice={isStaticPreview ? t.filters.previewNotice : null}
            />
          ) : null}
          {slice.items.length > 0 ? (
            <div className="flex flex-col gap-6 md:gap-8">
              {/* 页面没有区块标题：作品名用 h2；只有左上角第一张是首屏大概率可见的图 */}
              <WorkMasonry works={slice.items} headingLevel="h2" priorityCount={1} />
              <Pagination
                page={slice.page}
                totalPages={slice.totalPages}
                href={(page) => workListHref(filters, page)}
              />
            </div>
          ) : (
            // 有作品但当前条件下没有结果 → 可清除筛选；一件作品都没有 → 只给预约试听
            <WorksListEmpty filtered={works.length > 0} />
          )}
        </Container>
      </Section>
    </>
  )
}
