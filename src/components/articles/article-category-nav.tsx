import Link from 'next/link'

import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { cn } from '@/lib/utils'

import type { ArticleCategoryNavItem } from './articles-list'
import { RevealCurrentCategory } from './reveal-current-category'

const t = zh.articles.list

type ArticleCategoryNavProps = {
  items: ArticleCategoryNavItem[]
  className?: string
}

/**
 * 资讯分类导航（服务端组件）：“全部”+ 各分类，都是链接到第 1 页的普通链接（分类页是可收录的落地页，
 * 不加 nofollow；不预取）。当前项 aria-current="page"，以加深文字 + 底部粗线区分（不只靠颜色）。
 * 样式与首页“最新资讯”的分类 Tab 一致；放在页面标题区底部，下划线压在标题区的下边缘上。
 * 移动端横向滚动并伸到视口边缘（scroller-bleed），当前项不在可见范围时自动滚到它。
 * 桌面端（lg 起）右侧不出血：版心右侧给悬浮操作栏让了位（lg:avoid-floating-actions），
 * 分类多到需要横滑时，滚动区域也止于版心右缘，不伸到悬浮栏下面。
 */
export function ArticleCategoryNav({ items, className }: ArticleCategoryNavProps) {
  const current = items.find((item) => item.current)?.key ?? ''

  return (
    <nav aria-label={t.navLabel} className={className}>
      {/* 选项左右各有 0.5rem 内边距：第一项左移同样距离，文字与版心对齐。
          overflow 会裁掉外扩的焦点描边，描边画在链接内侧 */}
      <ul
        role="list"
        className="flex scroller-bleed scrollbar-none gap-1 overflow-x-auto md:gap-3 lg:mr-0 lg:pr-0"
      >
        {items.map((item) => (
          <li key={item.key} className="shrink-0 first:-ms-2">
            <Link
              href={item.href}
              prefetch={false}
              aria-current={item.current ? 'page' : undefined}
              className={cn(
                // relative：读屏文字（sr-only，绝对定位）以链接为定位基准，留在横向滚动容器内，不撑宽页面
                'relative inline-flex min-h-12 items-center gap-1.5 rounded-xs px-2 text-base font-medium whitespace-nowrap transition-colors focus-visible:-outline-offset-2',
                'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-foreground after:transition-transform after:duration-200 motion-reduce:after:transition-none',
                item.current
                  ? 'text-foreground after:scale-x-100'
                  : 'text-muted-foreground after:scale-x-0 hover:text-foreground',
              )}
            >
              {item.label}
              <span aria-hidden className="numeric text-xs font-normal text-muted-foreground">
                {item.count}
              </span>
              <span className="sr-only">
                {formatMessage(t.categoryCount, { count: item.count })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <RevealCurrentCategory current={current} />
    </nav>
  )
}
