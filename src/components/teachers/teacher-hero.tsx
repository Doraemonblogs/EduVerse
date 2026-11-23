import Image from 'next/image'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { LeadCTA } from '@/components/lead/lead-cta'
import { zh } from '@/i18n/zh'
import { campusLabel, formatMessage, LIST_SEPARATOR } from '@/lib/course/format'
import { majorPath } from '@/lib/course/paths'
import { TEACHERS_PATH, teacherPath } from '@/lib/teachers/paths'
import type { TeacherDetail } from '@/lib/teachers/types'
import { cn } from '@/lib/utils'

const t = zh.teachers.detail

/** 头像：移动端 96px、平板 128px（在姓名左侧），桌面端左栏 320 / 384px */
const AVATAR_SIZES =
  '(min-width: 1280px) 384px, (min-width: 1024px) 320px, (min-width: 640px) 128px, 96px'

export const TEACHER_TITLE_ID = 'teacher-title'

type TeacherHeroProps = {
  teacher: TeacherDetail
  /** 面包屑第二级（讲师列表页）的名称，与列表页标题一致 */
  teachersLabel: string
}

type Fact = { label: string; value: React.ReactNode; className?: string; numeric?: boolean }

/**
 * 讲师详情首屏（深色区块）：面包屑、头像（唯一的高优先级图片）、姓名（h1）、头衔，
 * 概况 <dl>（从业年限、所在校区（不链接）、专业方向（链接到专业方向页）、擅长领域标签）
 * 与“预约试听”（position=teacher_hero，带第一个专业方向）。
 * 移动端头像缩小放在姓名左侧，概况与按钮通栏；桌面端头像占左栏。
 */
export function TeacherHero({ teacher, teachersLabel }: TeacherHeroProps) {
  const avatar = teacher.avatar
  const facts = teacherFacts(teacher)
  const disciplineId = teacher.disciplines[0]?.id

  return (
    <Section tone="dark" spacing="sm" aria-labelledby={TEACHER_TITLE_ID}>
      <Container className="flex flex-col gap-8 md:gap-10">
        <Breadcrumbs
          items={[
            { label: teachersLabel, href: TEACHERS_PATH },
            { label: teacher.name, href: teacherPath(teacher.slug) },
          ]}
        />

        <div
          className={cn(
            'grid gap-y-8',
            avatar &&
              'grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-12 xl:grid-cols-[24rem_minmax(0,1fr)] xl:gap-x-16',
          )}
        >
          {avatar ? (
            <div className="aspect-square overflow-hidden rounded-md bg-muted lg:row-span-2">
              <Image
                src={avatar.src}
                alt={avatar.alt || teacher.name}
                width={avatar.width}
                height={avatar.height}
                sizes={AVATAR_SIZES}
                preload
                className="size-full object-cover"
              />
            </div>
          ) : null}

          <div className="flex min-w-0 flex-col gap-2 md:gap-3">
            <h1 id={TEACHER_TITLE_ID} className="text-h1 text-foreground">
              {teacher.name}
            </h1>
            {teacher.title ? (
              <p className="text-base text-muted-foreground sm:text-lg md:text-xl">
                {teacher.title}
              </p>
            ) : null}
          </div>

          <div
            className={cn(
              'flex min-w-0 flex-col gap-4',
              avatar && 'col-span-2 lg:col-span-1 lg:col-start-2',
            )}
          >
            {facts.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 sm:gap-x-8">
                {facts.map((fact) => (
                  <div
                    key={fact.label}
                    className={cn(
                      'flex min-w-0 flex-col gap-1 border-t border-border py-4',
                      fact.className,
                    )}
                  >
                    <dt className="text-sm text-muted-foreground">{fact.label}</dt>
                    <dd
                      className={cn(
                        'font-semibold break-keep text-foreground wrap-break-word',
                        fact.numeric && 'numeric',
                      )}
                    >
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div>
              <LeadCTA
                position="teacher_hero"
                intent="trial"
                disciplineId={disciplineId}
                size="lg"
                className="w-full sm:w-auto"
              >
                {t.trial}
              </LeadCTA>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}

/**
 * 首屏概况：短项（从业年限、所在校区、专业方向）在前，擅长领域（标签，较长）独占一行。
 * 没有数据的项不显示。专业方向是行内链接：伪元素把点击区域上下各扩 10px（补足 44px 高），
 * 链接本身与焦点描边仍贴合文字，与其它项对齐。
 */
function teacherFacts(teacher: TeacherDetail): Fact[] {
  const facts: Fact[] = []
  if (teacher.yearsOfExperience !== null) {
    facts.push({
      label: t.facts.years,
      value: formatMessage(t.yearsValue, { years: teacher.yearsOfExperience }),
      numeric: true,
    })
  }
  if (teacher.campus) {
    facts.push({ label: t.facts.campus, value: campusLabel(teacher.campus) })
  }
  if (teacher.disciplines.length > 0) {
    facts.push({
      label: t.facts.disciplines,
      value: (
        // 行内排列：各专业方向之间的“/”后可换行（“/”前是不换行空格），名称本身不断行
        <ul role="list">
          {teacher.disciplines.map((discipline, index) => (
            <li key={discipline.id} className="inline">
              <Link
                href={majorPath(discipline.slug)}
                prefetch={false}
                className="relative inline-block rounded-sm whitespace-nowrap underline decoration-muted-foreground underline-offset-4 transition-colors before:absolute before:inset-x-0 before:-inset-y-2.5 hover:decoration-foreground"
              >
                {discipline.name}
              </Link>
              {index < teacher.disciplines.length - 1 ? (
                <span aria-hidden>{LIST_SEPARATOR}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ),
      className: 'col-span-2 sm:col-span-1',
    })
  }
  if (teacher.specialties.length > 0) {
    facts.push({
      label: t.facts.specialties,
      value: (
        <ul role="list" className="flex flex-wrap gap-2 pt-1">
          {teacher.specialties.map((specialty) => (
            <li
              key={specialty}
              className="rounded-sm border border-border px-3 py-1 text-sm font-normal"
            >
              {specialty}
            </li>
          ))}
        </ul>
      ),
      className: 'col-span-full',
    })
  }
  return facts
}
