import type { SeedBanner } from '../types'

/** 轮播图（首页主视觉 3 张 + 就业服务页顶部 1 张），图片由种子脚本生成占位图 */
export const banners: SeedBanner[] = [
  {
    title: '新学期课程开放报名',
    subtitle:
      '八个专业方向，线下、线上与双师多种授课形式。先试听一节课，再决定适合自己的学习节奏。',
    ctaLabel: '查看课程',
    href: '/courses',
    placement: 'home_hero',
  },
  {
    title: '学员作品年展',
    subtitle: '来自八个专业方向的结业作品，记录从草图、白模到成片的每一步。',
    ctaLabel: '去看作品',
    href: '/works',
    placement: 'home_hero',
  },
  {
    title: '还没想好学什么？',
    subtitle: '用 10 道题梳理你的兴趣与习惯，获得一份专业方向参考。',
    ctaLabel: '开始测试',
    href: '/quiz',
    placement: 'home_hero',
  },
  {
    title: '从作品集到面试，陪你一起准备',
    subtitle: '简历与作品集指导、模拟面试、企业宣讲与双选会，帮助你更从容地走进行业。',
    ctaLabel: '看学员作品',
    href: '/works',
    placement: 'careers_hero',
  },
]
