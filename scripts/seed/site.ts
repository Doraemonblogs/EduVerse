/**
 * 全局配置、演示账号与演示线索（种子数据）。
 */
import type { DataFromGlobalSlug, GlobalSlug, RequiredDataFromCollectionSlug } from 'payload'

import {
  CAMPUSES,
  DISCIPLINES,
  type CampusSlug,
  type CourseSlug,
  type DisciplineSlug,
} from './registry'

type GlobalData<S extends GlobalSlug> = Partial<
  Omit<DataFromGlobalSlug<S>, 'id' | 'createdAt' | 'updatedAt'>
>

export type SeedGlobals = { [S in GlobalSlug]?: GlobalData<S> }

const BRAND = 'EduVerse 数艺学院'

export function buildGlobals(refs: { wechatQr: number; hotDisciplines: number[] }): SeedGlobals {
  const majorLinks = DISCIPLINES.slice(0, 5).map((d) => ({
    label: d.name,
    href: `/majors/${d.slug}`,
  }))

  return {
    'site-settings': {
      brandName: BRAND,
      shortName: 'EduVerse',
      brandDescription:
        'EduVerse 数艺学院是一所面向数字艺术与设计方向的职业教育机构（演示站点，机构与内容均为虚构），开设三维动画、游戏美术、影视后期、UI/UX 等专业课程。',
      hotline: '400-000-0000',
      workHours: '9:00–21:00（节假日正常服务）',
      email: 'hello@eduverse.example',
      wechatId: 'eduverse_demo',
      wechatQr: refs.wechatQr,
      address: '北京市海淀区（示例地址）',
      icp: { number: '京ICP备00000000号-1（示例）', link: 'https://beian.miit.gov.cn/' },
      psb: { number: '京公网安备 11010800000000号（示例）', code: '11010800000000' },
      titleTemplate: `%s - ${BRAND}`,
      defaultSeo: {
        title: `${BRAND}｜数字艺术与设计职业教育`,
        description:
          'EduVerse 数艺学院提供三维动画、游戏美术、影视后期、UI/UX、原画、平面、动态设计、室内可视化等方向的系统课程，线下校区与线上直播可选，支持免费预约试听。',
        keywords: '数字艺术培训,三维动画培训,游戏美术培训,UI设计培训,影视后期培训',
      },
      salaryDisclaimer:
        '以上薪资数据仅供参考，不作为培训效果承诺。实际收入因个人能力、所在城市与企业而异。',
      showStories: true,
      privacyPolicyVersion: '2026-11-20',
    },
    navigation: {
      items: [
        { label: '首页', type: 'link', href: '/' },
        { label: '专业课程', type: 'course_menu' },
        { label: '学员作品', type: 'link', href: '/works' },
        { label: '就业服务', type: 'link', href: '/careers' },
        { label: '师资', type: 'link', href: '/teachers' },
        { label: '校区', type: 'link', href: '/campuses' },
        { label: '资讯', type: 'link', href: '/articles' },
        { label: '关于我们', type: 'link', href: '/about' },
      ],
      cta: { label: '预约试听' },
      showSearch: true,
    },
    footer: {
      cta: {
        enabled: true,
        title: '先来听一节课，再决定学什么',
        description: '课程顾问会根据你的基础和时间，安排就近校区或线上试听，并提供学习路线建议。',
        buttonLabel: '免费预约试听',
      },
      columns: [
        { title: '专业课程', links: [...majorLinks, { label: '全部课程', href: '/courses' }] },
        {
          title: '了解我们',
          links: [
            { label: '关于我们', href: '/about' },
            { label: '师资团队', href: '/teachers' },
            { label: '校区分布', href: '/campuses' },
            { label: '就业服务', href: '/careers' },
          ],
        },
        {
          title: '学习资源',
          links: [
            { label: '学员作品', href: '/works' },
            { label: '免费教程', href: '/tutorials' },
            { label: '职业测试', href: '/quiz' },
            { label: '资讯', href: '/articles' },
          ],
        },
      ],
      qrcodes: [{ label: '添加课程顾问微信', image: refs.wechatQr }],
      bottomLinks: [
        { label: '隐私政策', href: '/privacy' },
        { label: '用户协议', href: '/terms' },
        { label: '联系我们', href: '/contact' },
      ],
      copyright: `© {year} ${BRAND}（演示站点，机构与内容均为虚构）`,
    },
    'home-page': {
      hero: { autoplay: true, interval: 6 },
      quickEntries: {
        enabled: true,
        eyebrow: 'Start Here',
        title: '从这里开始',
        items: [
          {
            title: '职业方向测试',
            description: '10 道题，找到适合你的方向',
            action: 'link',
            href: '/quiz',
          },
          {
            title: '免费教程',
            description: '先跟着做一个小练习',
            action: 'link',
            href: '/tutorials',
          },
          {
            title: '学员作品',
            description: '看看学员都做出了什么',
            action: 'link',
            href: '/works',
          },
          { title: '预约试听', description: '到校区或线上听一节课', action: 'lead' },
        ],
      },
      hotDisciplines: {
        enabled: true,
        eyebrow: 'Majors',
        title: '热门专业',
        description: '每个方向都从基础讲起，按阶段完成作品。',
        disciplines: refs.hotDisciplines,
      },
      // 指定课程留空：前台自动取每个专业方向的长期就业班（src/lib/home/rules.ts）
      courses: {
        enabled: true,
        eyebrow: 'Courses',
        title: '长期就业班',
        description:
          '每个方向一门系统课程，从软件基础到项目实训分阶段推进。先看学习路线，再预约一节试听课。',
      },
      featuredWorks: {
        enabled: true,
        eyebrow: 'Student Works',
        title: '学员作品',
        description: '作品来自各专业在读与毕业学员，已取得学员授权展示。',
        mode: 'auto',
        limit: 12,
      },
      stories: {
        enabled: true,
        eyebrow: 'Stories',
        title: '学员故事',
        description: '他们从不同的起点出发，把一段学习经历变成了新的工作方向。',
      },
      teachers: {
        enabled: true,
        eyebrow: 'Mentors',
        title: '师资团队',
        description: '讲师来自动画、游戏、影视与设计行业，按专业方向分工授课。',
      },
      campuses: {
        enabled: true,
        eyebrow: 'Campuses',
        title: '校区分布',
        description: '线下校区可到校试听，也可以选择线上直播课程。',
      },
      partners: {
        enabled: true,
        eyebrow: 'Partners',
        title: '合作企业',
        description: '与动画、游戏、影视、设计等领域的企业开展实训与招聘合作。',
      },
      articles: { enabled: true, eyebrow: 'News', title: '最新资讯', limit: 6 },
      leadForm: {
        enabled: true,
        eyebrow: 'Free Trial',
        title: '预约一节免费试听课',
        description: '留下联系方式，课程顾问会帮你安排就近校区或线上试听。',
        submitLabel: '立即预约',
      },
      seo: {
        title: `${BRAND}｜数字艺术与设计职业教育`,
        description:
          '三维动画、游戏美术、影视后期、UI/UX 等数字艺术方向的系统课程，作品驱动教学，线下校区与线上直播可选。',
        keywords: '数字艺术培训,三维动画培训,游戏美术培训,UI设计培训',
      },
    },
    'course-pages': {
      list: {
        title: '专业课程',
        description:
          '八个数字艺术方向，长期就业班与短期提升班可选，线下校区与线上直播都能上课。按方向、班型、授课方式与城市筛选，对比学习路线与近期开班后再预约试听。',
        seo: {
          title: `专业课程｜${BRAND}`,
          description:
            '三维动画、游戏美术、影视后期、UI/UX、原画、平面、动态设计、室内可视化等方向的长期就业班与短期提升班，查看学习路线、开设校区与近期开班。',
          keywords: '数字艺术课程,三维动画课程,游戏美术课程,UI设计课程,影视后期课程',
        },
      },
      detail: {
        sidebarTitle: '预约免费试听',
        sidebarDescription:
          '留下联系方式，课程顾问会结合你的基础与空闲时间，安排就近校区或线上试听，并介绍这门课的学习安排。',
      },
      major: {
        ctaTitle: '不确定这个方向适不适合你？',
        ctaDescription:
          '先来听一节课，或请课程顾问根据你的基础和目标，梳理一条可执行的学习路径，再决定是否报名。',
      },
    },
    'work-pages': {
      list: {
        title: '学员作品',
        description:
          '收录各专业在读与毕业学员的课程作业、阶段项目与毕业作品，全部取得学员授权后展示，署名为学员化名。可按专业方向、使用软件筛选，也可以只看精选。',
        seo: {
          title: `学员作品｜${BRAND}`,
          description:
            '三维动画、游戏美术、影视特效、UI/UX、原画、平面、动态设计、室内可视化等方向的学员作品，查看作品说明、所用软件与所学课程。',
          keywords: '学员作品,三维动画作品,游戏美术作品,UI设计作品,数字艺术作品集',
        },
      },
      detail: {
        ctaTitle: '想做出这样的作品？',
        ctaDescription:
          '预约一节试听课，课程顾问会介绍这件作品所在课程的学习路线与开班安排，帮你判断从哪里开始。',
      },
    },
    'teacher-pages': {
      list: {
        title: '师资团队',
        description:
          '讲师来自动画、游戏、影视与设计等行业，按专业方向分工授课。查看每位讲师的从业经历、擅长领域与授课课程。',
        seo: {
          title: `师资团队｜${BRAND}`,
          description:
            '了解各专业方向讲师的从业经历、擅长领域与授课课程，可预约讲师所授课程的免费试听。',
          keywords: '数字艺术讲师,三维动画讲师,游戏美术讲师,UI设计讲师',
        },
      },
      detail: {
        ctaTitle: '想先听一节这位讲师的课？',
        ctaDescription:
          '留下联系方式，课程顾问会查询这位讲师近期的授课安排，为你预约就近校区或线上试听。',
      },
    },
    'careers-page': {
      intro: {
        eyebrow: 'Career Services',
        title: '就业服务',
        description: '从作品集到面试，课程顾问与讲师陪你准备求职的每一步。',
      },
      process: {
        enabled: true,
        eyebrow: 'Process',
        title: '就业服务流程',
        steps: [
          { title: '作品集打磨', description: '讲师按目标岗位逐一点评，梳理作品顺序与排版。' },
          { title: '简历与投递策略', description: '根据作品方向确定岗位清单，修改简历与求职信。' },
          { title: '模拟面试', description: '还原常见的作品讲解与技术面试场景，给出改进建议。' },
          {
            title: '企业内推',
            description: '向合作企业推荐符合岗位要求的学员，录用由企业自主决定。',
          },
        ],
      },
      stories: { enabled: true, title: '学员故事' },
      partners: { enabled: true, title: '合作企业' },
      events: { enabled: true, title: '招聘活动' },
      seo: {
        title: `就业服务｜${BRAND}`,
        description: '作品集打磨、简历与面试准备、模拟面试、企业内推，帮助学员做好求职准备。',
      },
    },
    'quiz-settings': {
      intro: {
        title: '找到适合你的数字艺术方向',
        description: '10 道选择题，约 2 分钟。根据你的兴趣与习惯，推荐更合适的专业方向。',
        startLabel: '开始测试',
      },
      result: {
        summaryTitle: '你的推荐方向',
        gatedTitle: '获取完整报告',
        gatedDescription: '完整报告包含三个方向的匹配度、学习路径建议与对应课程。',
        unlockLabel: '留下联系方式查看完整报告',
      },
      seo: {
        title: `职业方向测试｜${BRAND}`,
        description: '10 道题帮你判断更适合三维动画、游戏美术、UI 设计还是其它数字艺术方向。',
      },
    },
    'lead-settings': {
      webhooks: [],
      rateLimits: {
        ipPer10Min: 5,
        ipPerDay: 30,
        phonePerDay: 3,
        duplicateWindowDays: 30,
        minFillSeconds: 2,
      },
      cityOptions: [...CAMPUSES.map((c) => ({ name: c.city })), { name: '其他城市' }].filter(
        (c, i, all) => all.findIndex((x) => x.name === c.name) === i,
      ),
      successTitle: '提交成功',
      successMessage: '课程顾问会在 1 个工作日内与你联系。你也可以添加微信，先领取课程资料。',
    },
  }
}

