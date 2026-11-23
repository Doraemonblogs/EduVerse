import type { Metadata } from 'next'

import { PageHeader } from '@/components/common/page-header'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { CourseFilterBar } from '@/components/course/list/course-filter-bar'
import { CourseGroups } from '@/components/course/list/course-groups'
import { CourseListEmpty } from '@/components/course/list/course-list-empty'
import { groupCoursesByDiscipline } from '@/components/course/list/group-courses'
import { getSiteUrl, isStaticPreview } from '@/config/site'
import { filterCourses, parseCourseFilters } from '@/lib/course/filters'
import { courseItemListJsonLd } from '@/lib/course/json-ld'
import { COURSES_PATH } from '@/lib/course/paths'
import { getCourseCards, getCoursePagesSettings } from '@/lib/data/courses'
import { JsonLd } from '@/lib/seo/json-ld'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 课程列表 /courses：全部已发布课程按专业方向分组，四个维度单选筛选（专业方向 / 班型 / 授课方式 / 城市）。
 * 筛选条件只存在于 URL（筛选项是普通链接，不需要客户端 JS）；读取 searchParams 使页面按请求渲染，
 * 课程数据走 unstable_cache（后台保存后按标签失效）。
 * 带任何筛选参数时 noindex, follow，规范地址始终是 /courses（PRD §7）。
 */

type CoursesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: CoursesPageProps): Promise<Metadata> {
  const [{ list }, params] = await Promise.all([getCoursePagesSettings(), searchParams])
  const metadata = await buildMetadata({
    seo: list.seo,
    title: list.title,
    description: list.description,
    path: COURSES_PATH,
  })
  const { hasParams } = parseCourseFilters(params)
  return hasParams ? { ...metadata, robots: { index: false, follow: true } } : metadata
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const [{ list }, cards, params] = await Promise.all([
    getCoursePagesSettings(),
    getCourseCards(),
    searchParams,
  ])
  const { filters, hasParams } = parseCourseFilters(params)
  const results = filterCourses(cards, filters)
  const groups = groupCoursesByDiscipline(results)
  // 近期开班按渲染时间过滤（缓存里是全部未结束的开班）
  const now = new Date()
  // 课程清单结构化数据只在规范地址（无筛选参数）输出
  const itemList = hasParams ? null : courseItemListJsonLd(results, getSiteUrl())

  return (
    <>
      <PageHeader
        title={list.title}
        description={list.description}
        breadcrumbs={[{ label: list.title, href: COURSES_PATH }]}
      />
      <Section tone="light" className="pt-8 md:pt-12">
        <Container className="flex flex-col gap-12 md:gap-16">
          <CourseFilterBar
            cards={cards}
            filters={filters}
            resultCount={results.length}
            previewNotice={isStaticPreview}
          />
          {groups.length > 0 ? <CourseGroups groups={groups} now={now} /> : <CourseListEmpty />}
        </Container>
      </Section>
      {itemList ? <JsonLd data={itemList} /> : null}
    </>
  )
}
