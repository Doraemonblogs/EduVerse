import type { SeedTeacher } from '../types'

/**
 * 讲师（人名、经历与机构名称均为虚构，仅用于演示）。
 */
export const teachers: SeedTeacher[] = [
  {
    slug: 'lin-yuqing',
    name: '林雨晴',
    title: '三维动画教研负责人',
    disciplines: ['3d-animation'],
    campus: 'beijing-haidian',
    yearsOfExperience: 12,
    specialties: ['角色表演动画', '镜头语言与分镜', 'Maya 动画工作流', '动画短片指导'],
    bio: [
      {
        p: '林雨晴从事三维动画工作十余年，参与过多部动画剧集与短片的角色动画制作，擅长用细腻的肢体与表情传递角色情绪。',
      },
      {
        p: '她的课堂以“观察”为起点，常带学员拆解生活中的真实动作，再回到软件里逐帧推敲。她希望学员先理解表演，再去追求技巧。',
      },
      { p: '2023 年加入数艺学院后，她主持了三维动画方向的毕业短片评审流程。' },
    ],
    experience: [
      { period: '2014–2018', org: '长风动画工作室', role: '角色动画师' },
      { period: '2018–2023', org: '蓝桉影业动画部', role: '动画组长' },
    ],
    courses: ['3d-animation-career', 'character-modeling-rigging'],
    featured: true,
  },
  {
    slug: 'zhou-mingyuan',
    name: '周明远',
    title: '三维与动态设计讲师',
    disciplines: ['3d-animation', 'motion-design'],
    campus: 'hangzhou-binjiang',
    yearsOfExperience: 9,
    specialties: ['Blender 建模与渲染', 'C4D 动态图形', '产品三维表现'],
    bio: [
      {
        p: '周明远早年在广告公司做三维产品表现，后来转向品牌动态图形与短片制作，对开源与商业三维软件的工作流都比较熟悉。',
      },
      {
        p: '他擅长把复杂的软件操作拆成一个个小练习，让入门学员每节课结束时都能完成一张完整画面，在持续产出中建立练习的信心。',
      },
    ],
    experience: [
      { period: '2017–2020', org: '橡果广告', role: '三维设计师' },
      { period: '2020–2024', org: '光谱动态设计工作室', role: '动态设计主管' },
    ],
    courses: ['blender-3d-foundation', 'c4d-motion', '3d-animation-career'],
    featured: false,
  },
  {
    slug: 'han-zheng',
    name: '韩征',
    title: '游戏美术教研负责人',
    disciplines: ['game-art'],
    campus: 'shanghai-xuhui',
    yearsOfExperience: 14,
    specialties: ['次世代场景制作', '模块化资产规划', 'PBR 材质流程', '美术项目排期'],
    bio: [
      {
        p: '韩征有十四年游戏美术从业经历，参与过多款主机与移动端项目的场景制作，熟悉从原画还原到引擎落地的完整流程。',
      },
      {
        p: '在团队中，他长期负责场景组的资产规范与进度管理，因此授课时格外看重“可复用”与“可交付”，要求学员在追求效果的同时兼顾性能。',
      },
      { p: '他认为作品集要讲清楚制作思路，常和学员一起逐条梳理每个项目的设计说明。' },
    ],
    experience: [
      { period: '2012–2016', org: '石岬游戏', role: '场景美术' },
      { period: '2016–2020', org: '北岸互娱', role: '资深场景美术' },
      { period: '2020–2024', org: '北岸互娱', role: '场景组主管' },
    ],
    courses: ['game-art-career', 'game-scene-design'],
    featured: true,
  },
  {
    slug: 'su-wan',
    name: '苏晚',
    title: '游戏美术讲师',
    disciplines: ['game-art'],
    campus: 'chengdu-gaoxin',
    yearsOfExperience: 8,
    specialties: ['UE5 场景搭建', '实时光照与后处理', '角色 PBR 贴图'],
    bio: [
      {
        p: '苏晚曾在游戏公司先后担任场景美术与技术美术，参与制定过多个虚幻引擎项目的光照与材质规范。',
      },
      {
        p: '她的课强调在引擎里“边做边看”，鼓励学员尽早把资产放进场景，借助实时反馈校正造型、比例与材质。',
      },
    ],
    experience: [
      { period: '2018–2021', org: '云杉游戏', role: '场景美术' },
      { period: '2021–2025', org: '霁雪互动', role: '技术美术' },
    ],
    courses: ['ue5-realtime-art', 'game-art-career'],
    featured: false,
  },
  {
    slug: 'cheng-yu',
    name: '程屿',
    title: '影视特效教研负责人',
    disciplines: ['vfx'],
    campus: 'shenzhen-nanshan',
    yearsOfExperience: 15,
    specialties: ['Houdini 程序化特效', '镜头合成', '摄像机反求', '特效流程管理'],
    bio: [
      {
        p: '程屿做了十五年影视特效，经手过电影、剧集与广告片中的大量特效镜头，擅长破碎、烟火与流体类效果。',
      },
      {
        p: '他习惯用真实项目的镜头需求来组织课程：从客户反馈、制作排期到交付规格，让学员提前熟悉工作室里的协作方式。',
      },
    ],
    experience: [
      { period: '2011–2016', org: '玄光视效', role: '特效师' },
      { period: '2016–2023', org: '朔风影像', role: '特效总监' },
    ],
    courses: ['vfx-compositing-career', 'houdini-fx'],
    featured: true,
  },
  {
    slug: 'xu-kexin',
    name: '许可欣',
    title: '剪辑与短视频讲师',
    disciplines: ['vfx', 'motion-design'],
    campus: 'guangzhou-tianhe',
    yearsOfExperience: 7,
    specialties: ['叙事剪辑', 'DaVinci Resolve 调色', '短视频策划与拍摄'],
    bio: [
      {
        p: '许可欣当过纪录片剪辑师，也做过品牌短视频导演，作品涵盖人物纪录、产品广告与知识类内容。',
      },
      {
        p: '她的课更像一个小型剧组：从选题会开始，经过拍摄、剪辑到调色，学员轮流承担不同岗位，在协作中理解每个环节的分量。',
      },
    ],
    experience: [
      { period: '2019–2022', org: '半岛纪录影像', role: '剪辑师' },
      { period: '2022–2025', org: '向阳内容工作室', role: '内容导演' },
    ],
    courses: ['video-editing-grading', 'short-video-creation', 'vfx-compositing-career'],
    featured: false,
  },
  {
    slug: 'shen-zhiwei',
    name: '沈知微',
    title: 'UI/UX 教研负责人',
    disciplines: ['ui-ux'],
    campus: 'hangzhou-binjiang',
    yearsOfExperience: 10,
    specialties: ['用户研究与可用性测试', '交互原型设计', 'B 端产品设计', '设计评审'],
    bio: [
      {
        p: '沈知微有十年互联网产品设计经验，做过社交、电商与企业服务类产品，完整经历过从用户研究到上线验证的设计流程。',
      },
      {
        p: '她常说设计不只是“画得好看”，更要帮用户把事情做成。课堂上，她要求学员为每个设计决策写下依据，再用测试结果去检验。',
      },
    ],
    experience: [
      { period: '2016–2019', org: '知行网络科技', role: '交互设计师' },
      { period: '2019–2025', org: '稻禾云服务', role: '用户体验设计经理' },
    ],
    courses: ['ui-ux-career', 'interaction-prototyping'],
    featured: true,
  },
  {
    slug: 'lu-yizhou',
    name: '陆一舟',
    title: 'UI 与视觉设计讲师',
    disciplines: ['ui-ux', 'graphic-design'],
    campus: 'shanghai-xuhui',
    yearsOfExperience: 8,
    specialties: ['Figma 设计系统', '图标与插画', '品牌视觉延展', '设计令牌管理'],
    bio: [
      {
        p: '陆一舟入行时做品牌视觉，之后进入互联网公司负责设计系统建设，清楚一套视觉规范如何一步步落到产品界面里。',
      },
      {
        p: '他喜欢在品牌与界面之间搭桥，课上常用同一个品牌案例串起标志、色彩与组件库，帮学员理解视觉一致性的意义。',
      },
    ],
    experience: [
      { period: '2018–2021', org: '松果品牌顾问', role: '视觉设计师' },
      { period: '2021–2025', org: '织网信息技术', role: '设计系统负责人' },
    ],
    courses: ['figma-design-system', 'ui-ux-career', 'brand-identity'],
    featured: false,
  },
  {
    slug: 'ye-qinghe',
    name: '叶青禾',
    title: '原画设计教研负责人',
    disciplines: ['concept-art'],
    campus: 'chengdu-gaoxin',
    yearsOfExperience: 11,
    specialties: ['角色与生物设计', '场景概念设计', '数字绘画基础', '世界观设定'],
    bio: [
      {
        p: '叶青禾从事游戏原画十一年，参与过多款奇幻与东方题材游戏的角色、场景设定，画风兼具写实质感与装饰趣味。',
      },
      {
        p: '她重视造型与色彩的基本功，也引导学员建立设计思维：画面里的每个元素都应当服务于世界观与玩法。',
      },
      { p: '速写本是她课上的必备工具，她会定期翻看学员的速写，逐一写下修改建议。' },
    ],
    experience: [
      { period: '2015–2019', org: '白鹭游戏', role: '角色原画师' },
      { period: '2019–2024', org: '苍梧互动', role: '原画组长' },
    ],
    courses: ['concept-art-career', 'character-concept', 'digital-painting-foundation'],
    featured: true,
  },
  {
    slug: 'fang-yining',
    name: '方以宁',
    title: '平面与品牌设计讲师',
    disciplines: ['graphic-design'],
    campus: 'guangzhou-tianhe',
    yearsOfExperience: 13,
    specialties: ['品牌识别系统', '包装设计', '电商视觉', '字体与版式'],
    bio: [
      {
        p: '方以宁在品牌设计领域工作了十三年，服务过餐饮、零售与文创类客户，完成过多套品牌识别与包装系统。',
      },
      {
        p: '她的教学从字体与版式入手，强调“先把信息排清楚”。电商视觉课上，她会拿真实的商品素材带学员练习卖点提炼与页面节奏。',
      },
    ],
    experience: [
      { period: '2013–2018', org: '一隅设计', role: '平面设计师' },
      { period: '2018–2024', org: '橙石品牌策略', role: '设计总监' },
    ],
    courses: ['graphic-design-career', 'brand-identity', 'ecommerce-visual'],
    featured: false,
  },
  {
    slug: 'tang-xiao',
    name: '唐骁',
    title: '动态设计教研负责人',
    disciplines: ['motion-design'],
    campus: 'shenzhen-nanshan',
    yearsOfExperience: 9,
    specialties: ['MG 动画', '三维动态图形', '栏目包装', '短视频视觉'],
    bio: [
      {
        p: '唐骁做过栏目包装、发布会视觉与品牌短片，熟悉 After Effects 与 Cinema 4D 结合的动态设计流程。',
      },
      {
        p: '在他看来，动态设计的核心是节奏感。课堂上他会让学员先选音乐再做动画，反复对比不同缓动曲线带来的情绪差异。',
      },
    ],
    experience: [
      { period: '2017–2020', org: '跃迁视觉', role: '动态设计师' },
      { period: '2020–2025', org: '帧率创意', role: '动态设计组长' },
    ],
    courses: ['motion-design-career', 'c4d-motion', 'short-video-creation'],
    featured: false,
  },
  {
    slug: 'gu-nanqiao',
    name: '顾南乔',
    title: '建筑可视化教研负责人',
    disciplines: ['arch-viz'],
    campus: 'beijing-haidian',
    yearsOfExperience: 16,
    specialties: ['建筑与景观表现', '室内空间表现', '实时渲染漫游', '方案汇报图'],
    bio: [
      {
        p: '顾南乔有十六年建筑与室内表现经验，参与过文旅、商业综合体与住宅类项目的效果图和漫游动画制作。',
      },
      {
        p: '她要求学员动手建模前先读懂图纸、了解设计意图，并把灯光与构图当作讲述空间故事的手段，而不只是渲染参数。',
      },
      { p: '近几年她持续关注实时渲染在方案沟通中的应用，并把相关工作流整理进了课程。' },
    ],
    experience: [
      { period: '2010–2016', org: '方寸建筑表现', role: '效果图设计师' },
      { period: '2016–2022', org: '原点空间视觉', role: '表现部主管' },
      { period: '2022–2024', org: '素白空间工作室', role: '可视化顾问' },
    ],
    courses: ['arch-viz-career', 'd5-realtime-rendering', 'interior-design-foundation'],
    featured: true,
  },
]