/** 演示账号：仅用于本地开发与预览，生产环境请勿使用 */
export const SEED_USER_DOMAIN = 'seed.eduverse.test'

type SeedUser = {
  key: string
  email: string
  password: string
  name: string
  role: 'admin' | 'editor' | 'consultant'
  campus?: CampusSlug
}

export const SEED_USERS: SeedUser[] = [
  {
    key: 'admin',
    email: `admin@${SEED_USER_DOMAIN}`,
    password: process.env.SEED_ADMIN_PASSWORD || 'EduVerse-Admin-2026',
    name: '演示管理员',
    role: 'admin',
  },
  {
    key: 'editor',
    email: `editor@${SEED_USER_DOMAIN}`,
    password: 'EduVerse-Editor-2026',
    name: '内容编辑 周',
    role: 'editor',
  },
  {
    key: 'consultant-bj',
    email: `consultant.bj@${SEED_USER_DOMAIN}`,
    password: 'EduVerse-Consultant-2026',
    name: '课程顾问 王',
    role: 'consultant',
    campus: 'beijing-haidian',
  },
  {
    key: 'consultant-sh',
    email: `consultant.sh@${SEED_USER_DOMAIN}`,
    password: 'EduVerse-Consultant-2026',
    name: '课程顾问 陈',
    role: 'consultant',
    campus: 'shanghai-xuhui',
  },
]

