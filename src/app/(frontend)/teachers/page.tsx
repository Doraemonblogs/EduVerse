import type { Metadata } from 'next'

import { Container } from '@/components/common/container'
import { FilterBar } from '@/components/common/filter-bar'
import { PageHeader } from '@/components/common/page-header'
import { Section } from '@/components/common/section'
import { TeacherCardGrid } from '@/components/course/teacher-card-grid'
import { TeacherListEmpty } from '@/components/teachers/teacher-list-empty'
import { isStaticPreview } from '@/config/site'
import { zh } from '@/i18n/zh'
import { getTeacherList, getTeacherPagesSettings } from '@/lib/data/teachers'
import { buildMetadata } from '@/lib/seo/metadata'
import { buildTeacherFilterRows, filterTeachers, parseTeacherFilters } from '@/lib/teachers/filters'
import { TEACHERS_PATH } from '@/lib/teachers/paths'

/**
 * 讲师列表 /teachers：全部已发布讲师（后台排序），按专业方向单选筛选（?discipline=slug）。
 * 筛选条件只存在于 URL（筛选项是普通链接，不需要客户端 JS）；读取 searchParams 使页面按请求渲染，
 * 讲师数据走 unstable_cache（后台保存后按标签失效），渲染时过滤。
 * 带筛选参数时 noindex, follow，规范地址始终是 /teachers（PRD §7）。
 */

type TeachersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const t = zh.teachers

/** 网格：移动端 1 列（头像 96px 在左）、sm 2 列、md 3 列、lg 4 列（版心 1280px） */
const AVATAR_SIZES =
  '(min-width: 1360px) 300px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, (min-width: 640px) 46vw, 96px'

/** 首屏头像：网格第一行（lg 4 列）立即加载，第一张通常是 LCP；其余懒加载 */
const PRIORITY_AVATARS = 4

export async function generateMetadata({ searchParams }: TeachersPageProps): Promise<Metadata> {
  const [{ list }, params] = await Promise.all([getTeacherPagesSettings(), searchParams])
  const metadata = await buildMetadata({
    seo: list.seo,
    title: list.title,
    description: list.description,
    path: TEACHERS_PATH,
  })
  const { hasFilterParams } = parseTeacherFilters(params)
  return hasFilterParams ? { ...metadata, robots: { index: false, follow: true } } : metadata
}

export default async function TeachersPage({ searchParams }: TeachersPageProps) {
  const [{ list }, { teachers, disciplines }, params] = await Promise.all([
    getTeacherPagesSettings(),
    getTeacherList(),
    searchParams,
  ])
  const { filters } = parseTeacherFilters(params)
  const results = filterTeachers(teachers, filters)

  return (
    <>
      <PageHeader
        title={list.title}
        description={list.description}
        breadcrumbs={[{ label: list.title, href: TEACHERS_PATH }]}
      />
      <Section tone="light" className="pt-8 md:pt-12">
        <Container className="flex flex-col gap-10 md:gap-12">
          {/* 还没有任何讲师时不显示筛选栏（只有“全部 0”） */}
          {teachers.length > 0 ? (
            <FilterBar
              label={t.filters.label}
              idPrefix="teacher-filter"
              rows={buildTeacherFilterRows(teachers, filters, disciplines)}
              resultCount={results.length}
              resultTemplate={t.filters.resultCount}
              optionCountTemplate={t.filters.optionCount}
              clearHref={filters.discipline !== undefined ? TEACHERS_PATH : null}
              notice={isStaticPreview ? t.filters.previewNotice : null}
            />
          ) : null}
          {results.length > 0 ? (
            // 页面没有区块标题：讲师姓名用 h2
            <TeacherCardGrid
              teachers={results}
              headingLevel="h2"
              imageSizes={AVATAR_SIZES}
              priorityCount={PRIORITY_AVATARS}
              className="gap-x-6 gap-y-8 md:grid-cols-3 md:gap-y-10 lg:grid-cols-4"
            />
          ) : (
            // 有讲师但当前条件下没有结果 → 可清除筛选；一位讲师都没有 → 只给专业课程
            <TeacherListEmpty filtered={teachers.length > 0} />
          )}
        </Container>
      </Section>
    </>
  )
}
