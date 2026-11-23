/**
 * 系统级界面文案（表单校验、分页、空状态、无障碍提示等）。
 * 营销与运营文案（标题、按钮文案、导航、区块介绍）一律来自 CMS，不写在这里。
 */
export const zh = {
  a11y: {
    skipToContent: '跳到主要内容',
    loading: '加载中',
  },
  preview: {
    notice: '静态预览站：仅用于查看页面效果，表单提交与后台管理不可用。',
  },
  layout: {
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    menuTitle: '网站导航',
    search: '搜索',
    home: '首页',
    courses: '专业课程',
    allCourses: '查看全部课程',
    quizHint: '不确定选哪个方向？做个职业测试',
    longTerm: '长期',
    shortTerm: '短期',
    campuses: '校区',
    more: '了解更多',
    hotline: '咨询热线',
    consult: '在线咨询',
    phone: '电话',
    wechat: '微信',
    trial: '预约试听',
    backToTop: '返回顶部',
    wechatTitle: '添加课程顾问微信',
    wechatDescription: '扫码或复制微信号添加，备注“咨询”',
    contact: '联系我们',
    workHours: '服务时间',
    address: '地址',
    email: '邮箱',
    icp: 'ICP 备案',
    psb: '公安备案',
    footerNav: '页脚导航',
    mainNav: '主导航',
    quickActions: '快捷咨询',
    /** Logo 链接的无障碍名称，{brand} 替换为品牌名 */
    logoHomeLabel: '{brand}，返回首页',
  },
  webhook: {
    title: '新线索提醒',
    adminLink: '后台链接',
    adminLinkText: '查看线索',
    name: '姓名',
    phone: '手机号',
    intent: '意向',
    discipline: '意向专业',
    city: '城市',
    message: '留言',
    position: '来源位置',
    pageUrl: '提交页面',
    duplicate: '重复线索：是（该手机号近期已提交过）',
    time: '时间',
  },
  export: {
    menuLabel: '导出 CSV（按当前筛选）',
    unauthorized: '请先登录后台',
    forbidden: '没有导出线索的权限',
    invalidFilters: '筛选条件无效，请调整后重试',
    crossSite: '请从后台线索列表页发起导出',
    busy: '正在导出…',
    done: '已导出 {count} 条线索',
    truncated:
      '当前筛选共 {total} 条，单次最多导出 {count} 条，文件只包含最新的 {count} 条。请缩小筛选范围后分批导出。',
    failed: '导出失败，请稍后重试',
    networkError: '网络异常，导出未完成，请检查网络后重试',
  },
  lead: {
    labels: {
      name: '姓名',
      phone: '手机号',
      discipline: '意向专业',
      disciplinePlaceholder: '请选择（可不选）',
      city: '所在城市',
      cityPlaceholder: '请选择',
      message: '留言（选填）',
      messagePlaceholder: '想了解的课程、上课时间等',
      required: '必填',
    },
    placeholders: {
      name: '怎么称呼你',
      phone: '11 位手机号',
    },
    consentPrefix: '我已阅读并同意',
    privacyPolicy: '《隐私政策》',
    consentSuffix: '，同意课程顾问通过电话或微信与我联系',
    submit: '立即预约',
    submitting: '提交中…',
    dialogTitle: '预约免费试听',
    dialogDescription: '留下联系方式，课程顾问会尽快与你联系。',
    close: '关闭',
    errors: {
      nameRequired: '请填写姓名',
      nameTooLong: '姓名不能超过 30 个字',
      phoneRequired: '请填写手机号',
      phoneInvalid: '请输入 11 位中国大陆手机号',
      consentRequired: '请先阅读并同意《隐私政策》',
      tooFast: '提交太快了，请确认信息后再提交',
      rateLimited: '提交次数较多，请稍后再试，或直接拨打咨询热线',
      generic: '提交失败，请稍后重试或直接拨打咨询热线',
      formInvalid: '请检查标出的信息',
    },
    success: {
      wechatHint: '添加课程顾问微信，领取课程资料',
      wechatId: '微信号',
      copy: '复制',
      copied: '已复制',
      /** 复制成功后读屏播报 */
      copySucceeded: '微信号已复制',
      /** 浏览器不支持或拒绝写入剪贴板时：已自动选中微信号，提示手动复制 */
      copyFailed: '自动复制失败，已选中微信号，请长按或右键手动复制',
      qrAlt: '课程顾问微信二维码',
      again: '完成',
    },
    previewNotice: '预览站不支持提交表单，正式站点可正常预约。',
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
  breadcrumbs: {
    /** 面包屑导航的无障碍名称 */
    label: '面包屑',
    home: '首页',
  },
  /**
   * 课程模块（课程列表 / 课程详情 / 专业方向页）的系统文案。
   * 带 {name} 占位的用 formatMessage()（src/lib/course/format.ts）替换。
   * 页面专属文案只追加在 list / detail / major 子对象里。
   */
  course: {
    /** 与后台选项标签一致（Courses.ts CLASS_TYPE_OPTIONS，单元测试校验） */
    classType: { long_term: '长期就业班', short_term: '短期提升班' },
    /** 与后台选项标签一致（Courses.ts DELIVERY_MODE_OPTIONS，单元测试校验） */
    deliveryMode: { offline: '线下面授', online: '线上直播', dual: '双师课堂' },
    /** 与后台选项标签一致（Cohorts.ts COHORT_STATUS_OPTIONS，单元测试校验） */
    cohortStatus: { enrolling: '报名中', upcoming: '即将开班', full: '已满班' },
    durationUnit: { week: '周', month: '个月' },
    /** 多个取值之间的分隔（如“线下面授 / 双师课堂”） */
    listSeparator: ' / ',
    /** 城市与校区名之间的分隔（校区名不以城市开头时，如“北京·中关村校区”） */
    campusSeparator: '·',
    /** 没有校区的开班 / 纯线上课程 */
    online: '线上',
    /** 线下 / 双师课程暂无已发布的校区（开课城市、开设校区的取值） */
    campusPending: '待定',
    meta: {
      duration: '课程时长',
      classType: '班型',
      mode: '授课方式',
      schedule: '上课时间',
      city: '开课城市',
      campuses: '开设校区',
      nextCohort: '近期开班',
    },
    card: {
      roadmap: '学习路线',
      /** 阶段超过 5 个时，列表末尾的说明；{count} 为阶段总数 */
      moreStages: '等 {count} 个阶段',
      detail: '课程详情',
      trial: '预约试听',
      /** 读屏：区分多张卡片上的同名按钮 */
      detailLabel: '{title}：课程详情',
      trialLabel: '预约试听：{title}',
    },
    filters: {
      /** 筛选栏 <nav> 的无障碍名称 */
      label: '课程筛选',
      discipline: '专业方向',
      type: '班型',
      mode: '授课方式',
      city: '城市',
      all: '全部',
      clear: '清除筛选',
      resultCount: '共 {count} 门课程',
      previewNotice: '静态预览站不支持按条件筛选，正式站点可直接筛选课程。',
    },
    salary: {
      title: '薪资参考',
      source: '数据来源',
      statDate: '统计时间',
    },
    syllabus: {
      /** {index} 从 1 开始 */
      stage: '第 {index} 阶段',
      goals: '阶段目标',
      topics: '知识点',
    },
    cohort: {
      /** 开班日期之后的结课日期，如“至 2027年6月30日” */
      until: '至 {date}',
      trial: '预约试听',
      /** 读屏：区分每一行的“预约试听”按钮 */
      trialLabel: '预约试听：{date}开班（{place}）',
      empty: '暂无近期开班计划。可以先预约试听，课程顾问会告知最新的开班安排。',
    },
    teacher: {
      years: '从业 {years} 年',
      specialties: '擅长',
    },
    work: {
      /** 署名与届别之间的分隔 */
      authorSeparator: ' · ',
    },
    /** 课程列表页 /courses 专属文案（List Agent 追加） */
    list: {
      /** 筛选项的读屏补充（可见文字只显示数字），{count} 为选中该项后的课程数 */
      optionCount: '（{count} 门课程）',
      /** 分组标题旁的课程数 */
      groupCount: '{count} 门课程',
      /** 分组标题右侧链接到专业方向页 */
      majorLink: '了解该专业',
      /** 读屏：区分各分组的同名链接 */
      majorLinkLabel: '了解该专业：{name}',
      emptyTitle: '没有符合条件的课程',
      emptyDescription:
        '当前筛选条件下暂未开设课程。可以清除筛选查看全部课程，或者告诉课程顾问你的情况，帮你推荐合适的方向。',
      emptyConsult: '咨询课程顾问',
    },
    /** 课程详情页 /courses/[slug] 专属文案（Detail Agent 追加） */
    detail: {
      /** 首屏的两个按钮 */
      trial: '预约试听',
      tuition: '咨询学费',
      /** “咨询学费”打开的留资弹窗标题与说明 */
      tuitionDialogTitle: '咨询学费',
      tuitionDialogDescription: '留下联系方式，课程顾问会尽快联系你，介绍学费与报名安排。',
      /** 页内导航 <nav> 的无障碍名称 */
      navLabel: '课程内容',
      /** 页内导航各项（只列出有内容的区块） */
      nav: {
        overview: '亮点与适合人群',
        syllabus: '课程大纲',
        projects: '实训项目',
        works: '学员作品',
        teachers: '授课讲师',
        cohorts: '开班计划',
        careers: '就业方向',
        faqs: '常见问题',
      },
      /** 各区块标题 */
      sections: {
        highlights: '课程亮点',
        audience: '适合人群',
        syllabus: '课程大纲',
        software: '所用软件',
        projects: '实训项目',
        works: '学员作品',
        teachers: '授课讲师',
        cohorts: '开班计划',
        careers: '就业方向',
        faqs: '常见问题',
        related: '同专业其它课程',
      },
      /** 课程大纲标题下的概要，{count} 为阶段数 */
      syllabusSummary: '共 {count} 个阶段',
      /** 实训项目编号，{index} 从 01 开始 */
      projectIndex: '项目 {index}',
      cohortsNote: '开班时间与校区安排可能调整，以课程顾问确认的为准。',
      /** 同专业其它课程区块右侧链接到专业方向页，{name} 为专业方向名称 */
      majorLink: '了解{name}专业',
      /** 侧栏表单上方的课程摘要 */
      sidebarCourse: '意向课程',
    },
    /** 专业方向页 /majors/[slug] 专属文案（Major Agent 追加） */
    major: {
      /** 首屏 h1 上方的眉标 */
      eyebrow: '专业方向',
      /** 首屏的两个按钮 */
      trial: '预约试听',
      materials: '领取学习资料',
      /** “领取学习资料”打开的留资弹窗；{name} 为专业方向名称 */
      materialsDialogTitle: '领取学习资料',
      materialsDialogDescription: '留下联系方式，课程顾问会把{name}方向的学习资料发送给你。',
      materialsSubmit: '领取资料',
      /** 首屏概况 <dl> 的“开设课程”一项（其余标签复用 course.meta） */
      courseCountLabel: '开设课程',
      courseCount: '{count} 门',
      /** 各区块标题 */
      sections: {
        intro: '专业介绍',
        careers: '发展方向',
        salary: '薪资参考',
        courses: '开设课程',
        works: '学员作品',
        teachers: '专业讲师',
      },
      /** 只有薪资、没有发展方向时，薪资卡片的标题（区块标题已是“薪资参考”） */
      salaryRange: '薪资区间',
      /** 开设课程区块标题下的概要，{count} 为课程数 */
      coursesSummary: '共 {count} 门课程',
      coursesEmpty: '该方向的课程正在更新中。可以先预约试听，课程顾问会介绍近期的开课安排。',
      /** 开设课程区块右侧链接到课程列表 */
      allCourses: '全部专业课程',
      worksNote: '展示的作品均已获得学员授权。',
    },
  },
} as const

export type Dictionary = typeof zh
