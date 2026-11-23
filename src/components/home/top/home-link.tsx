import Link from 'next/link'
import type * as React from 'react'

import { zh } from '@/i18n/zh'
import type { HomeLink } from '@/lib/home/types'

type HomeLinkAnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  link: HomeLink
}

/**
 * 后台填写的链接（HomeLink，已经过 safeHref 校验）：
 * - 站内路径 / 锚点 / mailto: / tel: → next/link（prefetch={false}，自动带 basePath）；
 * - http(s) 外链 → 新窗口打开（rel="noopener noreferrer"），并给读屏补充“在新窗口打开”。
 * 其余属性（className、aria-*、Button asChild 合并进来的 data-*）原样传给 <a>。
 */
export function HomeLinkAnchor({ link, children, ...props }: HomeLinkAnchorProps) {
  if (link.external) {
    return (
      <a {...props} href={link.href} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="sr-only">{zh.home.top.opensInNewTab}</span>
      </a>
    )
  }
  return (
    <Link {...props} href={link.href} prefetch={false}>
      {children}
    </Link>
  )
}