type LeadData = RequiredDataFromCollectionSlug<'leads'>

type LeadRefs = {
  disciplineId: (slug: DisciplineSlug) => number
  courseId: (slug: CourseSlug) => number
  userId: (key: string) => number
  days: (n: number) => string
}

/** 演示线索：手机号为测试号段样式，均为虚构 */
export function buildLeads(refs: LeadRefs): LeadData[] {
  const rows: {
    name: string
    discipline: DisciplineSlug
    city: string
    intent: LeadData['intent']
    status: LeadData['status']
    assignee?: string
    position: string
    pageUrl: string
    course?: CourseSlug
    utm?: { utmSource: string; utmMedium: string; utmCampaign: string }
  }[] = [
    {
      name: '张同学',
      discipline: '3d-animation',
      city: '北京',
      intent: 'trial',
      status: 'new',
      assignee: 'consultant-bj',
      position: 'course_sticky',
      pageUrl: '/courses/3d-animation-career',
      course: '3d-animation-career',
      utm: { utmSource: 'baidu', utmMedium: 'cpc', utmCampaign: '3d-animation' },
    },
    {
      name: '李女士',
      discipline: 'ui-ux',
      city: '北京',
      intent: 'tuition',
      status: 'contacted',
      assignee: 'consultant-bj',
      position: 'floating_bar',
      pageUrl: '/courses/ui-ux-career',
      course: 'ui-ux-career',
    },
    {
      name: '王先生',
      discipline: 'game-art',
      city: '北京',
      intent: 'trial',
      status: 'visited',
      assignee: 'consultant-bj',
      position: 'home_hero',
      pageUrl: '/',
    },
    {
      name: '赵同学',
      discipline: 'concept-art',
      city: '北京',
      intent: 'materials',
      status: 'enrolled',
      assignee: 'consultant-bj',
      position: 'article_sidebar',
      pageUrl: '/articles',
    },
    {
      name: '刘同学',
      discipline: 'vfx',
      city: '天津',
      intent: 'consult',
      status: 'invalid',
      assignee: 'consultant-bj',
      position: 'floating_bar',
      pageUrl: '/works',
    },
    {
      name: '陈女士',
      discipline: 'graphic-design',
      city: '上海',
      intent: 'trial',
      status: 'new',
      assignee: 'consultant-sh',
      position: 'home_lead_form',
      pageUrl: '/',
      utm: { utmSource: 'wechat', utmMedium: 'social', utmCampaign: 'open-day' },
    },
    {
      name: '杨同学',
      discipline: 'motion-design',
      city: '上海',
      intent: 'quiz',
      status: 'contacted',
      assignee: 'consultant-sh',
      position: 'quiz_result',
      pageUrl: '/quiz',
    },
    {
      name: '黄先生',
      discipline: 'arch-viz',
      city: '杭州',
      intent: 'tuition',
      status: 'new',
      assignee: 'consultant-sh',
      position: 'course_sticky',
      pageUrl: '/courses/arch-viz-career',
      course: 'arch-viz-career',
    },
    {
      name: '周同学',
      discipline: 'game-art',
      city: '上海',
      intent: 'tutorial',
      status: 'contacted',
      assignee: 'consultant-sh',
      position: 'tutorial_unlock',
      pageUrl: '/tutorials',
    },
    {
      name: '吴女士',
      discipline: 'ui-ux',
      city: '深圳',
      intent: 'trial',
      status: 'new',
      position: 'mobile_action_bar',
      pageUrl: '/courses',
    },
    {
      name: '徐同学',
      discipline: '3d-animation',
      city: '成都',
      intent: 'materials',
      status: 'new',
      position: 'home_quick_entry',
      pageUrl: '/',
    },
    {
      name: '孙先生',
      discipline: 'vfx',
      city: '广州',
      intent: 'consult',
      status: 'new',
      position: 'floating_bar',
      pageUrl: '/campuses',
    },
  ]

  return rows.map((row, i) => ({
    name: row.name,
    phone: `138001380${String(i + 10).padStart(2, '0')}`,
    discipline: refs.disciplineId(row.discipline),
    city: row.city,
    intent: row.intent,
    status: row.status,
    message: i % 3 === 0 ? '想了解上课时间和试听安排。' : undefined,
    assignedTo: row.assignee ? refs.userId(row.assignee) : undefined,
    source: {
      pageUrl: row.pageUrl,
      position: row.position,
      landingUrl: row.utm ? `/?utm_source=${row.utm.utmSource}` : row.pageUrl,
      referrer: row.utm?.utmSource === 'baidu' ? 'https://www.baidu.com/' : undefined,
      ...row.utm,
    },
    context: { course: row.course ? refs.courseId(row.course) : undefined },
    client: { ip: `10.0.0.${i + 10}`, userAgent: 'Mozilla/5.0（演示数据）' },
    consent: { agreed: true, policyVersion: '2026-11-20', agreedAt: refs.days(-i) },
  }))
}
