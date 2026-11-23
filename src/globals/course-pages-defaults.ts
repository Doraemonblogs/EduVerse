/**
 * 「课程页面设置」（全局 course-pages）的默认文案。
 * 后台字段的 defaultValue 与前台数据层的兜底共用这一份（全局从未保存过时，读取结果里没有默认值）。
 * 不引入任何依赖：数据层（服务端）与集合配置（payload.config，Next 运行时之外也会加载）都要用。
 * 文案须遵守广告法（无绝对化用语、无效果承诺），由 tests/unit/seed-data.test.ts 检查。
 */
export const COURSE_PAGES_DEFAULTS = {
  list: {
    title: '专业课程',
    description:
      '按专业方向、班型、授课方式与城市筛选课程，每门课程都列出了学习路线、开设校区与近期开班，方便对比后再预约试听。',
  },
  detail: {
    sidebarTitle: '预约免费试听',
    sidebarDescription: '留下联系方式，课程顾问会结合你的基础与时间，安排就近校区或线上试听。',
  },
  major: {
    ctaTitle: '不确定这个方向适不适合你？',
    ctaDescription:
      '先听一节课，或请课程顾问根据你的基础和目标，梳理一条可执行的学习路径，再决定要不要报名。',
  },
} as const
