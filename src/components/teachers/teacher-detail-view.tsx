import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

import { Container } from '@/components/common/container'
import { RichText } from '@/components/common/rich-text'
import { Section } from '@/components/common/section'
import { CourseCard } from '@/components/course/course-card'
import { shiftRichTextHeadings } from '@/components/course/major/rich-text-headings'
import { WorkThumbGrid } from '@/components/course/work-thumb-grid'
import type { LeadFormConfig } from '@/components/lead/types'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import type { TeacherDetail, TeacherPagesSettings } from '@/lib/teachers/types'
import { cn } from '@/lib/utils'
import { WORKS_PATH } from '@/lib/works/paths'

import { TeacherCta } from './teacher-cta'
import { TeacherExperienceList } from './teacher-experience'
import { TeacherHero } from './teacher-hero'
import {
  assignTeacherSectionTones,
  isRichTextFilled,
  TEACHER_WORKS_LIMIT,
  teacherSectionKeys,
  type TeacherSectionKey,
} from './teacher-layout'
import { TeacherSection } from './teacher-section'

const t = zh.teachers.detail

/** 个人简介正文图片：桌面端左栏约 7/12 版心 */
const BIO_IMAGE_SIZES = '(min-width: 1360px) 736px, (min-width: 1024px) 56vw, 100vw'

type TeacherDetailViewProps = {
  teacher: TeacherDetail
  settings: TeacherPagesSettings
  leadConfig: LeadFormConfig
  /** 课程卡片“近期开班”的当前时间（同一次渲染共用） */
  now: Date
}

/**
 * 讲师详情页 /teachers/[slug]：
 * 首屏（深色）→ 个人简介 + 从业经历（并排）→ 授课课程 → 学员作品（深色）→ 结尾行动号召（深色）。
 * 没有内容的区块整块不渲染；浅色区块白底 / 米色交替。
 */
export function TeacherDetailView({ teacher, settings, leadConfig, now }: TeacherDetailViewProps) {
  const bio = isRichTextFilled(teacher.bio) ? teacher.bio : null
  const works = teacher.works.slice(0, TEACHER_WORKS_LIMIT)
  const keys = teacherSectionKeys(teacher)
  const tones = assignTeacherSectionTones(keys)
  const tone = (key: TeacherSectionKey) => tones.get(key) ?? 'light'
  const lastKey = keys.at(-1)
  const hasBoth = bio !== null && teacher.experience.length > 0

  return (
    <>
      <TeacherHero teacher={teacher} teachersLabel={settings.list.title} />

      {keys.includes('profile') ? (
        <Section as="div" tone={tone('profile')}>
          <Container
            className={cn(
              'grid gap-12 md:gap-16',
              hasBoth && 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 xl:gap-24',
            )}
          >
            {bio ? (
              <TeacherSection id="teacher-bio" title={t.sections.bio}>
                {/* 区块标题是 h2：正文里的小标题整体降到 h3 起 */}
                <RichText
                  data={shiftRichTextHeadings(bio)}
                  imageSizes={BIO_IMAGE_SIZES}
                  className="max-w-(--container-prose)"
                />
              </TeacherSection>
            ) : null}
            {teacher.experience.length > 0 ? (
              <TeacherSection id="teacher-experience" title={t.sections.experience}>
                <TeacherExperienceList items={teacher.experience} />
              </TeacherSection>
            ) : null}
          </Container>
        </Section>
      ) : null}

      {keys.includes('courses') ? (
        <TeacherSection
          id="teacher-courses"
          tone={tone('courses')}
          title={t.sections.courses}
          description={formatMessage(t.coursesSummary, { count: teacher.courses.length })}
        >
          <ul role="list" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {teacher.courses.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} now={now} />
              </li>
            ))}
          </ul>
        </TeacherSection>
      ) : null}

      {keys.includes('works') ? (
        <TeacherSection
          id="teacher-works"
          tone={tone('works')}
          title={t.sections.works}
          description={t.worksNote}
          actions={
            <Button asChild variant="link" className="min-h-11 text-sm md:text-base">
              <Link href={WORKS_PATH} prefetch={false}>
                {t.allWorks}
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
          }
        >
          <WorkThumbGrid works={works} />
        </TeacherSection>
      ) : null}

      <TeacherCta
        title={settings.detail.ctaTitle}
        description={settings.detail.ctaDescription}
        disciplineId={teacher.disciplines[0]?.id}
        config={leadConfig}
        separated={lastKey !== undefined && tone(lastKey) === 'dark'}
      />
    </>
  )
}
