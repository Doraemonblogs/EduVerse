/**
 * 系统级界面文案（表单校验、分页、空状态、无障碍提示等）。
 * 营销与运营文案（标题、按钮文案、导航、区块介绍）一律来自 CMS，不写在这里。
 */
export const zh = {
  a11y: {
    skipToContent: '跳到主要内容',
  },
  notFound: {
    eyebrow: '404',
    title: '页面不存在或已下线',
    description: '你访问的链接可能已失效。可以回到首页，或通过导航查找专业与课程。',
    backHome: '返回首页',
  },
  error: {
    eyebrow: '出错了',
    title: '页面加载失败',
    description: '服务暂时不可用，请稍后重试。如果问题持续存在，请联系我们。',
    retry: '重新加载',
    backHome: '返回首页',
  },
} as const

export type Dictionary = typeof zh
