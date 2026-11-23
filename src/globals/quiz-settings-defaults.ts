/**
 * 「职业测试设置」（全局 quiz-settings）的默认文案。
 * 后台字段的 defaultValue 与前台数据层的兜底共用这一份（全局从未保存过时，读取结果里没有默认值）。
 * 不引入任何依赖：数据层（服务端）与全局配置（payload.config，Next 运行时之外也会加载）都要用。
 * 文案须遵守广告法（无绝对化用语、无效果承诺），由 tests/unit/seed-data.test.ts 检查。
 */
export const QUIZ_SETTINGS_DEFAULTS = {
  intro: {
    title: '找到适合你的数字艺术方向',
    description: '10 道选择题，约 2 分钟。根据你的兴趣与习惯，看看哪个数字艺术方向和你更合拍。',
    startLabel: '开始测试',
  },
  result: {
    summaryTitle: '你的推荐方向',
    gatedTitle: '获取完整报告',
    gatedDescription: '完整报告包含各方向的匹配度排序、推荐方向的课程与下一步建议。',
    unlockLabel: '留下联系方式查看完整报告',
    reportTitle: '你的完整报告',
    disclaimer:
      '测试结果根据你的选择计算，仅供了解方向时参考。是否适合，还需要结合试听体验与自身情况判断。',
    nextStepsTitle: '下一步建议',
    nextSteps: [
      {
        title: '看看这个方向的学员作品',
        description: '从课程作业到毕业作品，了解这个方向的同学在课程里做出了什么。',
      },
      {
        title: '预约一节试听课',
        description: '到校区或在线听一节正在进行的课，感受上课节奏与学习强度。',
      },
      {
        title: '和课程顾问聊聊学习安排',
        description: '结合你的基础与空闲时间，梳理一条可执行的学习路径，再决定是否报名。',
      },
    ],
  },
} as const
