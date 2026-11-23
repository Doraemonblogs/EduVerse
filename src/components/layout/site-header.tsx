'use client'

import { ChevronDownIcon, PhoneIcon, SearchIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NavigationMenu } from 'radix-ui'
import { useEffect, useState } from 'react'

import { LeadCTA } from '@/components/lead/lead-cta'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import type { CampusCity, MegaMenuGroup } from '@/lib/data/site'
import { cn } from '@/lib/utils'

import { Logo } from './logo'
import { MobileNav } from './mobile-nav'

export type NavItem = { label: string; type: 'link' | 'course_menu'; href?: string | null }

export type HeaderProps = {
  brand: { name: string; shortName?: string | null; logo?: unknown }
  items: NavItem[]
  ctaLabel: string
  showSearch: boolean
  hotline: string | null
  groups: MegaMenuGroup[]
  campuses: CampusCity[]
}

const t = zh.layout

/** 当前路径是否属于该导航项（首页只精确匹配） */
function isActive(pathname: string, href?: string | null): boolean {
  if (!href) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * 站点头部：吸顶。桌面端（≥1024）横向导航 + “专业课程”大菜单；移动端为 Logo + 搜索 + 菜单抽屉。
 * 导航内容全部来自后台「导航」配置；大菜单按专业方向列出已发布课程。
 * 导航链接关闭预取：菜单链接多，逐个预取会浪费移动端流量。
 */
export function SiteHeader({
  brand,
  items,
  ctaLabel,
  showSearch,
  hotline,
  groups,
  campuses,
}: HeaderProps) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const courseMenuActive = pathname.startsWith('/courses') || pathname.startsWith('/majors')

  return (
    <header
      className={cn(
        'surface-light sticky top-0 z-40 border-b border-border transition-shadow duration-200',
        scrolled && 'shadow-sm',
      )}
    >
      <div className="container-site flex h-14 items-center gap-4 lg:h-16 lg:gap-8">
        <Logo
          brandName={brand.name}
          shortName={brand.shortName}
          logo={brand.logo}
          loading="eager"
        />

        <NavigationMenu.Root aria-label={t.mainNav} delayDuration={60} className="hidden lg:block">
          <NavigationMenu.List className="flex items-center">
            {items.map((item) =>
              item.type === 'course_menu' ? (
                <NavigationMenu.Item key={item.label}>
                  <NavigationMenu.Trigger
                    className={cn(
                      // 保留全局 :focus-visible 描边（不要 outline-none）：当前位于课程页时文字本来就是强调色，
                      // 只靠变色无法分辨焦点。描边向内收，避免吸顶头部贴着视口顶端时上沿被裁掉
                      'group flex h-16 cursor-pointer items-center gap-1 px-3 text-[15px] font-medium transition-colors focus-visible:-outline-offset-2',
                      'hover:text-emphasis focus-visible:text-emphasis data-[state=open]:text-emphasis',
                      courseMenuActive && 'text-emphasis',
                    )}
                  >
                    {item.label}
                    <ChevronDownIcon
                      aria-hidden
                      className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    />
                  </NavigationMenu.Trigger>
                  <NavigationMenu.Content>
                    <MegaMenuPanel groups={groups} />
                  </NavigationMenu.Content>
                </NavigationMenu.Item>
              ) : item.href ? (
                <NavigationMenu.Item key={item.label}>
                  <NavigationMenu.Link asChild active={isActive(pathname, item.href)}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      className={cn(
                        'flex h-16 items-center px-3 text-[15px] font-medium transition-colors focus-visible:-outline-offset-2',
                        'hover:text-emphasis data-[active]:text-emphasis',
                      )}
                    >
                      {item.label}
                    </Link>
                  </NavigationMenu.Link>
                </NavigationMenu.Item>
              ) : null,
            )}
          </NavigationMenu.List>

          {/* 大菜单浮层：铺满头部宽度，位于头部下方 */}
          <div className="absolute inset-x-0 top-full">
            <NavigationMenu.Viewport className="surface-light h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden border-b border-border bg-background shadow-md data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
          </div>
        </NavigationMenu.Root>

        <div className="ml-auto flex items-center gap-1 lg:gap-3">
          {showSearch ? (
            <Button asChild variant="ghost" size="icon">
              <Link href="/search" prefetch={false} aria-label={t.search}>
                <SearchIcon className="size-5" aria-hidden />
              </Link>
            </Button>
          ) : null}
          {hotline ? (
            <a
              href={`tel:${hotline.replace(/[^\d+]/g, '')}`}
              className="hidden items-center gap-2 text-sm font-medium xl:flex"
            >
              <PhoneIcon className="size-4 text-muted-foreground" aria-hidden />
              <span className="numeric">{hotline}</span>
            </a>
          ) : null}
          <LeadCTA position="header_cta" intent="trial" size="sm" className="hidden lg:inline-flex">
            {ctaLabel}
          </LeadCTA>
          <MobileNav
            className="lg:hidden"
            items={items}
            groups={groups}
            campuses={campuses}
            hotline={hotline}
            ctaLabel={ctaLabel}
          />
        </div>
      </div>
    </header>
  )
}

function MegaMenuPanel({ groups }: { groups: MegaMenuGroup[] }) {
  return (
    <div className="flex flex-col">
      <div className="container-site grid grid-cols-4 gap-x-10 gap-y-8 py-8">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-3">
            <NavigationMenu.Link asChild>
              <Link
                href={`/majors/${group.slug}`}
                prefetch={false}
                className="group/major flex flex-col gap-0.5"
              >
                <span className="font-semibold text-foreground transition-colors group-hover/major:text-emphasis">
                  {group.name}
                </span>
                {group.tagline ? (
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {group.tagline}
                  </span>
                ) : null}
              </Link>
            </NavigationMenu.Link>
            <ul className="flex flex-col gap-1.5 border-l border-border pl-3">
              {group.courses.map((course) => (
                <li key={course.slug}>
                  <NavigationMenu.Link asChild>
                    <Link
                      href={`/courses/${course.slug}`}
                      prefetch={false}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {course.title}
                    </Link>
                  </NavigationMenu.Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-site flex items-center justify-between py-4 text-sm">
          <NavigationMenu.Link asChild>
            <Link
              href="/courses"
              prefetch={false}
              className="font-medium text-emphasis hover:underline"
            >
              {t.allCourses} →
            </Link>
          </NavigationMenu.Link>
          <NavigationMenu.Link asChild>
            <Link
              href="/quiz"
              prefetch={false}
              className="text-muted-foreground hover:text-foreground"
            >
              {t.quizHint} →
            </Link>
          </NavigationMenu.Link>
        </div>
      </div>
    </div>
  )
}
