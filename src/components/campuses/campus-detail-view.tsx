import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

import { HorizontalScroller } from '@/components/common/horizontal-scroller'
import { CohortList } from '@/components/course/cohort-list'
import { CourseCard } from '@/components/course/course-card'
import { TeacherCardGrid } from '@/components/course/teacher-card-grid'
import type { LeadFormConfig } from '@/components/lead/types'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import type { CampusDetail, CampusPagesSettings } from '@/lib/campuses/types'
import { upcomingCohorts } from '@/lib/course/cohorts'
import { formatMessage } from '@/lib/course/format'
import { COURSES_PATH } from '@/lib/course/paths'
import { TEACHERS_PATH } from '@/lib/teachers/paths'

import { CampusCta } from './campus-cta'
import { CampusHero } from './campus-hero'
import { assignCampusSectionTones, campusSectionKeys, type CampusSectionKey } from './campus-layout'
import { CampusPhotos } from './campus-photos'
import { CampusSection } from './campus-section'

const t = zh.campuses.detail

/**
 * 课程封面宽度，与 HorizontalScroller size="card" 的每屏项数一致：
 * 移动端 1.15 张（≈ 85vw）、≥ sm 2.15 张（≈ 45vw）、≥ lg 3 列网格（版心 1280px，间距 24px → 410px）
 */
const COURSE_COVER_SIZES =
  '(min-width: 1360px) 410px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 85vw'

/** 留资位置标识：校区详情“近期开班”每行的“预约试听” */
export const CAMPUS_COHORT_POSITION = 'campus_cohort'

type CampusDetailViewProps = {
  campus: CampusDetail
  settings: CampusPagesSettings
  leadConfig: LeadFormConfig
  /** “近期开班”与课程卡片的当前时间（同一次渲染共用） */
  now: Date
}

/**
 * 校区详情页主体（服务端组件，不取数据）：
 * 首屏（深色：地址、交通、电话、开放时间、地图外链、预约到校参观）→ 校区环境（灯箱）→ 开设课程 →
 * 近期开班（只含本校区、按北京时间过滤掉已开班的）→ 本校区讲师 → 结尾行动号召（深色，页内表单）。
 * 没有内容的区块整块不渲染（近期开班除外，显示空状态）；中间的浅色区块白底 / 米色交替。
 */
export function CampusDetailView({ campus, settings, leadConfig, now }: CampusDetailViewProps) {
  const keys = campusSectionKeys(campus)
  const tones = assignCampusSectionTones(keys)
  const tone = (key: CampusSectionKey) => tones.get(key) ?? 'light'
  const cohorts = upcomingCohorts(campus.cohorts, now)

  return (
    <>
      <CampusHero campus={campus} settings={settings} />

      {keys.includes('photos') ? (
        <CampusSection
          id="campus-photos"
          tone={tone('photos')}
          title={t.sections.photos}
          description={formatMessage(t.photosSummary, { count: campus.photos.length })}
        >
          <CampusPhotos photos={campus.photos} campusName={campus.name} />
        </CampusSection>
      ) : null}

      {keys.includes('courses') ? (
        <CampusSection
          id="campus-courses"
          tone={tone('courses')}
          title={t.sections.courses}
          description={formatMessage(t.coursesSummary, { count: campus.courses.length })}
          actions={
            <Button asChild variant="link" className="min-h-11 text-sm md:text-base">
              <Link href={COURSES_PATH} prefetch={false}>
                {t.allCourses}
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
          }
        >
          {/* 移动端 / 平板横滑（课程卡片较高，竖排会把页面拉得很长），≥ lg 改为 3 列网格 */}
          <HorizontalScroller
            label={t.sections.courses}
            desktop="grid"
            columns={3}
            controls
            itemClassName="flex"
          >
            {campus.courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                now={now}
                imageSizes={COURSE_COVER_SIZES}
                className="w-full"
              />
            ))}
          </HorizontalScroller>
        </CampusSection>
      ) : null}

      <CampusSection
        id="campus-cohorts"
        tone={tone('cohorts')}
        title={t.sections.cohorts}
        description={cohorts.length > 0 ? t.cohortsSummary : undefined}
      >
        {/* 只有本校区的开班：每行显示课程名，不再链接校区（就是本页） */}
        <CohortList
          cohorts={cohorts}
          position={CAMPUS_COHORT_POSITION}
          linkCampus={false}
          emptyText={t.cohortsEmpty}
        />
      </CampusSection>

      {keys.includes('teachers') ? (
        <CampusSection
          id="campus-teachers"
          tone={tone('teachers')}
          title={t.sections.teachers}
          description={formatMessage(t.teachersSummary, { count: campus.teachers.length })}
          actions={
            <Button asChild variant="link" className="min-h-11 text-sm md:text-base">
              <Link href={TEACHERS_PATH} prefetch={false}>
                {t.allTeachers}
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
          }
        >
          <TeacherCardGrid teachers={campus.teachers} headingLevel="h3" />
        </CampusSection>
      ) : null}

      <CampusCta
        title={settings.detail.ctaTitle}
        description={settings.detail.ctaDescription}
        config={leadConfig}
      />
    </>
  )
}
