/**
 * 「作品页面设置」（全局 work-pages）的默认文案。
 * 后台字段的 defaultValue 与前台数据层的兜底共用这一份（全局从未保存过时，读取结果里没有默认值）。
 * 不引入任何依赖：数据层（服务端）与全局配置（payload.config，Next 运行时之外也会加载）都要用。
 * 文案须遵守广告法（无绝对化用语、无效果承诺），由 tests/unit/seed-data.test.ts 检查。
 */
export const WORK_PAGES_DEFAULTS = {
  list: {
    title: '学员作品',
    description:
      '这里的作品来自各专业的在读与毕业学员，均已取得学员授权展示。可以按专业方向与使用软件筛选，看看课程里做出来的东西。',
  },
  detail: {
    ctaTitle: '想做出这样的作品？',
    ctaDescription: '预约一节试听课，了解这件作品所在课程的学习安排，再判断这个方向是否适合你。',
  },
} as const
