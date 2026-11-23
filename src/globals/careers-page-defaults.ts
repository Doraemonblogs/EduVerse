/**
 * 「就业服务页」（全局 careers-page）的默认文案。
 * 后台字段的 defaultValue 与前台数据层的兜底共用这一份（全局从未保存过时，读取结果里没有默认值）。
 * 不引入任何依赖：数据层（服务端）与全局配置（payload.config，Next 运行时之外也会加载）都要用。
 * 文案须遵守广告法（无就业率、无效果承诺，只描述学院提供的服务），由 tests/unit/seed-data.test.ts 检查。
 * 各区块的标题 / 眉标与 M1 起的后台默认值一致（改动会改变数据库列默认值，需要迁移）。
 */
export const CAREERS_PAGE_DEFAULTS = {
  intro: {
    eyebrow: 'Career Services',
    title: '就业服务',
  },
  sections: {
    process: { title: '就业服务流程', eyebrow: 'Process' },
    stories: { title: '学员故事', eyebrow: 'Stories' },
    partners: { title: '合作企业', eyebrow: 'Partners' },
    events: { title: '招聘活动', eyebrow: 'Events' },
  },
  cta: {
    title: '预约一次就业咨询',
    description:
      '留下联系方式，课程顾问会结合你的作品与目标岗位，介绍作品集指导、模拟面试等服务的安排。录用由企业自主决定。',
  },
} as const
