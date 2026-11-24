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
  /** 后台自定义字段组件 */
  adminFields: {
    /** 只读 JSON 字段没有内容时 */
    jsonEmpty: '（无）',
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
  /** SEO（src/lib/seo）：元数据中的系统文案 */
  seo: {
    /** 可收录的分页列表第 2 页起的描述（{description} 为列表描述），避免各页描述重复 */
    pagedDescription: '{description}（第 {page} 页）',
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
  /** 通用筛选栏（src/components/common/filter-bar.tsx） */
  filterBar: {
    all: '全部',
    clear: '清除筛选',
  },
  /** 通用分页导航（src/components/common/pagination.tsx）；带 {name} 占位的用 formatMessage() 替换 */
  pagination: {
    /** <nav> 的无障碍名称 */
    label: '分页',
    previous: '上一页',
    next: '下一页',
    /** 页码链接的无障碍名称 */
    page: '第 {page} 页',
    /** 移动端紧凑显示“2 / 3”时的读屏文字 */
    status: '第 {page} 页，共 {total} 页',
  },
  /** 通用横滑容器（src/components/common/horizontal-scroller.tsx）按钮的读屏名称，{label} 为列表名称 */
  scroller: {
    previous: '{label}：上一组',
    next: '{label}：下一组',
  },
  /** 通用灯箱（src/components/common/lightbox.tsx：作品图集、校区环境照片） */
  lightbox: {
    /** 读屏：对话框说明（对话框标题由使用方传入，如作品名、校区名） */
    hint: '按左右方向键切换图片，按 Esc 关闭。',
    previous: '上一张',
    next: '下一张',
    close: '关闭大图',
    counter: '{index} / {total}',
    /** 读屏：序号变化时播报 */
    counterLabel: '第 {index} 张，共 {total} 张',
  },
  /**
   * 通用“点击后加载”外部播放器（src/components/common/video-facade.tsx：作品详情、免费教程弹窗）。
   * 带 {title} 占位的用 formatMessage() 替换。
   */
  video: {
    /** 播放按钮的读屏名称 */
    play: '播放视频：{title}',
    /** 外部播放器 iframe 的 title */
    frameTitle: '{title}（视频播放器）',
    /** 播放器地址不在白名单（或缺失）时的占位文字 */
    unavailable: '视频暂不可用',
    /** 播放器下方的隐私提示（首屏不请求第三方） */
    notice: '视频由第三方平台播放，点击播放后才会加载播放器。',
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
      /** 跨课程的开班列表（校区详情）：读屏名称带上课程名 */
      trialCourseLabel: '预约试听：{course}，{date}开班（{place}）',
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
  /**
   * 学员作品模块（作品列表 /works、作品详情 /works/[id]）的系统文案。
   * 带 {name} 占位的用 formatMessage()（src/lib/course/format.ts）替换。
   * 页面专属文案只追加在 list / detail 子对象里。
   */
  works: {
    /** 作品卡片上的精选徽标（文字） */
    featured: '精选',
    /** 作者署名说明（学员化名，PRD Q4） */
    pseudonymNote: '作者署名为学员化名',
    filters: {
      /** 筛选栏 <nav> 的无障碍名称 */
      label: '作品筛选',
      discipline: '专业方向',
      software: '软件',
      featured: '精选',
      /** “精选”一行的唯一选项（另一项是“全部”） */
      featuredOnly: '只看精选',
      resultCount: '共 {count} 件作品',
      /** 筛选项的读屏补充（可见文字只显示数字） */
      optionCount: '（{count} 件作品）',
      previewNotice: '静态预览站不支持筛选与翻页，只展示第 1 页的作品；正式站点可正常筛选与翻页。',
    },
    /** 作品列表页 /works 专属文案（Works List Agent 追加） */
    list: {
      /** 第 2 页起的页面标题（{title} 为列表页标题），避免各页标题重复 */
      pagedTitle: '{title}（第 {page} 页）',
      /**
       * 多于 1 页时筛选栏底部的结果数（{count} 由筛选栏加粗显示，{page} / {total} 先由页面替换），
       * 翻页后在页面上方也能看到当前是第几页
       */
      resultCountPaged: '共 {count} 件作品 · 第 {page} / {total} 页',
      /** 筛选无结果 */
      emptyTitle: '没有符合条件的作品',
      emptyDescription:
        '当前筛选条件下暂时没有可展示的作品。可以清除筛选查看全部作品，或者预约一节试听课，了解课程里的作品是怎么完成的。',
      /** 还没有任何作品（未筛选） */
      noWorksTitle: '作品正在整理中',
      noWorksDescription:
        '学员作品取得本人授权后才会在这里展示。可以先预约一节试听课，了解课程内容与作品要求。',
      emptyTrial: '预约试听',
    },
    /** 作品详情页 /works/[id] 专属文案（Work Detail Agent 追加） */
    detail: {
      /** 主图按钮的读屏名称，{alt} 为图片替代文字 */
      openImage: '查看大图：{alt}',
      /** 缩略图按钮的读屏名称（带序号，与主图按钮区分），{name} 为图片说明或替代文字 */
      openThumb: '查看第 {index} 张大图：{name}',
      /** 主图右下角的提示 */
      viewLarge: '查看大图',
      /** 多张图时提示里的张数 */
      imageCount: '共 {count} 张',
      /** 缩略图列表的无障碍名称 */
      galleryLabel: '作品图集',
      /** 外部播放器的提示（播放按钮与 iframe 的名称见 zh.video） */
      videoNotice: '视频由第三方平台播放，点击播放后才会加载播放器。',
      videoUnsupported: '当前浏览器无法播放这段视频。',
      /** 信息栏 <dl> 的各项 */
      facts: {
        discipline: '专业方向',
        course: '所属课程',
        software: '所用软件',
        publishedAt: '发布时间',
      },
      descriptionTitle: '作品说明',
      /** 行动号召按钮 */
      trial: '预约试听',
      related: '相关作品',
      allWorks: '查看全部作品',
      /** 作品没有说明时的页面描述（meta description），{byline} 为“化名 · 届别” */
      metaDescription: '{title}，{byline}的学员作品。',
    },
  },
  /**
   * 师资模块（讲师列表 /teachers、讲师详情 /teachers/[slug]）的系统文案。
   * 讲师卡片的“从业 N 年”“擅长”复用 course.teacher。页面专属文案只追加在 list / detail 子对象里。
   */
  teachers: {
    filters: {
      /** 筛选栏 <nav> 的无障碍名称 */
      label: '讲师筛选',
      discipline: '专业方向',
      resultCount: '共 {count} 位讲师',
      /** 筛选项的读屏补充（可见文字只显示数字） */
      optionCount: '（{count} 位讲师）',
      previewNotice: '静态预览站不支持按条件筛选，正式站点可直接按专业方向筛选讲师。',
    },
    /** 讲师卡片上专业方向的读屏前缀（可见文字只列出专业方向） */
    disciplines: '专业方向',
    /** 讲师列表页 /teachers 专属文案（Teachers Agent 追加） */
    list: {
      /** 筛选无结果 */
      emptyTitle: '没有符合条件的讲师',
      emptyDescription:
        '当前专业方向下暂时没有可展示的讲师。可以清除筛选查看全部讲师，或者先了解各专业的课程安排。',
      /** 还没有任何讲师（未筛选） */
      noTeachersTitle: '讲师介绍正在整理中',
      noTeachersDescription: '讲师介绍更新后会在这里展示。可以先了解各专业的课程安排与授课方式。',
      /** 空状态里链接到课程列表 */
      viewCourses: '查看专业课程',
    },
    /** 讲师详情页 /teachers/[slug] 专属文案（Teachers Agent 追加） */
    detail: {
      /** 页面标题（SEO 标题未填写时），{name} 为姓名、{title} 为头衔 */
      metaTitle: '{name} · {title}',
      /** 个人简介为空时的页面描述（meta description） */
      metaDescription: '{name}，{title}。',
      /** 首屏概况 <dl> 的各项 */
      facts: {
        years: '从业年限',
        campus: '所在校区',
        disciplines: '专业方向',
        specialties: '擅长领域',
      },
      /** 从业年限的取值，{years} 为年数 */
      yearsValue: '{years} 年',
      /** 首屏按钮 */
      trial: '预约试听',
      /** 各区块标题 */
      sections: {
        bio: '个人简介',
        experience: '从业经历',
        courses: '授课课程',
        works: '学员作品',
      },
      /** 授课课程区块标题下的概要，{count} 为课程数 */
      coursesSummary: '共 {count} 门课程',
      worksNote: '作品来自这位讲师授课的课程，均已获得学员授权。',
      /** 学员作品区块右侧链接到作品列表 */
      allWorks: '查看全部作品',
    },
  },
  /**
   * 资讯模块（资讯列表 /articles、分类页 /articles/category/[slug]、资讯详情 /articles/[slug]）的系统文案。
   * 带 {name} 占位的用 formatMessage()（src/lib/course/format.ts）替换。
   * 页面专属文案只追加在 list / detail 子对象里（Articles Agent）。
   */
  articles: {
    /** 文章卡片 / 列表行（src/components/articles/article-card.tsx） */
    card: {
      /** 读屏：发布时间前缀（可见文字只显示日期） */
      publishedAt: '发布于',
      /** 阅读量，{count} 用 formatArticleViews() 格式化（“1.2万”） */
      views: '{count} 次阅读',
      author: '作者',
      /** 分类与日期之间的分隔 */
      metaSeparator: ' · ',
    },
    /** 资讯列表 /articles 与分类页 /articles/category/[slug] 专属文案（Articles Agent） */
    list: {
      /** 分类导航 <nav> 的无障碍名称 */
      navLabel: '资讯分类',
      /** 分类导航第一项（全部资讯） */
      all: '全部',
      /** 分类导航各项文章数的读屏补充（可见文字只显示数字） */
      categoryCount: '（{count} 篇）',
      /** 第 2 页起的页面标题（{title} 为列表页标题或分类名），避免各页标题重复 */
      pagedTitle: '{title}（第 {page} 页）',
      /**
       * 分类没有填写描述时，分类页 h1 下的简介与 meta description（{name} 为分类名，{count} 为文章数）：
       * 各分类页的描述互不相同，不会都退回资讯列表的简介
       */
      categoryDescription: '「{name}」分类下的全部资讯，共 {count} 篇，按发布时间从新到旧排列。',
      /** 头条卡片的标记（与分类、日期一起作为卡片说明） */
      headline: '头条',
      /** 头条卡片右下角的提示（整张卡片已是链接，提示只做视觉引导） */
      readMore: '阅读全文',
      /** 还没有任何已发布的资讯 */
      emptyTitle: '资讯正在整理中',
      emptyDescription:
        '学院新闻、行业观察与学习干货更新后会在这里展示。可以先了解各专业的课程安排与授课方式。',
      /** 空状态里链接到课程列表 */
      viewCourses: '查看专业课程',
      previewNotice: '静态预览站不支持翻页，只展示第 1 页的资讯；正式站点可正常翻页。',
    },
    /** 资讯详情 /articles/[slug] 专属文案（Articles Agent） */
    detail: {
      /** 首屏信息行的读屏前缀（可见文字只显示取值） */
      author: '作者',
      publishedAt: '发布于',
      category: '分类',
      /** 正文之后的区块 */
      relatedCourses: '相关课程',
      relatedArticles: '相关文章',
      /** 相关文章区块右侧链接到分类页，{name} 为分类名 */
      moreInCategory: '更多{name}',
      /** 正文末尾链接回资讯列表 */
      backToList: '返回资讯列表',
      /** 侧栏（桌面端在右栏，移动端在正文之后）的无障碍名称 */
      sidebarLabel: '推荐课程与咨询',
      hotCourses: '热门课程',
      /** 热门课程列表末尾链接到课程列表 */
      allCourses: '查看全部课程',
      /** 热门课程条目上专业方向与班型之间的分隔 */
      courseMetaSeparator: ' · ',
    },
  },
  /**
   * 校区模块（校区列表 /campuses、校区详情 /campuses/[slug]）的系统文案；首页“校区分布”的卡片也用 card。
   * 页面专属文案只追加在 list / detail 子对象里（Campuses Agent）。
   */
  campuses: {
    /** 校区卡片（src/components/campuses/campus-card.tsx，首页与校区列表共用） */
    card: {
      address: '地址',
      phone: '电话',
      openingHours: '开放时间',
      /** 外链到高德地图（新窗口） */
      openMap: '在地图中打开',
      /** 无障碍名称以可见文字开头（语音控制按可见文字即可点到，WCAG 2.5.3） */
      openMapLabel: '在地图中打开：{name}（高德地图，在新窗口打开）',
      detail: '查看校区',
      detailLabel: '查看校区：{name}',
    },
    /** 地图外链（新窗口、rel="noopener noreferrer"，页面不加载地图脚本） */
    map: {
      amap: '在高德地图中打开',
      baidu: '在百度地图中打开',
      /** 读屏：{label} 为可见文字，{name} 为校区名 */
      linkLabel: '{label}：{name}（在新窗口打开）',
    },
    /** 校区列表页 /campuses 专属文案（Campuses Agent） */
    list: {
      /** 卡片网格上方的概要，{count} 为校区数、{cities} 为城市数 */
      summary: '共 {count} 个校区，分布在 {cities} 个城市',
      /** 还没有任何已发布的校区 */
      emptyTitle: '校区信息正在整理中',
      emptyDescription:
        '校区地址与开放时间更新后会在这里展示。可以先了解各专业的课程安排，线上直播课程不受校区限制。',
      viewCourses: '查看专业课程',
    },
    /** 校区详情页 /campuses/[slug] 专属文案（Campuses Agent） */
    detail: {
      /** 页面标题（SEO 标题未填写时），{name} 为校区名 */
      metaTitle: '{name} · 地址与交通',
      /** 页面描述（SEO 描述未填写时），{name} 为校区名、{address} 为地址 */
      metaDescription:
        '{name}位于{address}。查看交通指引、开放时间、开设课程与近期开班，预约到校参观。',
      /** 首屏概况 <dl> 的各项 */
      facts: {
        address: '地址',
        phone: '电话',
        openingHours: '开放时间',
        transit: '交通指引',
      },
      /** 首屏按钮（打开留资弹窗；弹窗标题与说明来自后台「校区页面设置 · 校区详情页」） */
      visit: '预约到校参观',
      /** 地图外链列表的无障碍名称 */
      mapLinksLabel: '地图导航',
      /** 各区块标题 */
      sections: {
        photos: '校区环境',
        courses: '开设课程',
        cohorts: '近期开班',
        teachers: '本校区讲师',
      },
      /** 环境照片：打开大图按钮的读屏名称，{caption} 为照片说明（未填写时为校区名） */
      openPhoto: '查看大图：{caption}',
      photosSummary: '共 {count} 张照片，点击可查看大图',
      /** 开设课程区块标题下的概要，{count} 为课程数 */
      coursesSummary: '共 {count} 门课程在本校区开课',
      cohortsSummary: '本校区尚未开班的计划，开班日期按北京时间计。',
      cohortsEmpty: '本校区近期暂无开班安排。可以先预约到校参观，课程顾问会告知后续的开班时间。',
      /** 本校区讲师区块标题下的概要，{count} 为讲师数 */
      teachersSummary: '共 {count} 位讲师',
      allCourses: '查看全部课程',
      allTeachers: '查看全部讲师',
    },
  },
  /**
   * 就业服务页（/careers）的系统文案。区块标题、流程、行动号召等运营文案来自后台「就业服务页」。
   * 广告法：不写就业率、薪资承诺、“保证 / 包就业”等结果性表述。页面专属文案只追加在 page 子对象里（Careers Agent）。
   */
  careers: {
    /** 学员故事卡片（src/components/careers/story-card.tsx，首页与就业服务页共用） */
    stories: {
      /** 学员故事区块末尾的化名说明（与首页一致） */
      pseudonymNote: '学员姓名为化名，经历均已取得本人授权后展示。',
      /** 现任岗位与公司之间的分隔（“UI 设计师 · 星槎网络科技”） */
      roleSeparator: ' · ',
      /** 卡片底部的事实标签（学习前背景、所学课程）；currentRole 只作读屏前缀（可见文字只显示取值） */
      background: '学习前',
      currentRole: '现任',
      course: '所学课程',
      /** 展开 / 收起故事正文（按钮的读屏名称带化名：{name}） */
      readStory: '阅读完整故事',
      readStoryLabel: '阅读完整故事：{name}',
      collapse: '收起',
    },
    /** 合作企业 Logo 墙（src/components/careers/partner-wall.tsx，首页与就业服务页共用） */
    partners: {
      /** Logo 墙列表的无障碍名称：企业名称即 Logo 的 alt */
      listLabel: '合作企业名单',
    },
    events: {
      date: '活动时间',
      location: '地点',
      campus: '举办校区',
      registration: '报名方式',
      empty: '近期暂无招聘活动安排。可以先预约就业咨询，课程顾问会告知后续的活动时间。',
    },
    /** 就业服务页 /careers 专属文案（Careers Agent） */
    page: {
      /** 首屏按钮：打开留资弹窗（意向“就业咨询”；弹窗标题与说明用后台「就业服务页 · 行动号召」） */
      consult: '预约就业咨询',
      /** 首屏右侧（≥ lg）最近一场招聘活动的提示卡片 */
      nextEvent: '最近一场活动',
      /** 提示卡片底部链接到页内的招聘活动区块 */
      allEvents: '查看全部活动',
      /** 学员故事展开按钮的读屏补充（接在可见文字“阅读完整故事 / 收起”之后），{name} 为化名 */
      storyToggleSuffix: '：{name}',
      /** 招聘活动区块：后台没有填写区块描述时显示在标题下 */
      eventsNote: '活动时间按北京时间计，已结束的活动不再显示。',
      /** 招聘活动空状态里链接到页尾的预约表单 */
      emptyAction: '预约就业咨询',
    },
  },
  /**
   * 职业测试（/quiz）的系统文案。开始页 / 结果页的标题、说明、按钮文字、下一步建议等运营文案来自后台「职业测试设置」，
   * 不写在这里。带 {name} 占位的用 formatMessage()（src/lib/course/format.ts）替换。
   * 页面专属文案只追加在 runner / result / report / page 子对象里（Quiz Agent）。
   */
  quiz: {
    /** 答题过程（QuizRunner） */
    runner: {
      /** 进度文字，如“第 3 / 10 题” */
      progress: '第 {current} / {total} 题',
      /** 进度条的无障碍名称 */
      progressLabel: '答题进度',
      previous: '上一题',
      next: '下一题',
      /** 最后一题的“下一题”按钮 */
      finish: '查看结果',
      /** 未选择就点“下一题”时的提示（按钮也会禁用） */
      chooseOne: '请选择一个选项后继续',
      /** 开始页：题目数量，{count} 为题数 */
      questionCount: '{count} 道单选题',
      /** 开始页：键盘操作说明（≥ md 显示） */
      keyboardHint: '可用方向键选择选项，按回车进入下一题',
      /** 开始页：可能的推荐方向（专业方向简称列表）的标题 */
      coverage: '测试涵盖的方向',
    },
    /** 结果页：摘要（公开）与完整报告（留资后展开） */
    result: {
      /** 摘要里链接到推荐专业的方向页，{name} 为专业名称 */
      learnMore: '了解{name}',
      /** 重新测试按钮 */
      restart: '重新测试',
      /** 所有题目都没有计分（后台未配置加分）时，无法给出推荐 */
      noRecommendationTitle: '暂时无法给出推荐方向',
      noRecommendationDescription:
        '你的选择没有匹配到具体方向。可以重新测试，或直接预约一节试听课，请课程顾问帮你分析。',
      /** 无法推荐时的留资按钮（打开弹窗，意向 quiz） */
      consult: '预约试听',
    },
    report: {
      /** 各方向得分（条形图）区块标题；percent 是该方向得分占全部得分的比例（QuizScoreItem.percent） */
      scoresTitle: '各方向得分占比',
      /** 条形图每行的取值文字（不只靠颜色、长度表达） */
      scoreValue: '{percent}%',
      /** 条形图每行的读屏名称 */
      scoreLabel: '{name}：得分占比 {percent}%',
      /** 条形图中推荐方向的文字徽标（不只靠颜色区分） */
      recommended: '推荐',
      /** 推荐方向那一行的读屏名称 */
      scoreLabelRecommended: '{name}：得分占比 {percent}%，推荐方向',
      /** 推荐方向的课程区块标题 */
      coursesTitle: '推荐课程',
      /** 课程区块末尾链接到专业方向页，{name} 为专业名称 */
      allCourses: '查看{name}全部课程',
      /** 推荐方向暂时没有可报名的课程 */
      noCourses: '这个方向的课程正在更新，可以先预约试听了解学习安排。',
    },
    /** 后台还没有题目或专业方向时的空状态 */
    empty: {
      title: '职业测试正在准备中',
      description: '测试题更新后会在这里开放。可以先浏览各专业课程，或预约一节试听课。',
      viewCourses: '查看专业课程',
    },
    /** 页面级（面包屑等；页面标题与 SEO 来自后台「职业测试设置」） */
    page: {
      /** 面包屑与 BreadcrumbList 中的名称 */
      breadcrumb: '职业测试',
    },
  },
  /**
   * 免费教程（/tutorials）的系统文案。页面标题、简介、留资区标题与说明来自后台「教程页面设置」，
   * 不写在这里。带 {name} 占位的用 formatMessage() 替换。
   * 页面专属文案只追加在 card / filters / list / player / gate 子对象里（Tutorials Agent）。
   */
  tutorials: {
    /** 难度：与后台选项标签一致（Tutorials.ts TUTORIAL_LEVEL_OPTIONS，单元测试校验） */
    levels: { beginner: '入门', intermediate: '进阶', advanced: '高阶' },
    /** 视频平台名称：与后台选项标签一致（TUTORIAL_PROVIDER_OPTIONS，单元测试校验） */
    providers: { bilibili: '哔哩哔哩' },
    /** 教程卡片 */
    card: {
      /** 留资后解锁的文字徽标 */
      gated: '留资解锁',
      /** 本浏览器已留资解锁后，徽标改为这段文字 */
      unlocked: '已解锁',
      /** 读屏：时长前缀（可见文字只显示“18:40”） */
      duration: '时长',
      /** 读屏：难度前缀 */
      level: '难度',
      /** 读屏：平台前缀 */
      provider: '播放平台',
      /** 卡片按钮的读屏名称（打开播放弹窗），{title} 为教程标题 */
      open: '观看教程：{title}',
    },
    filters: {
      /** 筛选栏 <nav> 的无障碍名称 */
      label: '教程筛选',
      discipline: '专业方向',
      level: '难度',
      resultCount: '共 {count} 个教程',
      /** 筛选项的读屏补充（可见文字只显示数字） */
      optionCount: '（{count} 个教程）',
      previewNotice: '静态预览站不支持筛选，只展示全部教程；正式站点可按专业方向与难度筛选。',
    },
    list: {
      /** 筛选无结果 */
      emptyTitle: '没有符合条件的教程',
      emptyDescription: '当前筛选条件下暂时没有教程。可以清除筛选查看全部教程。',
      /** 还没有任何教程（未筛选） */
      noTutorialsTitle: '教程正在录制中',
      noTutorialsDescription:
        '免费教程更新后会在这里展示。可以先浏览各专业课程，或预约一节试听课。',
      viewCourses: '查看专业课程',
      /** 还没有任何教程时的预约试听按钮 */
      trial: '预约试听',
    },
    /** 播放弹窗 */
    player: {
      /** 弹窗关闭按钮 */
      close: '关闭',
      /** 深链接 ?play= 指向的教程不存在 / 已下线 */
      notFound: '这个教程暂时无法观看，可以看看其它免费教程。',
      /** 弹窗底部指向专业方向页的链接，{name} 为专业方向名称 */
      learnMore: '了解{name}专业',
    },
    /** 留资解锁 */
    gate: {
      /** 解锁成功后的提示（role=status）：本浏览器留资一次即解锁全部需留资的教程 */
      unlocked: '已解锁，可以观看了，其它需留资的教程也已一并解锁',
    },
  },
  /**
   * 站内搜索（/search?q=）的系统文案。带 {name} 占位的用 formatMessage() 替换。
   * 页面专属文案只追加在 form / results / empty / page 子对象里（Search Agent）。
   */
  search: {
    /** 结果分组的名称（与 SEARCH_GROUP_KEYS 一一对应，单元测试校验） */
    groups: {
      courses: '课程',
      disciplines: '专业方向',
      articles: '资讯',
      teachers: '讲师',
      works: '学员作品',
    },
    form: {
      /** <label>（可视觉隐藏） */
      label: '搜索关键词',
      placeholder: '搜索课程、专业、资讯、讲师、作品',
      submit: '搜索',
      /** 关键词为空 / 只有空白 */
      emptyHint: '请输入要搜索的关键词',
      /** 关键词超过 50 个字（{max} 为上限） */
      tooLong: '关键词不能超过 {max} 个字，请精简后再搜索',
      /** 提交后等待结果时搜索按钮的读屏文字 */
      pending: '正在搜索…',
    },
    results: {
      /** aria-live 汇总，{query} 为关键词 */
      summary: '“{query}”共找到 {count} 条结果',
      /** 分组标题后的数量（可见），{count} 为该组匹配数 */
      groupCount: '{count} 条',
      /** 某组匹配超过显示上限时的说明，{shown} 为显示条数 */
      groupMore: '仅显示前 {shown} 条，换个更具体的关键词试试',
      /** 结果分类跳转链接（<nav>）的无障碍名称 */
      navLabel: '按类型查看结果',
      /** 有结果时侧栏（热门专业 / 热门课程）的无障碍名称 */
      asideLabel: '热门推荐',
    },
    empty: {
      /** 没有任何结果 */
      title: '没有找到与“{query}”相关的内容',
      description:
        '换个关键词试试，比如软件名称（Blender、Figma）或专业方向（三维动画、UI 设计）。',
      /** 热门入口（空搜索与无结果共用） */
      hotDisciplines: '热门专业',
      hotCourses: '热门课程',
      /** 无结果时的在线咨询按钮 */
      consult: '在线咨询',
      /** 无结果时在线咨询按钮前的说明 */
      consultHint: '也可以告诉课程顾问你想学什么，帮你一起找找合适的课程。',
      /** 热门课程后的链接 */
      allCourses: '查看全部课程',
    },
    /** 页面 SEO 与静态预览站 */
    page: {
      /** 有关键词时的页面标题 */
      title: '搜索：{query}',
      /** 没有关键词时的页面标题（也是 h1 与面包屑） */
      titleEmpty: '站内搜索',
      /** 页面描述（meta description） */
      description: '搜索课程、专业方向、资讯、讲师与学员作品。',
      previewNotice: '静态预览站不支持搜索；正式站点可搜索课程、专业方向、资讯、讲师与学员作品。',
    },
  },
  /**
   * 首页（/）的系统文案。区块标题 / 眉标 / 描述、轮播图文字、入口卡片、表单按钮文字等运营文案一律来自后台「首页」配置，
   * 不写在这里。带 {name} 占位的用 formatMessage()（src/lib/course/format.ts）替换。
   * 区块 1–4（src/components/home/top）只追加在 top 里，区块 5–11（src/components/home/bottom）只追加在 bottom 里，
   * 页面组装（SEO、结构化数据）只追加在 page 里。
   */
  home: {
    top: {
      /** 主视觉轮播（HeroCarousel） */
      hero: {
        /** 轮播区域（section）的无障碍名称 */
        label: '主视觉',
        /** aria-roledescription：轮播区域 / 每一张 */
        roleDescription: '轮播',
        slideRoleDescription: '幻灯片',
        /** 每一张的无障碍名称 */
        slideLabel: '第 {index} 张，共 {total} 张',
        previous: '上一张',
        next: '下一张',
        pause: '暂停自动轮播',
        /** 自动轮播暂停后（或系统开启“减少动态效果”、默认不自动轮播时）的播放按钮 */
        play: '开始自动轮播',
        /** 圆点导航的无障碍名称 / 每个圆点 */
        dotsLabel: '选择轮播图',
        goTo: '第 {index} 张：{title}',
        /** 手动切换后读屏播报（视觉隐藏的 aria-live 区域；自动轮播时不播报） */
        announce: '第 {index} 张，共 {total} 张：{title}',
      },
      /** 外链（轮播按钮、入口卡片）的读屏补充 */
      opensInNewTab: '（在新窗口打开）',
      /** 热门专业（HotDisciplines） */
      hotDisciplines: {
        /** 卡片上的课程数 */
        courseCount: '{count} 门课程',
        /** 区块末尾链接到课程列表 */
        allCourses: '查看全部课程',
      },
      /** 精选课程（CoursesRail） */
      courses: {
        allCourses: '查看全部课程',
      },
    },
    bottom: {
      /** 学员作品（WorksSection） */
      works: {
        more: '查看更多作品',
        /** 作品署名说明（与作品列表一致） */
        pseudonymNote: '作品均已获得学员授权，署名为学员化名。',
      },
      /** 学员故事（StoriesSection）：不展示个人薪资，必须注明化名；卡片文案见 careers.stories */
      stories: {
        pseudonymNote: '学员姓名为化名，经历均已取得本人授权后展示。',
      },
      /** 合作企业（PartnersSection）：Logo 墙文案见 careers.partners */
      /** 师资团队（TeachersSection） */
      teachers: {
        all: '查看全部讲师',
      },
      /** 校区分布（CampusesSection） */
      campuses: {
        all: '查看全部校区',
      },
      /** 最新资讯（ArticlesSection） */
      articles: {
        all: '查看全部资讯',
        /** 分类 Tab：第一项（全部分类） */
        allTab: '全部',
        tabsLabel: '资讯分类',
      },
    },
    /** 页面组装（src/app/(frontend)/page.tsx）：SEO 与结构化数据 */
    page: {
      /** Organization 结构化数据 contactPoint.contactType（咨询热线） */
      contactType: '课程咨询',
    },
  },
} as const

export type Dictionary = typeof zh
