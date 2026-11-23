import type { Metadata } from 'next'

import {
  SEARCH_PATH,
  searchNavigationKey,
  searchPageNoindex,
  searchPageTitle,
} from '@/components/search/search-page'
import { SearchView } from '@/components/search/search-view'
import { isStaticPreview } from '@/config/site'
import { zh } from '@/i18n/zh'
import { getSearchResults, getSearchSuggestions } from '@/lib/data/search'
import { parseSearchQuery } from '@/lib/search/query'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 站内搜索 /search?q=：关键词在服务端校验（parseSearchQuery：规范化后 1–50 个字），
 * 合法时查五类已发布内容（数据层 getSearchResults，只在单次请求内去重，不进入持久数据缓存——任意查询词会无限增加缓存文件），
 * 空白 / 超长时不查库，只显示搜索框、提示与热门入口。读取 searchParams 使页面按请求渲染。
 * 收录：带 q 参数时 noindex, follow；canonical 一律为 /search；标题“搜索：{关键词}”套用站点标题模板。
 * 静态预览站只导出空搜索页，并在搜索框下方说明搜索需要服务器。
 */

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams
  const metadata = await buildMetadata({
    title: searchPageTitle(parseSearchQuery(params)),
    description: zh.search.page.description,
    path: SEARCH_PATH,
  })
  return searchPageNoindex(params)
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const parsed = parseSearchQuery(params)
  const [results, suggestions] = await Promise.all([
    parsed.status === 'ok' ? getSearchResults(parsed.query) : null,
    getSearchSuggestions(),
  ])

  return (
    <SearchView
      parsed={parsed}
      navigationKey={searchNavigationKey(params)}
      results={results}
      suggestions={suggestions}
      preview={isStaticPreview}
    />
  )
}
