/**
 * 「校区页面设置」（全局 campus-pages）的默认文案。
 * 后台字段的 defaultValue 与前台数据层的兜底共用这一份（全局从未保存过时，读取结果里没有默认值）。
 * 不引入任何依赖：数据层（服务端）与全局配置（payload.config，Next 运行时之外也会加载）都要用。
 * 文案须遵守广告法（无绝对化用语、无效果承诺），由 tests/unit/seed-data.test.ts 检查。
 */
export const CAMPUS_PAGES_DEFAULTS = {
  list: {
    title: '校区分布',
    description:
      '各校区均设有教室、机房与作品评图区，开放时间内可预约到校参观、试听。查看校区地址、交通与开设课程。',
  },
  detail: {
    ctaTitle: '预约到校参观',
    ctaDescription:
      '留下联系方式，课程顾问会与你确认到访时间，安排参观教室与机房，并旁听一节正在进行的课程。',
  },
} as const
