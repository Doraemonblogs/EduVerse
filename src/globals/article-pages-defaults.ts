/**
 * 「资讯页面设置」（全局 article-pages）的默认文案。
 * 后台字段的 defaultValue 与前台数据层的兜底共用这一份（全局从未保存过时，读取结果里没有默认值）。
 * 不引入任何依赖：数据层（服务端）与全局配置（payload.config，Next 运行时之外也会加载）都要用。
 * 文案须遵守广告法（无绝对化用语、无效果承诺），由 tests/unit/seed-data.test.ts 检查。
 */
export const ARTICLE_PAGES_DEFAULTS = {
  list: {
    title: '资讯',
    description:
      '学院新闻、行业观察、学习方法与报名常见问题。按分类浏览，了解数字艺术各方向的学习与求职信息。',
  },
  detail: {
    sidebarTitle: '预约免费试听',
    sidebarDescription:
      '读完还有疑问？留下联系方式，课程顾问会结合你的基础与时间，介绍合适的方向与课程安排。',
  },
} as const
