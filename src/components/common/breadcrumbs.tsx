import { ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'

import { zh } from '@/i18n/zh'
import { breadcrumbListJsonLd, JsonLd, type BreadcrumbItem } from '@/lib/seo/json-ld'

type BreadcrumbsProps = {
  /** 首页之后的各级（最后一项为当前页）；首页由组件自动加在最前 */
  items: BreadcrumbItem[]
  /** 同时输出 BreadcrumbList 结构化数据，默认开启 */
  jsonLd?: boolean
  className?: string
}

/** 面包屑：语义化有序列表，当前页不可点击并标注 aria-current；附带 BreadcrumbList JSON-LD */
export function Breadcrumbs({ items, jsonLd = true, className }: BreadcrumbsProps) {
  const trail: BreadcrumbItem[] = [{ label: zh.breadcrumbs.home, href: '/' }, ...items]
  const lastIndex = trail.length - 1

  return (
    <>
      <nav aria-label={zh.breadcrumbs.label} className={className}>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
          {trail.map((item, index) => {
            const current = index === lastIndex
            return (
              <li key={`${index}-${item.href}`} className="flex min-w-0 items-center gap-1.5">
                {current ? (
                  <span aria-current="page" className="text-foreground">
                    {item.label}
                  </span>
                ) : (
                  <>
                    <Link
                      href={item.href}
                      prefetch={false}
                      className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {item.label}
                    </Link>
                    <ChevronRightIcon aria-hidden className="size-3.5 shrink-0" />
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      {jsonLd ? <JsonLd data={breadcrumbListJsonLd(trail)} /> : null}
    </>
  )
}
