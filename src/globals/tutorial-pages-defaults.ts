/**
 * 「教程页面设置」（全局 tutorial-pages）的默认文案。
 * 后台字段的 defaultValue 与前台数据层的兜底共用这一份（全局从未保存过时，读取结果里没有默认值）。
 * 不引入任何依赖：数据层（服务端）与全局配置（payload.config，Next 运行时之外也会加载）都要用。
 * 文案须遵守广告法（无绝对化用语、无效果承诺），由 tests/unit/seed-data.test.ts 检查。
 */
export const TUTORIAL_PAGES_DEFAULTS = {
  list: {
    title: '免费教程',
    description:
      '各专业讲师录制的软件入门与技法讲解，按专业方向与难度筛选，点开就能看。部分教程留下联系方式后即可观看。',
  },
  gate: {
    title: '留下联系方式，解锁这节教程',
    description:
      '提交后即可观看本节教程，课程顾问会结合你的基础提供这个方向的学习建议。不想留联系方式，也可以先看其它免费教程。',
    submitLabel: '解锁观看',
  },
} as const
