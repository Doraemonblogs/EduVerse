import { describe, expect, it } from 'vitest'

import { articles } from '../../scripts/seed/data/articles'
import { banners } from '../../scripts/seed/data/banners'
import { campusDetails } from '../../scripts/seed/data/campuses'
import { careerEvents } from '../../scripts/seed/data/career-events'
import { courses } from '../../scripts/seed/data/courses'
import { disciplines } from '../../scripts/seed/data/disciplines'
import { faqs } from '../../scripts/seed/data/faqs'
import { pages } from '../../scripts/seed/data/pages'
import { partners } from '../../scripts/seed/data/partners'
import { quizQuestions } from '../../scripts/seed/data/quiz'
import { stories } from '../../scripts/seed/data/stories'
import { teachers } from '../../scripts/seed/data/teachers'
import { tutorials } from '../../scripts/seed/data/tutorials'
import { works } from '../../scripts/seed/data/works'
import { CAMPUSES, COURSES, DISCIPLINES } from '../../scripts/seed/registry'
import { buildGlobals } from '../../scripts/seed/site'

import { COURSE_PAGES_DEFAULTS } from '@/globals/course-pages-defaults'
import { SLUG_PATTERN } from '@/lib/slugify'

const unique = (values: string[]) => new Set(values).size === values.length

describe('种子数据数量（PRD §8）', () => {
  it.each([
    ['专业方向', disciplines.length, 8],
    ['课程', courses.length, 24],
    ['学员作品', works.length, 60],
    ['讲师', teachers.length, 12],
    ['校区', campusDetails.length, 6],
    ['文章', articles.length, 30],
    ['合作企业', partners.length, 20],
    ['测试题', quizQuestions.length, 10],
  ])('%s：%i 条（要求 %i）', (_label, actual, expected) => {
    expect(actual).toBe(expected)
  })
})

describe('种子数据完整性', () => {
  it('骨架中的每个专业方向、课程、校区都有且只有一份详情', () => {
    expect(disciplines.map((d) => d.slug).sort()).toEqual(DISCIPLINES.map((d) => d.slug).sort())
    expect(courses.map((c) => c.slug).sort()).toEqual(COURSES.map((c) => c.slug).sort())
    expect(campusDetails.map((c) => c.slug).sort()).toEqual(CAMPUSES.map((c) => c.slug).sort())
  })

  it('slug 唯一且格式合法', () => {
    for (const list of [
      teachers.map((t) => t.slug),
      articles.map((a) => a.slug),
      tutorials.map((t) => t.slug),
    ]) {
      expect(unique(list)).toBe(true)
      for (const slug of list) expect(slug).toMatch(SLUG_PATTERN)
    }
  })

  it('纯线上课程不挂校区，线下 / 双师课程至少有一个校区', () => {
    for (const course of COURSES) {
      const detail = courses.find((c) => c.slug === course.slug)!
      const online = course.modes.every((m) => m === 'online')
      expect(detail.campuses.length === 0, course.slug).toBe(online)
    }
  })

  it('每门课程都有讲师，每个专业方向都有讲师', () => {
    for (const course of COURSES) {
      expect(
        teachers.some((t) => t.courses.includes(course.slug)),
        course.slug,
      ).toBe(true)
    }
    for (const d of DISCIPLINES) {
      expect(
        teachers.some((t) => t.disciplines.includes(d.slug)),
        d.slug,
      ).toBe(true)
    }
  })

  it('作品的专业方向与所属课程一致，每门课程至少 2 件作品', () => {
    for (const work of works) {
      const course = COURSES.find((c) => c.slug === work.course)!
      expect(work.discipline, work.title).toBe(course.discipline)
    }
    for (const course of COURSES) {
      expect(
        works.filter((w) => w.course === course.slug).length,
        course.slug,
      ).toBeGreaterThanOrEqual(2)
    }
  })

  it('学员故事关联的作品存在且属于同一课程，关联的合作企业存在', () => {
    for (const story of stories) {
      for (const index of story.workIndexes) {
        expect(works[index]?.course, story.displayName).toBe(story.course)
      }
      if (story.partnerName) {
        expect(
          partners.some((p) => p.name === story.partnerName),
          story.partnerName,
        ).toBe(true)
      }
    }
  })

  it('职业测试的每个专业方向都能得分', () => {
    const reachable = new Set(
      quizQuestions.flatMap((q) => q.options.flatMap((o) => o.scores.map((s) => s.discipline))),
    )
    expect([...reachable].sort()).toEqual(DISCIPLINES.map((d) => d.slug).sort())
  })

  it('页面包含关于、联系、隐私政策、用户协议', () => {
    expect(pages.map((p) => p.slug).sort()).toEqual(['about', 'contact', 'privacy', 'terms'])
  })

  it('校区地址明确标注为示例，避免与真实地址重合', () => {
    for (const c of campusDetails) expect(c.address, c.slug).toContain('示例')
  })

  it('课程页面设置写入了列表、详情侧栏与专业页行动号召的文案', () => {
    const coursePages = buildGlobals({ wechatQr: 1, hotDisciplines: [] })['course-pages']
    expect(coursePages?.list?.title).toBeTruthy()
    expect(coursePages?.list?.description).toBeTruthy()
    expect(coursePages?.list?.seo?.title).toBeTruthy()
    expect(coursePages?.detail?.sidebarTitle).toBeTruthy()
    expect(coursePages?.major?.ctaTitle).toBeTruthy()
  })

  it('教程视频号格式合法', () => {
    for (const t of tutorials) expect(t.videoId).toMatch(/^BV[0-9A-Za-z]{10}$/)
  })
})

describe('合规（广告法）', () => {
  const corpus = JSON.stringify({
    disciplines,
    courses,
    works,
    teachers,
    stories,
    partners,
    careerEvents,
    articles,
    faqs,
    tutorials,
    quizQuestions,
    banners,
    campusDetails,
    pages,
    globals: buildGlobals({ wechatQr: 1, hotDisciplines: [] }),
    // 后台字段默认值（全局从未保存时前台也会显示）
    coursePagesDefaults: COURSE_PAGES_DEFAULTS,
  })

  it.each([
    '最好',
    '最佳',
    '第一',
    '顶级',
    '唯一',
    '首选',
    '国家级',
    '全网',
    '最强',
    '极致',
    '100%',
    '包就业',
    '保就业',
    '保证就业',
    '保证高薪',
    '签约就业',
    '毕业即高薪',
  ])('不包含绝对化用语或效果承诺：%s', (word) => {
    expect(corpus.includes(word)).toBe(false)
  })

  it('所有薪资参考都标明了来源与统计时间', () => {
    const refs = [
      ...disciplines.map((d) => d.salaryRef),
      ...courses.flatMap((c) => (c.salaryRef ? [c.salaryRef] : [])),
    ]
    expect(refs.length).toBeGreaterThan(0)
    for (const ref of refs) {
      expect(ref.source).toBeTruthy()
      expect(ref.statDate).toBeTruthy()
    }
  })
})
