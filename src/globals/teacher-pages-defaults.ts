/**
 * 「师资页面设置」（全局 teacher-pages）的默认文案。
 * 后台字段的 defaultValue 与前台数据层的兜底共用这一份（全局从未保存过时，读取结果里没有默认值）。
 * 不引入任何依赖：数据层（服务端）与全局配置（payload.config，Next 运行时之外也会加载）都要用。
 * 文案须遵守广告法（无绝对化用语、无效果承诺），由 tests/unit/seed-data.test.ts 检查。
 */
export const TEACHER_PAGES_DEFAULTS = {
  list: {
    title: '师资团队',
    description:
      '讲师来自动画、游戏、影视与设计行业一线，按专业方向分工授课。可以按方向查看讲师的从业经历与授课课程。',
  },
  detail: {
    ctaTitle: '想听这位讲师的课？',
    ctaDescription: '留下联系方式，课程顾问会帮你查询这位讲师近期的授课安排，并预约一节试听课。',
  },
} as const
