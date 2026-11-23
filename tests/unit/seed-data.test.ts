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
import { bilibiliPlayerUrl, galleryCaptions, works } from '../../scripts/seed/data/works'
import { beijingDateTime } from '../../scripts/seed/dates'
import { ARTICLE_CATEGORIES, CAMPUSES, COURSES, DISCIPLINES } from '../../scripts/seed/registry'
import { buildGlobals } from '../../scripts/seed/site'

import { ARTICLE_PAGES_DEFAULTS } from '@/globals/article-pages-defaults'
import { CAMPUS_PAGES_DEFAULTS } from '@/globals/campus-pages-defaults'
import { CAREERS_PAGE_DEFAULTS } from '@/globals/careers-page-defaults'
import { formatEventDateTime } from '@/lib/careers/mappers'
import { COURSE_PAGES_DEFAULTS } from '@/globals/course-pages-defaults'
import { HOME_PAGE_DEFAULTS } from '@/globals/home-page-defaults'
import { TEACHER_PAGES_DEFAULTS } from '@/globals/teacher-pages-defaults'
import { WORK_PAGES_DEFAULTS } from '@/globals/work-pages-defaults'
import { SLUG_PATTERN } from '@/lib/slugify'
import { isAllowedVideoEmbedUrl } from '@/lib/works/video'

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

  it('作品页面设置与师资页面设置写入了列表与详情行动号召的文案', () => {
    const globals = buildGlobals({ wechatQr: 1, hotDisciplines: [] })
    for (const settings of [globals['work-pages'], globals['teacher-pages']]) {
      expect(settings?.list?.title).toBeTruthy()
      expect(settings?.list?.description).toBeTruthy()
      expect(settings?.list?.seo?.title).toBeTruthy()
      expect(settings?.list?.seo?.description).toBeTruthy()
      expect(settings?.detail?.ctaTitle).toBeTruthy()
      expect(settings?.detail?.ctaDescription).toBeTruthy()
    }
  })

  it('资讯页面设置写入了列表与详情侧栏的文案，校区页面设置写入了列表与行动号召的文案', () => {
    const globals = buildGlobals({ wechatQr: 1, hotDisciplines: [] })
    const articlePages = globals['article-pages']
    expect(articlePages?.list?.title).toBeTruthy()
    expect(articlePages?.list?.description).toBeTruthy()
    expect(articlePages?.list?.seo?.title).toBeTruthy()
    expect(articlePages?.list?.seo?.description).toBeTruthy()
    expect(articlePages?.detail?.sidebarTitle).toBeTruthy()
    expect(articlePages?.detail?.sidebarDescription).toBeTruthy()

    const campusPages = globals['campus-pages']
    expect(campusPages?.list?.title).toBeTruthy()
    expect(campusPages?.list?.description).toBeTruthy()
    expect(campusPages?.list?.seo?.title).toBeTruthy()
    expect(campusPages?.list?.seo?.description).toBeTruthy()
    expect(campusPages?.detail?.ctaTitle).toBeTruthy()
    expect(campusPages?.detail?.ctaDescription).toBeTruthy()
  })

  it('就业服务页写入了介绍、流程、行动号召与 SEO 文案', () => {
    const careers = buildGlobals({ wechatQr: 1, hotDisciplines: [] })['careers-page']
    expect(careers?.intro?.title).toBeTruthy()
    expect(careers?.intro?.description).toBeTruthy()
    expect(careers?.process?.steps?.length).toBeGreaterThanOrEqual(3)
    expect(careers?.cta?.title).toBeTruthy()
    expect(careers?.cta?.description).toBeTruthy()
    expect(careers?.seo?.title).toBeTruthy()
    expect(careers?.seo?.description).toBeTruthy()
  })

  it('就业服务页（含默认值）不出现就业率、薪资等结果性表述', () => {
    const careers = JSON.stringify({
      seed: buildGlobals({ wechatQr: 1, hotDisciplines: [] })['careers-page'],
      defaults: CAREERS_PAGE_DEFAULTS,
      careerEvents,
    })
    for (const word of ['就业率', '入职率', '薪资', '月薪', '年薪', '保证', '承诺', '推荐就业']) {
      expect(careers.includes(word), word).toBe(false)
    }
  })

  it('有今天以后的招聘活动（就业服务页近期活动），也有已举办的活动（页面不显示）', () => {
    expect(careerEvents.some((event) => event.daysFromNow >= 0)).toBe(true)
    expect(careerEvents.some((event) => event.daysFromNow < 0)).toBe(true)
  })

  it('招聘活动的开始时间是北京时间 9:00–20:00 之间的整点或半点（页面会显示钟点）', () => {
    for (const event of careerEvents) {
      expect(event.time, event.title).toMatch(/^(?:(?:09|1\d):(?:00|30)|20:00)$/)
    }
  })

  it('资讯分类都写入了描述（分类页 h1 下的简介与 meta description），且互不相同', () => {
    const descriptions = ARTICLE_CATEGORIES.map((category) => category.description.trim())
    for (const [i, description] of descriptions.entries()) {
      expect(description.length, ARTICLE_CATEGORIES[i]!.slug).toBeGreaterThanOrEqual(20)
    }
    expect(unique(descriptions)).toBe(true)
  })

  it('首页：每个区块都写入了标题，精选课程区块不指定课程（走自动规则）', () => {
    const home = buildGlobals({ wechatQr: 1, hotDisciplines: [] })['home-page']
    const sections = [
      home?.quickEntries,
      home?.hotDisciplines,
      home?.courses,
      home?.featuredWorks,
      home?.stories,
      home?.teachers,
      home?.campuses,
      home?.partners,
      home?.articles,
      home?.leadForm,
    ]
    for (const section of sections) {
      expect(section?.enabled).toBe(true)
      expect(section?.title).toBeTruthy()
    }
    expect(home?.courses?.description).toBeTruthy()
    expect(home?.courses?.courses ?? []).toEqual([])
    expect(home?.quickEntries?.items?.length).toBe(4)
  })

  it('首页主视觉至少有 2 张轮播图（种子写入时全部启用、不设时间窗，始终可见）', () => {
    const hero = banners.filter((b) => b.placement === 'home_hero')
    expect(hero.length).toBeGreaterThanOrEqual(2)
    for (const banner of hero) {
      expect(banner.title).toBeTruthy()
      expect(banner.ctaLabel).toBeTruthy()
      // 不设投放时间窗（启用状态由种子脚本统一写入 active: true）
      expect(Object.keys(banner)).not.toContain('startAt')
      expect(Object.keys(banner)).not.toContain('endAt')
    }
  })

  it('有精选学员故事可供首页自动取用（种子写入时均已发布、已确认授权）', () => {
    expect(stories.filter((s) => s.featured).length).toBeGreaterThanOrEqual(3)
  })

  it('教程视频号格式合法', () => {
    for (const t of tutorials) expect(t.videoId).toMatch(/^BV[0-9A-Za-z]{10}$/)
  })

  it('有 2 件作品带外部播放器视频：占位 BV 号格式合法、不重复，播放器地址在白名单内', () => {
    const bvids = works.flatMap((w) => (w.videoBvid ? [w.videoBvid] : []))
    expect(bvids).toHaveLength(2)
    expect(unique(bvids)).toBe(true)
    // 不与免费教程的占位视频号重复
    for (const bvid of bvids) {
      expect(bvid).toMatch(/^BV[0-9A-Za-z]{10}$/)
      expect(tutorials.map((t) => t.videoId)).not.toContain(bvid)
      const url = bilibiliPlayerUrl(bvid)
      expect(url).toBe(`https://player.bilibili.com/player.html?bvid=${bvid}`)
      expect(isAllowedVideoEmbedUrl(url)).toBe(true)
    }
  })

  it('至少 3 件作品有 3 张以上的作品图集（灯箱翻页），图集说明不为空', () => {
    expect(works.filter((w) => galleryCaptions(w).length >= 3).length).toBeGreaterThanOrEqual(3)
    for (const w of works) {
      for (const caption of galleryCaptions(w)) expect(caption.trim(), w.title).toBeTruthy()
    }
  })
})

