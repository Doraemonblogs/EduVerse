/**
 * 站点级兜底配置。
 * 运营可改的内容（品牌名、电话、备案号等）以后台「站点设置」为准（M1 起）；
 * 这里只在后台尚未填写时兜底，以及提供与部署环境相关的配置。
 */
export const siteFallback = {
  name: 'EduVerse 数艺学院',
  shortName: 'EduVerse',
  description:
    'EduVerse 数艺学院：数字艺术与设计职业教育，提供 3D、动画、游戏美术、UI/UX 等方向的系统课程。',
  locale: 'zh_CN',
  themeColor: '#0b0c0f',
} as const

/**
 * 是否为静态预览站构建（GitHub Pages）。
 * 预览站只用于查看页面效果：页面全部 noindex，表单提交与后台不可用，页顶显示提示条。
 */
export const isStaticPreview = process.env.NEXT_PUBLIC_STATIC_PREVIEW === 'true'

/** 站点对外访问地址（无末尾斜杠），用于 canonical、sitemap、Open Graph */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return url.replace(/\/+$/, '')
}
