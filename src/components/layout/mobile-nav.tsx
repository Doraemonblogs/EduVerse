'use client'

import { ChevronRightIcon, MenuIcon, PhoneIcon } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'

import { useLeadDialog } from '@/components/lead/lead-dialog'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { zh } from '@/i18n/zh'
import type { CampusCity, MegaMenuGroup } from '@/lib/data/site'
import { cn } from '@/lib/utils'

import type { NavItem } from './site-header'

const t = zh.layout

/**
 * 移动端菜单抽屉：菜单即导购——按专业方向分组列出课程，其后是校区、其它栏目与咨询入口。
 * 点击任意链接后关闭抽屉。
 */
export function MobileNav({
  items,
  groups,
  campuses,
  hotline,
  ctaLabel,
  className,
}: {
  items: NavItem[]
  groups: MegaMenuGroup[]
  campuses: CampusCity[]
  hotline: string | null
  ctaLabel: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { open: openLead } = useLeadDialog()
  const close = () => setOpen(false)
  const otherItems = items.filter((item) => item.type === 'link' && item.href && item.href !== '/')

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          aria-label={t.openMenu}
          className={className}
        >
          <MenuIcon className="size-6" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent closeLabel={t.closeMenu} className="max-w-none sm:max-w-md">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <SheetTitle className="text-h4">{t.menuTitle}</SheetTitle>
        </div>
        <SheetDescription className="sr-only">
          {t.courses}、{t.campuses}
        </SheetDescription>

        <nav
          aria-label={t.mainNav}
          className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-6"
        >
          <section aria-labelledby="mobile-nav-courses" className="flex flex-col gap-5">
            <h2 id="mobile-nav-courses" className="eyebrow text-muted-foreground">
              {t.courses}
            </h2>
            {groups.map((group) => (
              <div key={group.id} className="flex flex-col gap-2.5">
                <Link
                  href={`/majors/${group.slug}`}
                  prefetch={false}
                  onClick={close}
                  className="flex items-center justify-between border-l-2 border-foreground pl-2.5 font-semibold"
                >
                  {group.name}
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                </Link>
                <ul className="grid grid-cols-2 gap-2">
                  {group.courses.map((course) => (
                    <li key={course.slug}>
                      <Link
                        href={`/courses/${course.slug}`}
                        prefetch={false}
                        onClick={close}
                        className="flex h-full min-h-11 items-center rounded-sm bg-muted px-3 py-2 text-sm leading-snug transition-colors hover:bg-accent"
                      >
                        {course.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Link
              href="/courses"
              prefetch={false}
              onClick={close}
              className="text-sm font-medium text-emphasis"
            >
              {t.allCourses} →
            </Link>
          </section>

          {campuses.length > 0 ? (
            <section aria-labelledby="mobile-nav-campuses" className="flex flex-col gap-3">
              <h2 id="mobile-nav-campuses" className="eyebrow text-muted-foreground">
                {t.campuses}
              </h2>
              <ul className="grid grid-cols-3 gap-2">
                {campuses.map((campus) => (
                  <li key={campus.slug}>
                    <Link
                      href={`/campuses/${campus.slug}`}
                      prefetch={false}
                      onClick={close}
                      className="flex min-h-11 items-center justify-center rounded-sm border border-border px-2 text-center text-sm"
                    >
                      {campus.name.replace(/校区$/, '')}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {otherItems.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2">
              {otherItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href!}
                    prefetch={false}
                    onClick={close}
                    className="flex min-h-12 items-center justify-between rounded-sm bg-secondary px-4 font-medium text-secondary-foreground"
                  >
                    {item.label}
                    <ChevronRightIcon className="size-4 opacity-70" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>

        <div className="flex shrink-0 gap-3 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {hotline ? (
            <Button asChild variant="outline" className="flex-1">
              <a href={`tel:${hotline.replace(/[^\d+]/g, '')}`}>
                <PhoneIcon aria-hidden />
                <span className="numeric">{hotline}</span>
              </a>
            </Button>
          ) : null}
          <Button
            type="button"
            className={cn('flex-1')}
            aria-haspopup="dialog"
            onClick={() => {
              close()
              // 抽屉关闭后这个按钮会被卸载：留资弹窗关闭时把焦点交还给菜单按钮
              openLead(
                { position: 'mobile_menu', intent: 'trial' },
                { returnFocus: triggerRef.current },
              )
            }}
          >
            {ctaLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