describe('种子日期：北京时间的钟点（beijingDateTime）', () => {
  // 2026-11-23 23:35（北京时间）执行种子
  const lateNight = new Date('2026-11-23T15:35:00Z')

  it('按北京时间的“今天 + N 天”落在指定钟点，不带入执行种子时的钟点', () => {
    const date = beijingDateTime(7, '19:00', lateNight)
    expect(date).toBe('2026-11-30T11:00:00.000Z')
    expect(formatEventDateTime(date)).toBe('2026年11月30日 19:00')
    expect(formatEventDateTime(beijingDateTime(-30, '14:00', lateNight))).toBe(
      '2026年10月24日 14:00',
    )
  })

  it('UTC 16:00 之后执行时北京已是第二天，“今天”按北京时间计算；跨月、跨年正确进位', () => {
    // UTC 11 月 23 日 17:00 = 北京时间 11 月 24 日 01:00
    const afterMidnight = new Date('2026-11-23T17:00:00Z')
    expect(beijingDateTime(0, '14:00', afterMidnight)).toBe('2026-11-24T06:00:00.000Z')
    expect(formatEventDateTime(beijingDateTime(45, '14:00', lateNight))).toBe('2027年1月7日 14:00')
    // 北京时间 08:00 前的钟点换算到 UTC 是前一天
    expect(beijingDateTime(1, '07:30', lateNight)).toBe('2026-11-23T23:30:00.000Z')
  })

  it('钟点格式不对时报错，避免写入错误的活动时间', () => {
    for (const time of ['9:00', '24:00', '14:60', '1400', '']) {
      expect(() => beijingDateTime(1, time, lateNight), time).toThrow()
    }
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
    articleCategories: ARTICLE_CATEGORIES,
    faqs,
    tutorials,
    quizQuestions,
    banners,
    campusDetails,
    pages,
    globals: buildGlobals({ wechatQr: 1, hotDisciplines: [] }),
    // 后台字段默认值（全局从未保存时前台也会显示）
    coursePagesDefaults: COURSE_PAGES_DEFAULTS,
    homePageDefaults: HOME_PAGE_DEFAULTS,
    workPagesDefaults: WORK_PAGES_DEFAULTS,
    teacherPagesDefaults: TEACHER_PAGES_DEFAULTS,
    articlePagesDefaults: ARTICLE_PAGES_DEFAULTS,
    campusPagesDefaults: CAMPUS_PAGES_DEFAULTS,
    careersPageDefaults: CAREERS_PAGE_DEFAULTS,
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
