/**
 * 「首页」（全局 home-page）的默认值。
 * 后台字段的 defaultValue 与前台数据层（src/lib/data/home.ts）的兜底共用这一份
 * （全局从未保存过、或某个区块从未保存过时，读取结果里没有默认值）。
 * 不引入任何依赖：数据层（服务端）与全局配置（payload.config，Next 运行时之外也会加载）都要用。
 * 文案须遵守广告法（无绝对化用语、无效果承诺），由 tests/unit/seed-data.test.ts 检查。
 */
export const HOME_PAGE_DEFAULTS = {
  hero: { autoplay: true, interval: 6, minInterval: 3 },
  sections: {
    quickEntries: { title: '快速了解', eyebrow: 'Start Here' },
    hotDisciplines: { title: '热门专业', eyebrow: 'Majors' },
    courses: { title: '精选课程', eyebrow: 'Courses' },
    featuredWorks: { title: '学员作品', eyebrow: 'Student Works' },
    stories: { title: '学员故事', eyebrow: 'Stories' },
    teachers: { title: '师资团队', eyebrow: 'Mentors' },
    campuses: { title: '校区分布', eyebrow: 'Campuses' },
    partners: { title: '合作企业', eyebrow: 'Partners' },
    articles: { title: '最新资讯', eyebrow: 'News' },
    leadForm: { title: '预约一节免费试听课', eyebrow: 'Free Trial' },
  },
  featuredWorks: { limit: 12, min: 4, max: 24 },
  articles: { limit: 6, min: 1, max: 12 },
  leadForm: { submitLabel: '立即预约' },
} as const

export type HomeSectionKey = keyof typeof HOME_PAGE_DEFAULTS.sections
