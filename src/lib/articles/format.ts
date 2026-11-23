import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'

import type { ArticleCategoryItem } from './types'

/**
 * 资讯的展示工具（纯函数，服务端与客户端组件都能用；不引入数据层映射，客户端包保持精简）。
 */

/** 阅读量：不是有限的非负数时按 0；小数取整（数据库列是 numeric） */
export function normalizeViews(value: number | string | null | undefined): number {
  const number = typeof value === 'string' ? Number(value) : value
  return typeof number === 'number' && Number.isFinite(number) && number > 0
    ? Math.floor(number)
    : 0
}

/**
 * 阅读量的展示：不足 1 万显示整数（“863”），1 万起以“万”为单位保留 1 位小数（“1.2万”，整数时“3万”）。
 * 非法值按 0 处理。
 */
export function formatArticleViews(views: number): string {
  const count = normalizeViews(views)
  if (count < 10_000) return String(count)
  const tenThousands = Math.floor(count / 1_000) / 10
  return `${Number.isInteger(tenThousands) ? tenThousands : tenThousands.toFixed(1)}万`
}

/** “1.2万 次阅读”（zh.articles.card.views） */
export function articleViewsLabel(views: number): string {
  return formatMessage(zh.articles.card.views, { count: formatArticleViews(views) })
}

/**
 * 分类页的简介（h1 下的说明，也是 meta description）：后台填写的分类描述；
 * 未填写（或只有空白）时用含分类名与文章数的模板（zh.articles.list.categoryDescription），
 * 各分类页的描述互不相同，不会都退回资讯列表的简介。
 */
export function articleCategoryDescription(
  category: Pick<ArticleCategoryItem, 'name' | 'description' | 'count'>,
): string {
  return (
    category.description?.trim() ||
    formatMessage(zh.articles.list.categoryDescription, {
      name: category.name,
      count: category.count,
    })
  )
}
