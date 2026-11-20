import type { SalaryRef, SeedCourse } from '../types'

/** 长期班的薪资参考：虚构的演示数据，仅用于展示字段效果 */
function demoSalary(range: string, note: string): SalaryRef {
  return { range, source: '示例数据（虚构），仅用于演示', statDate: '2026 年 9 月', note }
}

export const courses: SeedCourse[] = [
  // ───────────── 三维动画 ─────────────
  {
    slug: '3d-animation-career',
    duration: { value: 7, unit: 'month' },
    schedule: '全日制（周一至周五）',
    campuses: [
      'beijing-haidian',
      'shanghai-xuhui',
      'guangzhou-tianhe',
      'chengdu-gaoxin',
      'hangzhou-binjiang',
    ],
    summary:
      '面向希望进入动画、影视与游戏行业的学员，用七个月完整走一遍三维动画生产流程：从造型基础、模型与贴图，到角色绑定、表演动画和灯光渲染，结业时完成一部小组动画短片与个人作品集。',
    highlights: [
      '按动画项目流程分阶段推进，每个阶段都有可展示的作品',
      '小班授课，讲师逐帧点评动画作业',
      '结业短片由学员组队完成，体验真实的镜头分工与协作',
      '提供作品集指导、模拟面试与职业规划辅导',
    ],
    audience: [
      '高中及以上学历，对动画和影视制作有浓厚兴趣',
      '美术、设计、影视相关专业的在校生或应届毕业生',
      '希望转行进入三维动画领域的在职人员',
      '自学过一段时间 Maya 或 Blender、想系统补齐流程的爱好者',
    ],
    stages: [
      {
        title: '造型基础与软件入门',
        duration: '4 周',
        goals: '熟悉 Maya 的操作逻辑，建立对形体、比例与结构的基本认识。',
        topics: [
          'Maya 界面与基础建模工具',
          '多边形建模与布线规范',
          '素描造型与形体结构训练',
          '简单道具与场景模型练习',
        ],
      },
      {
        title: '模型与材质贴图',
        duration: '6 周',
        goals: '能够独立完成一个中等复杂度角色的模型、UV 与贴图。',
        topics: [
          'ZBrush 雕刻基础与角色造型',
          '拓扑与 UV 拆分',
          'Substance 3D Painter 材质绘制',
          'Marvelous Designer 服装制作',
          '角色模型综合练习',
        ],
      },
      {
        title: '角色绑定',
        duration: '4 周',
        goals: '理解骨骼与蒙皮原理，为两足角色搭建可用的控制系统。',
        topics: ['骨骼创建与关节方向', '蒙皮权重绘制', 'IK/FK 切换与控制器搭建', '表情绑定入门'],
      },
      {
        title: '动画原理与角色表演',
        duration: '8 周',
        goals: '掌握动画基本法则，完成走跑跳、重量感与表演类镜头。',
        topics: [
          '弹跳球与钟摆练习',
          '走路、跑步与跳跃循环',
          '重量感与受力动作',
          '口型与面部表演',
          '多角色互动镜头',
        ],
      },
      {
        title: '灯光渲染与合成',
        duration: '3 周',
        goals: '能为镜头布置符合氛围的灯光，完成分层渲染与基础合成。',
        topics: ['三点布光与氛围光', 'Arnold 渲染器设置', '渲染分层与 AOV 输出', 'Nuke 基础合成'],
      },
      {
        title: '毕业短片与作品集',
        duration: '5 周',
        goals: '以小组形式完成一部动画短片，整理个人作品集并参加求职辅导。',
        topics: [
          '分镜与镜头预演',
          '小组分工与制作排期',
          '短片制作与版本迭代',
          '作品集剪辑与简历梳理',
          '模拟面试',
        ],
      },
    ],
    software: ['maya', 'zbrush', 'substance-painter', 'marvelous-designer', 'nuke', 'photoshop'],
    projects: [
      {
        title: '写实道具模型：旧式收音机',
        description:
          '从参考收集、建模、UV 到 PBR 贴图完整走一遍流程，练习布线规范与材质区分，是进入角色制作前的综合练习。',
      },
      {
        title: '风格化角色制作与绑定',
        description:
          '根据给定的角色设定完成雕刻、拓扑、贴图与绑定，最终输出可用于动画的角色资产和转台展示视频。',
      },
      {
        title: '毕业动画短片',
        description:
          '四到五人一组，从剧本、分镜到动画、灯光与合成，完成一部 1 至 2 分钟的短片，每位成员负责明确的制作环节。',
      },
    ],
    careerDirections: [
      {
        title: '三维模型师',
        description:
          '在动画或游戏团队中负责角色、道具与场景模型，课程中的雕刻与贴图训练可以直接充实作品集。',
      },
      {
        title: '三维动画师',
        description:
          '负责角色表演和镜头动画，课程中为期八周的动画训练与毕业短片，是这一方向作品集的主要来源。',
      },
      {
        title: '角色绑定师',
        description:
          '为角色搭建骨骼与控制系统，适合在绑定阶段表现突出、对技术流程感兴趣的同学继续深入。',
      },
      {
        title: '灯光渲染师',
        description:
          '负责镜头的光影氛围与渲染输出，需要在课程基础上继续积累对色彩与摄影的理解和判断。',
      },
    ],
    salaryRef: demoSalary(
      '7,000–13,000 元/月',
      '为三维动画初级岗位的示意区间，受城市、作品质量与个人经验影响较大，不作为培训效果的依据。',
    ),
    faqs: [
      {
        question: '零基础能跟上吗？',
        answer:
          '可以报名。课程前四周从软件操作和造型基础讲起，讲师会根据入学测评调整辅导重点。三维动画需要大量练习，建议每天预留课后练习时间。',
      },
      {
        question: '需要自备电脑吗？',
        answer:
          '线下校区的教室配有图形工作站，上课期间无需自备。若希望课后在家练习，建议准备带独立显卡、内存 16GB 以上的电脑，入学前可咨询老师获取配置建议。',
      },
      {
        question: '双师班和线下班有什么区别？',
        answer:
          '线下班由主讲讲师在教室面授；双师班由主讲讲师远程直播授课，教室内另有助教老师现场辅导答疑，两种班型的教学进度和作业要求一致。',
      },
    ],
    featured: true,
    seo: {
      title: '三维动画设计长期就业班｜EduVerse 数艺学院',
      description:
        '三维动画设计长期就业班为期 7 个月，系统学习 Maya 建模、ZBrush 雕刻、Substance 贴图、角色绑定、动画表演与灯光渲染，结业完成个人作品集与小组动画短片，线下与双师班型可选。',
      keywords: '三维动画培训班,Maya培训,三维动画课程,角色动画培训,动画设计学习',
    },
  },
  {
    slug: 'character-modeling-rigging',
    duration: { value: 10, unit: 'week' },
    schedule: '线上直播（每周三次）',
    campuses: [],
    summary:
      '面向已有三维基础的学员，集中训练角色高模雕刻、低模拓扑、贴图与绑定四个环节。十周内完成一个可用于动画的角色资产，补齐作品集中角色方向的短板。',
    highlights: [
      '聚焦角色资产，从雕刻到绑定一条线学透',
      '直播课后提供回放，作业由讲师录屏批注',
      '每两周一次作品集点评，及时调整方向',
    ],
    audience: [
      '已掌握 Maya 或 Blender 基础操作的学员',
      '想从道具、场景转向角色方向的模型师',
      '希望补强绑定技能的动画学习者',
    ],
    stages: [
      {
        title: '角色雕刻与拓扑',
        duration: '5 周',
        goals: '完成一个风格化角色的高模雕刻和规范低模。',
        topics: [
          '人体比例与肌肉结构',
          'ZBrush 雕刻流程与笔刷使用',
          '服装与配饰细节',
          '低模拓扑与布线检查',
        ],
      },
      {
        title: 'UV 贴图与材质',
        duration: '2 周',
        goals: '为角色拆分 UV、烘焙法线并完成 PBR 材质。',
        topics: ['UV 拆分与排布', '法线与 AO 烘焙', 'Substance 3D Painter 皮肤与布料材质'],
      },
      {
        title: '骨骼绑定与测试',
        duration: '3 周',
        goals: '为角色搭建基础控制系统，并通过动作测试检验蒙皮质量。',
        topics: ['骨骼搭建与命名规范', '蒙皮权重调整', '控制器与 IK/FK 设置', '动作测试与问题修正'],
      },
    ],
    software: ['maya', 'zbrush', 'substance-painter'],
    projects: [
      {
        title: '风格化角色资产',
        description:
          '根据提供的角色设定完成雕刻、拓扑、贴图与绑定，输出带控制器的 Maya 文件和一段 360° 转台视频。',
      },
      {
        title: '绑定动作测试',
        description:
          '用自己绑定的角色完成一段 5 秒左右的动作测试，检查关节变形是否自然，并据此修正蒙皮权重。',
      },
    ],
    careerDirections: [
      {
        title: '角色模型师',
        description:
          '在动画或游戏项目中负责角色资产制作，本课程的雕刻、贴图与转台展示练习可以直接充实作品集。',
      },
      {
        title: '绑定师（初级）',
        description:
          '协助资深绑定师完成角色骨骼与控制系统搭建，适合对技术流程感兴趣、愿意继续学习脚本的同学。',
      },
    ],
    faqs: [
      {
        question: '完全没用过三维软件可以报名吗？',
        answer:
          '本课程是提升班，默认学员已能独立完成简单模型。如果还没有接触过三维软件，建议先学习 Blender 三维入门班，再来报名。',
      },
      {
        question: '直播错过了怎么办？',
        answer:
          '每节直播课结束后都会生成回放，有效期覆盖整个学习周期，作业提交与讲师点评不受影响。',
      },
      {
        question: '用 Blender 能跟上吗？',
        answer:
          '雕刻部分以 ZBrush 为主，绑定部分以 Maya 演示。使用 Blender 的同学可以在理解原理后自行迁移，但讲师答疑会以 Maya 为准。',
      },
    ],
    featured: false,
    seo: {
      title: '角色建模与绑定提升班｜EduVerse 数艺学院',
      description:
        '角色建模与绑定提升班为期 10 周，线上直播授课，集中训练 ZBrush 角色雕刻、低模拓扑、Substance 贴图与 Maya 骨骼绑定，帮助有三维基础的学员完成一个可用于动画的角色资产。',
      keywords: '角色建模培训,ZBrush雕刻,角色绑定教程,Maya绑定,三维角色制作',
    },
  },
  {
    slug: 'blender-3d-foundation',
    duration: { value: 6, unit: 'week' },
    schedule: '线上直播晚班（每周二、四）',
    campuses: [],
    summary:
      '为零基础学员设计的三维入门课程。六周时间从 Blender 的界面操作讲起，依次学习建模、材质、灯光和渲染，结课时独立完成一幅小场景作品，为后续选择专业方向打基础。',
    highlights: [
      '晚间直播，适合在职与在校学员',
      'Blender 免费开源，无需额外购买软件',
      '每节课配套小练习，学完就能动手',
    ],
    audience: [
      '对三维设计感兴趣、尚未接触过三维软件的同学',
      '想了解三维动画或游戏美术、还在犹豫方向的学员',
      '希望拓展三维技能的平面设计师、插画师',
    ],
    stages: [
      {
        title: '界面操作与建模基础',
        duration: '3 周',
        goals: '熟悉 Blender 的视图操作与常用建模工具，能完成简单的道具模型。',
        topics: [
          '界面、视图与快捷键',
          '编辑模式与常用建模工具',
          '修改器的使用',
          '低多边形道具练习',
        ],
      },
      {
        title: '材质灯光与渲染',
        duration: '3 周',
        goals: '为模型赋予材质、布置灯光，并用 Cycles 或 EEVEE 输出作品。',
        topics: [
          '节点材质基础',
          'UV 展开与 Substance 3D Painter 初体验',
          '灯光与世界环境',
          'Cycles 与 EEVEE 渲染设置',
          '小场景综合练习',
        ],
      },
    ],
    software: ['blender', 'substance-painter', 'photoshop'],
    projects: [
      {
        title: '低多边形小岛场景',
        description:
          '用基础建模工具搭建一座带房屋、树木和小船的低多边形小岛，练习造型概括与配色，最终输出一张渲染图。',
      },
      {
        title: '桌面静物渲染',
        description:
          '选择一组日常静物进行建模，重点练习材质节点与灯光布置，并对比 Cycles 与 EEVEE 的渲染效果。',
      },
    ],
    careerDirections: [
      {
        title: '三维方向探索',
        description:
          '本课程以兴趣入门和方向探索为主，结课后可根据作品与兴趣选择三维动画、游戏美术或动态设计等方向继续深造。',
      },
      {
        title: '三维素材制作',
        description:
          '掌握基础建模与渲染后，可以为短视频、自媒体或电商页面制作简单的三维素材，在实践中积累经验。',
      },
    ],
    faqs: [
      {
        question: '电脑配置有什么要求？',
        answer:
          'Blender 对硬件相对友好，建议使用近五年内购买、内存 8GB 以上的电脑。若使用 Cycles 渲染，有独立显卡会更流畅。',
      },
      {
        question: '学完能达到什么水平？',
        answer:
          '能独立完成简单的模型、材质与灯光设置，并输出一张完整的小场景作品。若想从事相关工作，还需要继续学习专业方向课程。',
      },
    ],
    featured: false,
    seo: {
      title: 'Blender 三维入门班｜EduVerse 数艺学院',
      description:
        'Blender 三维入门班为期 6 周，线上晚间直播，从界面操作、多边形建模讲到材质节点、灯光与渲染，帮助零基础学员了解三维设计流程，并完成一幅个人小场景作品。',
      keywords: 'Blender入门,Blender教程,三维建模入门,零基础学三维,Blender培训',
    },
  },

  // ───────────── 游戏美术 ─────────────
  {
    slug: 'game-art-career',
    duration: { value: 8, unit: 'month' },
    schedule: '全日制（周一至周五）',
    campuses: [
      'shanghai-xuhui',
      'guangzhou-tianhe',
      'shenzhen-nanshan',
      'chengdu-gaoxin',
      'hangzhou-binjiang',
    ],
    summary:
      '按照游戏项目的资产生产流程设计，八个月内学习手绘风格与次世代道具、角色、场景制作，覆盖高模雕刻、低模拓扑、PBR 材质和 Unreal Engine 引擎呈现，结业时形成写实与风格化兼顾的作品集。',
    highlights: [
      '课程案例参照游戏资产规范，面数与贴图预算清晰',
      '写实与风格化双线训练，作品集更有层次',
      '引擎阶段在 Unreal Engine 中完成作品展示',
      '结业前安排作品集评审与行业讲师交流',
    ],
    audience: [
      '热爱游戏、希望参与游戏美术制作的高中及以上学历学员',
      '美术、动画、数字媒体等相关专业的在校生与毕业生',
      '从插画、传统美术或其他设计方向转型的从业者',
    ],
    stages: [
      {
        title: '美术基础与建模入门',
        duration: '4 周',
        goals: '建立造型与色彩基础，熟悉 3ds Max 与 Maya 的建模操作。',
        topics: [
          '结构素描与色彩基础',
          '3ds Max 多边形建模',
          '布线规范与面数控制',
          '简单道具建模练习',
        ],
      },
      {
        title: '手绘风格道具与场景',
        duration: '5 周',
        goals: '掌握风格化资产的造型概括与手绘贴图方法。',
        topics: ['风格化造型原理', 'UV 拆分与排布', '手绘贴图技法', '风格化小场景制作'],
      },
      {
        title: '次世代道具制作',
        duration: '6 周',
        goals: '完成写实道具的高低模、烘焙与 PBR 材质全流程。',
        topics: [
          '中模搭建',
          'ZBrush 硬表面与磨损雕刻',
          '低模拓扑与 UV',
          '法线烘焙与问题排查',
          'Substance 3D Painter 材质制作',
        ],
      },
      {
        title: '次世代角色制作',
        duration: '8 周',
        goals: '依据原画完成一个写实或风格化角色的全套资产。',
        topics: [
          '人体结构与比例',
          'ZBrush 角色雕刻',
          '服装与装备制作',
          '角色拓扑与贴图',
          '引擎内角色展示',
        ],
      },
      {
        title: 'UE 场景搭建与实时渲染',
        duration: '5 周',
        goals: '在 Unreal Engine 中完成模块化场景搭建、布光与展示镜头。',
        topics: ['模块化资产规划', '材质实例与地形', 'Lumen 光照与后期处理', 'Sequencer 镜头输出'],
      },
      {
        title: '作品集与求职准备',
        duration: '4 周',
        goals: '打磨个人作品集，完成简历与面试准备。',
        topics: [
          '作品集选题与补强',
          '展示图与转台视频制作',
          '简历与作品说明撰写',
          '模拟面试与测试题练习',
        ],
      },
    ],
    software: ['3ds-max', 'maya', 'zbrush', 'substance-painter', 'unreal-engine', 'photoshop'],
    projects: [
      {
        title: '风格化酒馆小场景',
        description:
          '以手绘风格完成一间酒馆的室内场景，包括桌椅、酒桶与灯具等道具，重点训练造型概括与手绘贴图。',
      },
      {
        title: '次世代写实角色',
        description:
          '根据原画设定完成角色的雕刻、拓扑、贴图与引擎展示，输出符合项目面数规范的完整角色资产。',
      },
      {
        title: 'UE 废墟场景',
        description:
          '规划模块化资产，在 Unreal Engine 中搭建一处废弃城镇场景，完成光照氛围设计与一段展示镜头。',
      },
    ],
    careerDirections: [
      {
        title: '游戏角色模型师',
        description:
          '负责角色高低模与贴图制作，课程中的次世代角色项目是作品集的核心部分，能体现造型与规范意识。',
      },
      {
        title: '游戏场景美术',
        description:
          '负责关卡环境资产与场景搭建，引擎阶段的场景项目可以直接用于展示空间组织与氛围表现能力。',
      },
      {
        title: '3D 道具美术',
        description:
          '制作武器、载具与交互道具，适合作为进入游戏项目组的起点，再逐步向角色或场景方向发展。',
      },
    ],
    salaryRef: demoSalary(
      '8,000–15,000 元/月',
      '为游戏美术初级岗位的示意区间，实际情况因城市、项目类型与作品水平有较大差异，不作为培训效果的依据。',
    ),
    faqs: [
      {
        question: '没有绘画基础可以学游戏美术吗？',
        answer:
          '可以报名。课程开始的四周会安排结构素描与色彩训练，帮助建立造型意识。建模方向对手绘的要求低于原画方向，但造型能力越好，进步越快。',
      },
      {
        question: '写实和风格化都要学吗？',
        answer:
          '都会涉及。前期通过风格化项目练习概括能力，中后期以次世代写实流程为主，结业作品集可根据个人兴趣侧重其中一种。',
      },
      {
        question: '上课时间是怎样安排的？',
        answer: '全日制面授，周一至周五白天上课，晚上为自习与作业时间，助教老师会在教室值班答疑。',
      },
    ],
    featured: true,
    seo: {
      title: '游戏美术长期就业班｜EduVerse 数艺学院',
      description:
        '游戏美术长期就业班为期 8 个月，线下面授，学习手绘风格与次世代写实资产制作、ZBrush 雕刻、Substance 材质和 Unreal Engine 场景搭建，结业时完成面向游戏行业的个人作品集。',
      keywords: '游戏美术培训班,次世代建模培训,游戏建模课程,3dmax游戏建模,UE5场景搭建',
    },
  },
  {
    slug: 'game-scene-design',
    duration: { value: 12, unit: 'week' },
    schedule: '周末班（周六、周日）',
    campuses: ['shanghai-xuhui', 'chengdu-gaoxin', 'hangzhou-binjiang'],
    summary:
      '专为有建模基础的学员开设的场景方向提升课程。十二周内围绕一个完整关卡场景，练习模块化资产规划、材质制作和引擎搭建，学会用空间、光影与道具讲述场景里的故事。',
    highlights: [
      '周末授课，在职学员也能安排时间',
      '双师模式：主讲远程授课，教室助教现场辅导',
      '以一个完整关卡贯穿全程，作品可直接放入作品集',
    ],
    audience: [
      '掌握 3ds Max 或 Maya 基础建模的学员',
      '希望从道具方向转向场景方向的游戏美术从业者',
      '对游戏关卡氛围设计感兴趣的建筑、环艺专业学生',
    ],
    stages: [
      {
        title: '场景规划与模块化资产',
        duration: '4 周',
        goals: '学会拆解参考，规划可复用的模块化资产与贴图。',
        topics: [
          '参考收集与场景拆解',
          '模块化尺寸与网格规范',
          '可平铺贴图与修饰贴图',
          '模块资产建模',
        ],
      },
      {
        title: '材质与道具细化',
        duration: '4 周',
        goals: '为场景主要资产完成材质，并制作体现故事感的道具。',
        topics: ['Substance 3D Painter 场景材质', '顶点色混合', '叙事道具设计', '植被与贴花'],
      },
      {
        title: '引擎搭建与氛围表现',
        duration: '4 周',
        goals: '在 Unreal Engine 中完成场景组装、布光与镜头输出。',
        topics: ['场景组装与构图', '光照与雾效', '后期处理与调色', '展示镜头与截图'],
      },
    ],
    software: ['3ds-max', 'substance-painter', 'unreal-engine', 'photoshop'],
    projects: [
      {
        title: '山间驿站关卡场景',
        description:
          '根据给定的概念图搭建一座山间驿站，包含建筑、道路与植被，重点练习模块化拼接与氛围光照。',
      },
      {
        title: '叙事道具组',
        description:
          '为场景设计一组能暗示故事背景的道具，如散落的行李、熄灭的篝火，练习用细节引导玩家视线。',
      },
    ],
    careerDirections: [
      {
        title: '游戏场景美术',
        description:
          '负责关卡环境资产与场景搭建，本课程的关卡项目能够集中体现空间组织与氛围表现能力。',
      },
      {
        title: '关卡美术（初级）',
        description:
          '与关卡策划配合，在引擎中完成场景摆放与美化，需要兼顾玩法动线与画面表现之间的关系。',
      },
    ],
    faqs: [
      {
        question: '双师课堂怎么上？',
        answer:
          '主讲讲师通过直播授课，教室内由助教老师组织练习、现场答疑，并把共性问题反馈给主讲讲师，在下节课集中讲解。',
      },
      {
        question: '周末两天都要到校吗？',
        answer:
          '是的，周六、周日全天在校区上课。如遇特殊情况无法到校，可观看直播回放补课，并在下次到校时向助教老师提问。',
      },
    ],
    featured: false,
    seo: {
      title: '游戏场景设计提升班｜EduVerse 数艺学院',
      description:
        '游戏场景设计提升班为期 12 周，周末双师授课，围绕一个完整关卡学习模块化资产规划、Substance 场景材质与 Unreal Engine 氛围搭建，适合有建模基础、想转向场景方向的学员。',
      keywords: '游戏场景设计,场景建模培训,UE场景搭建,模块化场景,游戏关卡美术',
    },
  },
  {
    slug: 'ue5-realtime-art',
    duration: { value: 8, unit: 'week' },
    schedule: '线上直播（每周三次）',
    campuses: [],
    summary:
      '面向已有三维建模经验的学员，系统学习 Unreal Engine 5 的材质、光照、植被与镜头工具。八周内完成一个实时渲染场景与一段展示镜头，提升作品在引擎中的呈现质量。',
    highlights: [
      '结合引擎当前版本，讲解 Nanite 与 Lumen 的实际用法',
      '每次直播配套工程文件，便于课后复现',
      '结课作品输出为可展示的实时镜头',
    ],
    audience: [
      '有 3ds Max、Maya 或 Blender 建模基础的学员',
      '希望把作品从离线渲染迁移到引擎展示的美术',
      '对实时渲染、虚拟制片方向感兴趣的同学',
    ],
    stages: [
      {
        title: '引擎基础与材质系统',
        duration: '3 周',
        goals: '熟悉 UE5 编辑器与资产导入流程，能制作常用的主材质与材质实例。',
        topics: ['编辑器操作与项目设置', '资产导入与 Nanite', '材质节点与材质实例', '地形材质混合'],
      },
      {
        title: '光照、植被与环境',
        duration: '3 周',
        goals: '运用 Lumen 与体积雾营造场景氛围，掌握植被与环境布置。',
        topics: ['Lumen 全局光照', '天空、雾与体积效果', '植被工具与程序化散布', '后期处理体积'],
      },
      {
        title: '镜头与作品输出',
        duration: '2 周',
        goals: '使用 Sequencer 制作一段展示镜头，并输出高质量视频。',
        topics: ['摄像机与镜头语言', 'Sequencer 动画轨道', 'Movie Render Queue 输出'],
      },
    ],
    software: ['unreal-engine', 'blender', 'substance-painter'],
    projects: [
      {
        title: '林间古寺实时场景',
        description:
          '使用课程提供的资产与自制模型搭建一处林间古寺，练习 Lumen 光照、植被散布与雾效氛围营造。',
      },
      {
        title: '30 秒展示镜头',
        description:
          '用 Sequencer 为场景设计镜头路线与节奏，最终通过 Movie Render Queue 输出一段高质量的展示视频。',
      },
    ],
    careerDirections: [
      {
        title: '游戏场景美术',
        description:
          '具备引擎搭建与光照能力后，可以更好地完成关卡环境制作，并在作品集中展示实时效果。',
      },
      {
        title: '实时渲染美术',
        description:
          '服务于虚拟制片、数字展厅或产品可视化等项目，负责引擎内的场景表现与镜头输出工作。',
      },
    ],
    faqs: [
      {
        question: '对电脑配置要求高吗？',
        answer:
          'UE5 对硬件要求较高，建议使用独立显卡（显存 8GB 以上）、32GB 内存和固态硬盘。报名前可以把电脑配置发给课程顾问确认。',
      },
      {
        question: '需要会编程吗？',
        answer:
          '不需要。课程以美术制作为主，蓝图只涉及简单的镜头与交互设置，讲师会逐步演示每一个操作。',
      },
    ],
    featured: false,
    seo: {
      title: 'UE5 实时美术提升班｜EduVerse 数艺学院',
      description:
        'UE5 实时美术提升班为期 8 周，线上直播授课，学习 Unreal Engine 5 材质系统、Lumen 光照、植被布置与 Sequencer 镜头输出，帮助有建模基础的学员完成高质量的实时渲染作品。',
      keywords: 'UE5培训,虚幻引擎教程,实时渲染学习,Lumen光照,UE5场景',
    },
  },

  // ───────────── 影视特效与后期 ─────────────
  {
    slug: 'vfx-compositing-career',
    duration: { value: 6, unit: 'month' },
    schedule: '全日制（周一至周五）',
    campuses: ['beijing-haidian', 'shanghai-xuhui', 'chengdu-gaoxin'],
    summary:
      '围绕影视后期的核心岗位设计，六个月内学习剪辑调色、数字合成和 Houdini 特效，以电影、剧集与广告镜头为案例反复练习，结业时完成一组合成与特效镜头的作品集。',
    highlights: [
      '使用实拍素材练习，贴近项目中会遇到的镜头问题',
      '合成与特效两条方向，中期可按兴趣侧重',
      '讲解镜头交付规范与版本管理，提前熟悉团队协作',
      '结业作品集附带镜头拆解，便于面试时讲清思路',
    ],
    audience: [
      '喜欢电影、短片，希望从事影视后期工作的学员',
      '影视、动画、数字媒体相关专业的在校生与毕业生',
      '有剪辑经验、希望进阶合成与特效的从业者',
    ],
    stages: [
      {
        title: '剪辑与调色基础',
        duration: '4 周',
        goals: '掌握剪辑叙事与调色流程，建立对画面节奏和色彩的判断。',
        topics: [
          'Premiere Pro 剪辑与叙事',
          '镜头组接与节奏',
          'DaVinci Resolve 一级校色',
          '风格化二级调色',
        ],
      },
      {
        title: 'AE 合成与跟踪',
        duration: '3 周',
        goals: '使用 After Effects 完成基础抠像、跟踪与图层合成。',
        topics: ['图层合成与遮罩', '蓝绿幕抠像', '二维与三维跟踪', '简单擦除与修复'],
      },
      {
        title: 'Nuke 数字合成',
        duration: '7 周',
        goals: '掌握节点式合成流程，完成影视级的多层合成镜头。',
        topics: [
          '节点逻辑与流程规范',
          '精细抠像与边缘处理',
          '多通道渲染合成',
          '光色匹配与镜头一体化',
          'Roto 与 Paint 擦除',
        ],
      },
      {
        title: 'Houdini 特效模拟',
        duration: '7 周',
        goals: '理解程序化思路，能制作常见的破碎、烟火和粒子效果。',
        topics: [
          'Houdini 界面与节点基础',
          '粒子系统',
          '刚体破碎',
          '烟火模拟（Pyro）',
          '特效渲染与输出',
        ],
      },
      {
        title: '综合镜头与作品集',
        duration: '4 周',
        goals: '完成包含实拍、三维与特效元素的综合镜头，并整理作品集。',
        topics: ['镜头规划与素材准备', '特效与合成整合', '镜头拆解视频制作', '简历与模拟面试'],
      },
    ],
    software: ['nuke', 'houdini', 'after-effects', 'premiere-pro', 'davinci-resolve'],
    projects: [
      {
        title: '绿幕人物合成',
        description:
          '对一段绿幕实拍素材进行抠像、背景替换与光色匹配，重点处理发丝边缘与运动模糊，使人物自然融入场景。',
      },
      {
        title: '建筑破碎特效镜头',
        description:
          '在 Houdini 中完成墙体破碎、碎石飞溅与烟尘效果，再到 Nuke 中与实拍画面合成，输出完整镜头。',
      },
      {
        title: '短片重剪与调色',
        description:
          '对一部 3 分钟的短片素材进行重新剪辑，并完成统一的风格化调色，输出调色前后的对比版本。',
      },
    ],
    careerDirections: [
      {
        title: '数字合成师',
        description:
          '负责影视镜头的抠像、跟踪与多层合成，Nuke 阶段的训练与综合镜头可以作为主要作品。',
      },
      {
        title: '特效师（FX）',
        description:
          '负责烟火、破碎、粒子等效果制作，适合在 Houdini 阶段表现突出、愿意深入程序化流程的同学。',
      },
      {
        title: '剪辑与调色师',
        description:
          '服务于广告、宣传片与新媒体团队，课程前期的剪辑调色训练可以帮助较快上手相关工作。',
      },
    ],
    salaryRef: demoSalary(
      '7,000–13,000 元/月',
      '为后期制作初级岗位的示意区间，项目制团队的收入结构差异较大，不作为培训效果的依据。',
    ),
    faqs: [
      {
        question: '合成和特效需要都学吗？',
        answer:
          '都会学习。前半程打好合成基础，Houdini 阶段学习特效思路，最后的综合镜头会把两者结合起来，作品集可按个人兴趣侧重。',
      },
      {
        question: '学 Houdini 需要编程基础吗？',
        answer: '不需要。课程以节点操作为主，只会用到少量简单表达式，讲师会结合案例逐步讲解。',
      },
      {
        question: '课程用的素材从哪里来？',
        answer:
          '课程使用学院自行拍摄与制作的练习素材，覆盖绿幕人物、街景与室内等常见类型，仅供课堂学习使用。',
      },
    ],
    featured: true,
    seo: {
      title: '影视特效与合成长期就业班｜EduVerse 数艺学院',
      description:
        '影视特效与合成长期就业班为期 6 个月，线下面授，系统学习剪辑调色、After Effects 与 Nuke 数字合成、Houdini 特效模拟，用实拍素材完成综合镜头，结业形成影视后期方向的作品集。',
      keywords: '影视后期培训班,Nuke合成培训,Houdini特效培训,影视特效学习,调色培训',
    },
  },
  {
    slug: 'houdini-fx',
    duration: { value: 12, unit: 'week' },
    schedule: '线上直播（每周三次）',
    campuses: [],
    summary:
      '为有一定三维或后期基础的学员开设的 Houdini 专项课程。十二周内由浅入深学习节点逻辑、粒子、刚体破碎、烟火与流体模拟，独立完成两个可放入作品集的特效镜头。',
    highlights: [
      '从节点思维讲起，降低程序化软件的上手门槛',
      '每个模块配套案例工程，便于对照练习',
      '讲师逐镜头点评，指出模拟参数与渲染问题',
    ],
    audience: [
      '有 Maya、C4D 或 Blender 使用经验的三维学员',
      '希望拓展特效能力的合成师与动画师',
      '对程序化制作和模拟效果感兴趣的技术型美术',
    ],
    stages: [
      {
        title: '节点思维与 VEX 入门',
        duration: '4 周',
        goals: '理解 Houdini 的数据流与属性概念，能用节点完成程序化建模。',
        topics: ['SOP 节点与属性', '程序化建模案例', 'VEX 表达式基础', '粒子发射与基础力场'],
      },
      {
        title: '破碎与烟火',
        duration: '4 周',
        goals: '掌握刚体破碎与 Pyro 烟火的制作流程与调参思路。',
        topics: ['Voronoi 破碎与约束', 'RBD 解算', 'Pyro 烟火模拟', '缓存管理'],
      },
      {
        title: '流体与镜头输出',
        duration: '4 周',
        goals: '完成流体模拟，并把特效渲染结果输出到合成软件中整合。',
        topics: ['FLIP 流体基础', '白水与飞溅', '特效渲染分层', 'Nuke 中的特效合成'],
      },
    ],
    software: ['houdini', 'nuke', 'maya'],
    projects: [
      {
        title: '陨石撞击地面',
        description:
          '完成陨石落地引发的地面破碎、碎石飞溅与烟尘扩散，练习刚体解算与 Pyro 模拟之间的配合。',
      },
      {
        title: '水杯倾倒流体镜头',
        description:
          '模拟液体从杯中倾倒并溅起水花的过程，学习 FLIP 流体参数调整与渲染分层输出的方法。',
      },
    ],
    careerDirections: [
      {
        title: '特效师（FX）',
        description:
          '在影视、广告或游戏项目中负责模拟类特效，本课程完成的两个镜头可作为作品集中的特效部分。',
      },
      {
        title: '游戏特效美术',
        description:
          '借助 Houdini 制作序列帧与程序化特效资源，配合游戏引擎完成技能释放与环境效果。',
      },
    ],
    faqs: [
      {
        question: 'Houdini 难学吗？',
        answer:
          'Houdini 的思路与其他三维软件不同，入门阶段需要适应节点式的工作方式。课程前四周专门讲解这部分，跟着案例多练习，大多数同学能逐步上手。',
      },
      {
        question: '模拟很吃电脑配置吗？',
        answer:
          '流体与烟火模拟对内存和处理器要求较高，建议 32GB 以上内存。课程案例会提供精度可调的版本，配置一般的电脑也能完成练习。',
      },
    ],
    featured: false,
    seo: {
      title: 'Houdini 特效提升班｜EduVerse 数艺学院',
      description:
        'Houdini 特效提升班为期 12 周，线上直播授课，学习节点思维、VEX 基础、刚体破碎、Pyro 烟火与 FLIP 流体模拟，并在 Nuke 中完成特效合成，帮助学员做出可展示的特效镜头。',
      keywords: 'Houdini培训,Houdini教程,特效模拟,影视特效学习,FX特效',
    },
  },
  {
    slug: 'video-editing-grading',
    duration: { value: 6, unit: 'week' },
    schedule: '线上直播晚班（每周一、三、五）',
    campuses: [],
    summary:
      '面向零基础学员的剪辑与调色入门课程。六周内学习 Premiere Pro 剪辑、声音处理、字幕包装和 DaVinci Resolve 调色，完成一支 Vlog 和一支产品短片，掌握视频后期的基本流程。',
    highlights: [
      '晚间直播，适合上班族与在校学生',
      '剪辑与调色一起学，成片更完整',
      '提供练习素材，没有拍摄设备也能完成作业',
    ],
    audience: [
      '想学习视频剪辑、记录生活的零基础学员',
      '需要为工作制作宣传视频的市场、运营人员',
      '准备进入影视后期行业、想先打好基础的同学',
    ],
    stages: [
      {
        title: '剪辑基础与叙事',
        duration: '3 周',
        goals: '熟练使用 Premiere Pro 完成素材整理、粗剪和精剪。',
        topics: [
          '项目管理与素材整理',
          '剪辑工具与快捷键',
          '镜头组接与节奏',
          '声音处理与配乐',
          '字幕与简单包装',
        ],
      },
      {
        title: '调色与成片输出',
        duration: '3 周',
        goals: '使用 DaVinci Resolve 完成校色与风格化调色，并按平台要求输出。',
        topics: [
          '示波器与色彩基础',
          '一级校色',
          '二级调色与肤色处理',
          '风格化 LUT 的使用',
          '多平台导出设置',
        ],
      },
    ],
    software: ['premiere-pro', 'davinci-resolve', 'after-effects'],
    projects: [
      {
        title: '城市漫步 Vlog',
        description:
          '使用课程提供的城市街景素材剪辑一支 2 分钟的 Vlog，练习叙事结构、音乐卡点与字幕设计。',
      },
      {
        title: '产品宣传短片',
        description:
          '为一款虚构的保温杯剪辑 30 秒宣传片，完成统一调色和简单包装，并输出横屏与竖屏两个版本。',
      },
    ],
    careerDirections: [
      {
        title: '视频剪辑师',
        description:
          '为新媒体、广告或企业宣传团队剪辑视频内容，本课程可以帮助打好剪辑流程与软件操作基础。',
      },
      {
        title: '新媒体内容制作',
        description:
          '在品牌或机构的新媒体团队中负责视频的剪辑、包装与发布，需要兼顾内容质量和更新效率。',
      },
    ],
    faqs: [
      {
        question: '需要自己准备拍摄设备吗？',
        answer:
          '不需要。课程提供完整的练习素材，作业可以全部使用课程素材完成。如果有手机或相机，也欢迎用自己拍摄的素材练习。',
      },
      {
        question: '笔记本电脑能用吗？',
        answer:
          '可以。剪辑 1080P 素材时，内存 16GB 的笔记本基本够用；处理 4K 素材可以使用代理剪辑，讲师会在课上演示具体做法。',
      },
    ],
    featured: false,
    seo: {
      title: '视频剪辑与调色入门班｜EduVerse 数艺学院',
      description:
        '视频剪辑与调色入门班为期 6 周，线上晚间直播，学习 Premiere Pro 剪辑叙事、声音与字幕处理，以及 DaVinci Resolve 校色与风格化调色，适合零基础学员系统了解视频后期流程。',
      keywords: '视频剪辑培训,Premiere教程,达芬奇调色,剪辑入门,视频调色学习',
    },
  },

  // ───────────── UI/UX ─────────────
  {
    slug: 'ui-ux-career',
    duration: { value: 5, unit: 'month' },
    schedule: '全日制（周一至周五）',
    campuses: ['beijing-haidian', 'shanghai-xuhui', 'shenzhen-nanshan', 'hangzhou-binjiang'],
    summary:
      '围绕互联网产品设计岗位，五个月内学习视觉基础、移动端与网页界面、交互流程、用户研究和设计系统，用三个完整的产品项目串联知识，结业时形成兼顾视觉与体验思路的作品集。',
    highlights: [
      '以产品项目驱动学习，作品集呈现完整的设计过程',
      '线下面授与线上直播两种形式，学习进度一致',
      '引入可用性测试练习，学会用证据支持设计决策',
      '讲解与开发协作的交付规范，减少入职后的适应期',
    ],
    audience: [
      '对界面设计、产品体验感兴趣的高中及以上学历学员',
      '设计、计算机、心理学等相关专业的在校生与毕业生',
      '希望转型产品设计的平面设计师、前端开发或运营人员',
    ],
    stages: [
      {
        title: '视觉设计基础',
        duration: '4 周',
        goals: '建立版式、色彩与字体的审美基础，熟练使用 Figma。',
        topics: ['设计构成与版式', '色彩与字体搭配', '图标设计', 'Figma 基础操作'],
      },
      {
        title: '移动端 UI 设计',
        duration: '5 周',
        goals: '掌握 iOS 与 Android 设计规范，完成一款应用的界面设计。',
        topics: [
          '移动端设计规范',
          '组件与样式库',
          '界面布局与信息层级',
          '深色模式与多尺寸适配',
          '标注与切图交付',
        ],
      },
      {
        title: '交互设计与用户研究',
        duration: '5 周',
        goals: '学会从用户需求出发梳理流程，并用原型和测试验证方案。',
        topics: [
          '用户访谈与画像',
          '信息架构与流程图',
          '低保真与高保真原型',
          '可用性测试',
          '设计走查',
        ],
      },
      {
        title: '网页与后台产品设计',
        duration: '3 周',
        goals: '完成响应式网页与数据后台的界面设计。',
        topics: ['栅格系统与响应式布局', '后台表单与表格设计', '数据可视化基础'],
      },
      {
        title: '设计系统与作品集',
        duration: '4 周',
        goals: '搭建小型设计系统，整理作品集并完成求职准备。',
        topics: [
          '组件库与设计令牌',
          '动效说明与 After Effects 演示',
          '作品集叙事结构',
          '简历与模拟面试',
        ],
      },
    ],
    software: ['figma', 'photoshop', 'illustrator', 'after-effects'],
    projects: [
      {
        title: '社区读书应用设计',
        description:
          '从用户访谈开始，完成一款社区读书应用的需求梳理、信息架构、交互原型与视觉稿，并进行一轮可用性测试。',
      },
      {
        title: '门店管理后台',
        description:
          '为一家虚构的连锁咖啡店设计门店管理后台，包含订单、库存与数据看板，练习复杂表单与表格设计。',
      },
      {
        title: '户外品牌官网改版',
        description:
          '为一个虚构的户外品牌重新设计官网，输出桌面端与移动端响应式方案，并整理配套的组件规范。',
      },
    ],
    careerDirections: [
      {
        title: 'UI 设计师',
        description:
          '负责应用与网页的界面视觉设计，课程中的移动端项目和设计系统是作品集里的重点内容。',
      },
      {
        title: '交互设计师',
        description:
          '负责流程梳理与原型设计，适合在用户研究阶段表现出色、善于用逻辑表达设计思路的同学。',
      },
      {
        title: '用户体验设计师',
        description:
          '综合运用调研、测试与设计能力推动产品体验优化，需要在实际工作中持续积累业务理解。',
      },
    ],
    salaryRef: demoSalary(
      '8,000–14,000 元/月',
      '为互联网行业初级设计岗位的示意区间，因城市和团队规模差异较大，不作为培训效果的依据。',
    ),
    faqs: [
      {
        question: '线上班和线下班有什么区别？',
        answer:
          '两种班型的课程大纲、项目和作业要求相同。线下班在校区面授，线上班通过直播上课，作业由讲师在线批改，并定期安排视频点评。',
      },
      {
        question: '需要会画画吗？',
        answer:
          '不需要专业的绘画能力。UI/UX 设计更看重版式、色彩和逻辑思维，课程会从设计基础讲起，图标绘制也会在软件中逐步练习。',
      },
      {
        question: '需要自备电脑吗？',
        answer:
          '线下班教室提供电脑；线上班需要自备一台能流畅运行 Figma 与 Photoshop 的电脑，Windows 或 macOS 均可。',
      },
    ],
    featured: true,
    seo: {
      title: 'UI/UX 设计长期就业班｜EduVerse 数艺学院',
      description:
        'UI/UX 设计长期就业班为期 5 个月，线下与线上班型可选，系统学习视觉基础、移动端与网页界面、交互原型、用户研究和 Figma 设计系统，通过三个产品项目建立完整作品集。',
      keywords: 'UI设计培训班,UX设计课程,交互设计培训,Figma培训,UI设计学习',
    },
  },
  {
    slug: 'interaction-prototyping',
    duration: { value: 8, unit: 'week' },
    schedule: '线上直播（每周三次）',
    campuses: [],
    summary:
      '面向已有界面设计基础的学员，集中提升交互设计能力。八周内学习需求分析、信息架构、流程设计和高保真原型，并通过可用性测试打磨方案，学会讲清每个设计决策背后的理由。',
    highlights: [
      '用贴近实际的产品需求练习，从问题出发做设计',
      '学习可交互原型制作，方案演示更直观',
      '小组互评与讲师点评结合，锻炼设计表达',
    ],
    audience: [
      '有 UI 设计基础、想提升交互思维的设计师',
      '希望转向交互或体验设计岗位的从业者',
      '需要与设计团队协作的产品经理',
    ],
    stages: [
      {
        title: '需求分析与信息架构',
        duration: '3 周',
        goals: '学会拆解需求、定义用户任务，并输出合理的信息架构。',
        topics: ['用户画像与使用场景', '竞品分析方法', '卡片分类与信息架构', '任务流程图'],
      },
      {
        title: '原型设计与动效',
        duration: '3 周',
        goals: '使用 Figma 制作可交互原型，并为关键操作设计动效。',
        topics: ['低保真线框图', 'Figma 原型与变量', '微交互与转场设计', 'After Effects 动效演示'],
      },
      {
        title: '可用性测试与迭代',
        duration: '2 周',
        goals: '组织一次小规模可用性测试，根据结果迭代方案。',
        topics: ['测试任务设计', '观察记录与问题归类', '方案迭代与复盘汇报'],
      },
    ],
    software: ['figma', 'after-effects', 'illustrator'],
    projects: [
      {
        title: '社区团购下单流程优化',
        description:
          '针对一款虚构社区团购应用的下单流程进行分析，找出操作痛点，输出优化后的流程图与高保真原型。',
      },
      {
        title: '智能家居控制面板原型',
        description:
          '为一套虚构的智能家居系统设计控制面板，完成可交互原型和关键动效，并通过测试检验易用性。',
      },
    ],
    careerDirections: [
      {
        title: '交互设计师',
        description:
          '负责产品流程、信息架构和原型设计，本课程的两个项目能完整展示从分析到验证的设计过程。',
      },
      {
        title: 'UI 设计师（交互方向）',
        description:
          '在视觉设计工作中更多参与流程与体验讨论，用原型表达方案，逐步向综合型的产品设计师方向发展。',
      },
    ],
    faqs: [
      {
        question: '没有 UI 基础可以学吗？',
        answer:
          '建议先具备基本的界面设计能力再报名。如果完全零基础，可以先了解 UI/UX 设计长期就业班，或先学习 Figma 设计系统实战班。',
      },
      {
        question: '可用性测试需要找真实用户吗？',
        answer:
          '课程中以同学互测为主，讲师会讲解如何招募测试对象、如何设计测试任务，帮助你在实际工作中独立组织测试。',
      },
    ],
    featured: false,
    seo: {
      title: '交互设计与原型提升班｜EduVerse 数艺学院',
      description:
        '交互设计与原型提升班为期 8 周，线上直播授课，学习需求分析、信息架构、流程设计、Figma 可交互原型与可用性测试，帮助有 UI 基础的设计师建立系统的交互设计方法。',
      keywords: '交互设计培训,原型设计,Figma原型,用户体验设计,可用性测试',
    },
  },
  {
    slug: 'figma-design-system',
    duration: { value: 6, unit: 'week' },
    schedule: '线上直播晚班（每周二、四）',
    campuses: [],
    summary:
      '聚焦 Figma 的进阶用法与设计系统搭建。六周内学习自动布局、组件变体、变量与样式管理，并以一个中型产品为例搭建可维护的组件库，提升团队协作和设计交付效率。',
    highlights: [
      '围绕一套完整组件库展开，学完即可复用到工作中',
      '讲解变量与多主题切换，覆盖深色模式等常见需求',
      '介绍与开发对接的命名和交付约定',
    ],
    audience: [
      '已在使用 Figma、想提升效率的 UI 设计师',
      '负责团队设计规范建设的设计师',
      '希望理解设计系统的前端开发与产品经理',
    ],
    stages: [
      {
        title: 'Figma 进阶技巧',
        duration: '2 周',
        goals: '熟练使用自动布局、组件与变体，提高日常作图效率。',
        topics: ['自动布局与约束', '组件、实例与变体', '样式与团队库', '常用插件'],
      },
      {
        title: '设计令牌与变量',
        duration: '2 周',
        goals: '理解设计令牌的概念，用变量管理颜色、间距与主题。',
        topics: ['设计令牌分层', '颜色与间距变量', '多主题与深色模式', '响应式断点'],
      },
      {
        title: '组件库搭建与交付',
        duration: '2 周',
        goals: '搭建一套小型组件库，编写使用文档并模拟交付。',
        topics: [
          '基础组件与业务组件',
          '组件文档与使用说明',
          '版本管理与更新发布',
          '与开发的对接流程',
        ],
      },
    ],
    software: ['figma', 'illustrator', 'photoshop'],
    projects: [
      {
        title: '在线学习产品组件库',
        description:
          '为一款虚构的在线学习产品搭建组件库，包含按钮、表单、卡片与导航等组件，并支持浅色与深色两套主题。',
      },
      {
        title: '设计规范文档',
        description:
          '为组件库编写配套的使用规范，说明颜色、字体、间距的取值逻辑，以及每个组件适用与不适用的场景。',
      },
    ],
    careerDirections: [
      {
        title: 'UI 设计师',
        description:
          '掌握设计系统方法后，能在团队中更高效地完成界面设计，并参与规范的建设与维护工作。',
      },
      {
        title: '设计系统设计师',
        description:
          '在中大型产品团队中负责组件库与设计规范的长期维护，需要较强的系统思维与跨团队沟通能力。',
      },
    ],
    faqs: [
      {
        question: '需要付费版 Figma 吗？',
        answer:
          '课程大部分内容使用免费版即可完成。涉及团队库发布等功能时，讲师会说明替代做法，不影响作业提交。',
      },
      {
        question: '课程会讲代码吗？',
        answer:
          '不会讲编程，但会介绍设计令牌如何对应到前端变量，帮助你理解开发同事的工作方式，让交付更加顺畅。',
      },
    ],
    featured: false,
    seo: {
      title: 'Figma 设计系统实战班｜EduVerse 数艺学院',
      description:
        'Figma 设计系统实战班为期 6 周，线上晚间直播，学习自动布局、组件变体、变量与多主题管理，以一个中型产品为例搭建组件库并编写规范文档，帮助设计师提升团队协作效率。',
      keywords: 'Figma教程,设计系统,组件库搭建,Figma变量,UI规范',
    },
  },

  // ───────────── 原画与概念设计 ─────────────
  {
    slug: 'concept-art-career',
    duration: { value: 8, unit: 'month' },
    schedule: '全日制（周一至周五）',
    campuses: ['beijing-haidian', 'guangzhou-tianhe', 'chengdu-gaoxin', 'hangzhou-binjiang'],
    summary:
      '面向游戏与动画行业的原画岗位，八个月内从素描、色彩和人体结构打牢基础，再进阶角色设计、场景概念与商业插画，辅以 Blender 三维辅助流程，结业时完成有个人风格的原画作品集。',
    highlights: [
      '入学进行绘画测评，按基础分组安排练习强度',
      '基础训练与设计训练穿插进行，避免只练不设计',
      '引入三维辅助构图，提高复杂场景的出图效率',
      '定期举办作品展评，邀请行业讲师现场点评',
    ],
    audience: [
      '热爱绘画、希望从事游戏或动画原画工作的学员',
      '美术、动画、插画相关专业的在校生与毕业生',
      '有一定手绘基础、想系统提升设计能力的绘画爱好者',
    ],
    stages: [
      {
        title: '造型与色彩基础',
        duration: '6 周',
        goals: '提升结构理解、透视与明暗表现，建立色彩关系意识。',
        topics: [
          '几何体与结构素描',
          '一点、两点与三点透视',
          '光影与明暗关系',
          '色彩理论与色彩写生',
          '数位板与 Photoshop 绘画基础',
        ],
      },
      {
        title: '人体与动态',
        duration: '5 周',
        goals: '掌握人体比例、肌肉结构与动态表现。',
        topics: ['人体比例与骨骼', '肌肉结构', '速写与动态线', '手、脚与头部刻画'],
      },
      {
        title: '角色设计',
        duration: '7 周',
        goals: '能根据世界观设定完成角色设计与三视图。',
        topics: [
          '剪影与造型语言',
          '服装与材质表现',
          '道具与武器设计',
          '角色三视图',
          '风格化与写实角色',
          'ZBrush 快速概念雕刻',
        ],
      },
      {
        title: '场景概念设计',
        duration: '7 周',
        goals: '能完成氛围稿与场景设定，掌握三维辅助构图方法。',
        topics: [
          '构图与视觉引导',
          '氛围光与色彩脚本',
          '建筑与自然元素',
          'Blender 搭建草模辅助构图',
          '场景设定图',
        ],
      },
      {
        title: '商业插画与美宣',
        duration: '4 周',
        goals: '完成高完成度的插画作品，了解美宣图的制作要求。',
        topics: ['插画叙事与构图', '高完成度刻画', '美宣版式与留白', '商业项目沟通流程'],
      },
      {
        title: '作品集与求职准备',
        duration: '4 周',
        goals: '整理作品集，完成测试题练习与面试准备。',
        topics: ['作品集结构与筛选', '原画测试题练习', '简历撰写', '模拟面试'],
      },
    ],
    software: ['photoshop', 'procreate', 'blender', 'zbrush'],
    projects: [
      {
        title: '东方奇幻角色设定',
        description:
          '围绕一个原创的东方奇幻世界观设计三名角色，输出造型草图、配色方案与三视图，练习风格统一与差异化。',
      },
      {
        title: '海港小镇场景概念',
        description:
          '用 Blender 搭建草模辅助构图，完成一座海港小镇的日景与夜景氛围图，以及主要建筑的设定稿。',
      },
      {
        title: '版本美宣插画',
        description:
          '模拟游戏版本上线的需求，绘制一张包含角色与场景的宣传插画，并按要求预留文字排版区域。',
      },
    ],
    careerDirections: [
      {
        title: '角色原画师',
        description:
          '负责角色造型与三视图设计，课程中的角色设定项目是作品集的主要组成部分，能体现设计思路。',
      },
      {
        title: '场景概念设计师',
        description:
          '负责环境与氛围设定，适合空间感强、喜欢构建世界观、愿意研究建筑与自然元素的同学。',
      },
      {
        title: '插画师',
        description:
          '承接宣传插画、封面与美宣需求，可以在团队中发展，也可以在积累作品后承接独立项目。',
      },
    ],
    salaryRef: demoSalary(
      '7,000–14,000 元/月',
      '为原画方向初级岗位的示意区间，作品水平对收入影响明显，不作为培训效果的依据。',
    ),
    faqs: [
      {
        question: '没有绘画基础可以报名吗？',
        answer:
          '可以报名，但原画方向对基础功要求较高。入学时会进行绘画测评，零基础学员会在基础阶段安排更多练习，也需要投入较多课后时间。',
      },
      {
        question: '需要自备数位板吗？',
        answer:
          '校区教室配备数位屏供上课使用。若想课后练习，建议自备一块数位板，入门款即可满足大部分需求。',
      },
      {
        question: '用 iPad 画画可以吗？',
        answer:
          '课后练习可以使用 iPad 与 Procreate，但课堂教学与作业交付以 Photoshop 为主，建议两者都熟悉。',
      },
    ],
    featured: true,
    seo: {
      title: '原画与概念设计长期就业班｜EduVerse 数艺学院',
      description:
        '原画与概念设计长期就业班为期 8 个月，线下面授，从素描色彩、人体结构到角色设计、场景概念与商业插画，结合 Blender 三维辅助构图，帮助学员完成面向游戏与动画行业的原画作品集。',
      keywords: '原画培训班,游戏原画培训,概念设计课程,角色原画,场景原画培训',
    },
  },
  {
    slug: 'character-concept',
    duration: { value: 12, unit: 'week' },
    schedule: '周末班（周六、周日）',
    campuses: ['guangzhou-tianhe', 'chengdu-gaoxin'],
    summary:
      '为有绘画基础的学员开设的角色原画提升课程。十二周内集中训练剪影设计、服装道具、角色三视图与表情动态，在周末双师课堂中完成一组风格统一的原创角色设定。',
    highlights: [
      '周末到校学习，主讲直播授课，助教现场改画',
      '从世界观出发设计角色，而不是单张临摹',
      '每周作业讲评，及时纠正造型与结构问题',
    ],
    audience: [
      '有素描与人体基础、想专注角色设计的学员',
      '希望提升设计能力的插画师与美术专业学生',
      '准备投递原画岗位、需要补强角色作品的求职者',
    ],
    stages: [
      {
        title: '剪影与造型语言',
        duration: '4 周',
        goals: '学会用剪影和形状语言快速探索角色方案。',
        topics: ['剪影草图练习', '形状语言与性格表达', '比例夸张与风格化', '设计方案筛选'],
      },
      {
        title: '服装、道具与材质',
        duration: '4 周',
        goals: '能为角色设计合理的服饰结构与道具，并区分不同材质。',
        topics: ['服装结构与褶皱', '时代与文化元素参考', '武器与配饰设计', '金属、皮革与布料表现'],
      },
      {
        title: '角色设定稿输出',
        duration: '4 周',
        goals: '完成角色三视图、表情与动态设定，达到可交付建模的标准。',
        topics: ['三视图规范', '表情与动态设定', '配色方案', 'ZBrush 辅助验证造型'],
      },
    ],
    software: ['photoshop', 'procreate', 'zbrush'],
    projects: [
      {
        title: '原创角色设定集',
        description:
          '围绕一个原创世界观设计三名主要角色，输出剪影探索、配色方案、三视图与表情设定，形成完整的设定集。',
      },
      {
        title: '职业装备设计',
        description:
          '为同一角色设计战士、法师与游侠三套职业装备，练习在保持角色辨识度的前提下进行差异化设计。',
      },
    ],
    careerDirections: [
      {
        title: '角色原画师',
        description:
          '负责游戏或动画项目中的角色设计与设定稿输出，本课程完成的设定集可以作为作品集中的角色部分。',
      },
      {
        title: '角色插画师',
        description:
          '为宣传物料、卡牌或出版物绘制角色插画，需要扎实的造型能力、稳定的出图质量与一定的叙事意识。',
      },
    ],
    faqs: [
      {
        question: '需要什么基础？',
        answer:
          '建议具备基本的素描与人体结构能力，并能使用 Photoshop 或 Procreate 绘画。入学前可以提交几张作品，老师会评估是否合适。',
      },
      {
        question: '周末缺课可以补吗？',
        answer:
          '可以观看主讲讲师的直播回放补课，作业仍需按时提交，助教老师会在下次到校时补充讲评。',
      },
    ],
    featured: false,
    seo: {
      title: '角色原画提升班｜EduVerse 数艺学院',
      description:
        '角色原画提升班为期 12 周，周末双师授课，集中训练剪影设计、服装道具、角色三视图与表情动态，完成一组风格统一的原创角色设定，适合有绘画基础、想专注角色方向的学员。',
      keywords: '角色原画培训,角色设计,原画提升,角色三视图,游戏角色原画',
    },
  },
  {
    slug: 'digital-painting-foundation',
    duration: { value: 8, unit: 'week' },
    schedule: '线上直播（每周三次）',
    campuses: [],
    summary:
      '从拿起数位笔开始的数字绘画入门课。八周内学习软件操作、线稿、明暗、色彩与简单场景，跟着讲师一步步完成静物、头像与风景练习，为后续学习原画或插画方向打基础。',
    highlights: [
      '对零基础友好，从软件设置和握笔习惯讲起',
      'Photoshop 与 Procreate 双软件演示，设备不受限',
      '每节课都有当堂练习，讲师在线点评',
    ],
    audience: [
      '想学习板绘、但从未系统学过绘画的初学者',
      '希望用 iPad 画画、记录生活的绘画爱好者',
      '考虑报读原画长期班、想先体验一下的学员',
    ],
    stages: [
      {
        title: '工具与造型基础',
        duration: '3 周',
        goals: '熟悉绘画软件，练习线条控制与基础造型。',
        topics: ['软件设置与笔刷管理', '线条练习与图层使用', '几何体与透视入门', '静物线稿'],
      },
      {
        title: '明暗与色彩',
        duration: '3 周',
        goals: '理解光影关系与基础配色，完成彩色静物与头像练习。',
        topics: ['黑白灰与光影', '固有色与环境色', '头像绘制步骤', '色彩搭配练习'],
      },
      {
        title: '小场景练习',
        duration: '2 周',
        goals: '运用所学完成一幅完整的风景小场景。',
        topics: [
          '构图与景别',
          '天空与植物的画法',
          '用 Blender 摆放简单透视参考（选学）',
          '氛围与完成度',
        ],
      },
    ],
    software: ['photoshop', 'procreate', 'blender'],
    projects: [
      {
        title: '静物与头像练习',
        description:
          '完成一组水果静物和一幅半身头像，练习从线稿、明暗到上色的完整步骤，建立绘画的基本流程。',
      },
      {
        title: '黄昏小镇风景',
        description:
          '绘制一幅黄昏时分的小镇街景，练习构图、透视与暖色调氛围的营造，作为本课程的结课作品。',
      },
    ],
    careerDirections: [
      {
        title: '原画与插画方向入门',
        description:
          '本课程以打基础为主，学完后可根据兴趣继续学习角色原画提升班，或报读原画与概念设计长期就业班。',
      },
      {
        title: '自媒体绘画创作',
        description:
          '掌握数字绘画基础后，可以为自媒体账号创作插图、表情包或手账素材，在实践中持续积累作品。',
      },
    ],
    faqs: [
      {
        question: '用 iPad 还是电脑学？',
        answer: '都可以。讲师会同时演示 Photoshop 与 Procreate 的操作，作业使用任一软件完成即可。',
      },
      {
        question: '完全不会画画能学吗？',
        answer:
          '可以。课程从线条和简单形体开始练习，节奏比较平缓。坚持每天练习 30 分钟左右，会更容易看到自己的进步。',
      },
    ],
    featured: false,
    seo: {
      title: '数字绘画入门班｜EduVerse 数艺学院',
      description:
        '数字绘画入门班为期 8 周，线上直播授课，支持 Photoshop 与 Procreate，从软件操作、线条造型到明暗色彩与小场景绘制，适合零基础学员系统入门板绘，为原画与插画学习打基础。',
      keywords: '板绘入门,数字绘画教程,Procreate教程,零基础学画画,插画入门',
    },
  },

  // ───────────── 平面与品牌设计 ─────────────
  {
    slug: 'graphic-design-career',
    duration: { value: 5, unit: 'month' },
    schedule: '全日制（周一至周五）',
    campuses: ['guangzhou-tianhe', 'shenzhen-nanshan', 'hangzhou-binjiang'],
    summary:
      '围绕平面与品牌设计岗位，五个月内学习设计基础、字体版式、品牌视觉系统、包装与电商视觉，以虚构品牌的完整项目串联课程内容，结业时形成兼顾创意与落地能力的作品集。',
    highlights: [
      '用一个虚构品牌贯穿课程，从标志到包装完整呈现',
      '讲解印刷工艺与打样流程，作品更贴近落地要求',
      '加入 C4D 辅助表现，提升电商与包装的展示效果',
      '作品集指导覆盖排版、叙事与提案表达',
    ],
    audience: [
      '对视觉设计感兴趣、希望进入设计行业的学员',
      '设计相关专业的在校生与应届毕业生',
      '已从事设计助理工作、想系统提升品牌思维的从业者',
    ],
    stages: [
      {
        title: '设计基础与软件',
        duration: '4 周',
        goals: '掌握构成、色彩与版式基础，熟练使用 Photoshop 与 Illustrator。',
        topics: [
          '平面构成与色彩构成',
          'Photoshop 图像处理',
          'Illustrator 矢量绘图',
          '基础版式练习',
        ],
      },
      {
        title: '字体与版式设计',
        duration: '4 周',
        goals: '理解字体特征与网格系统，能完成信息层级清晰的版面。',
        topics: [
          '字体分类与选用',
          '字体设计入门',
          '网格系统',
          '海报与画册排版',
          '印刷工艺与文件输出',
        ],
      },
      {
        title: '品牌视觉系统',
        duration: '5 周',
        goals: '完成标志设计与 VI 系统规范，并进行多场景应用延展。',
        topics: [
          '品牌调研与定位',
          '标志设计方法',
          '辅助图形与色彩系统',
          'VI 规范手册',
          '应用场景延展',
        ],
      },
      {
        title: '包装与电商视觉',
        duration: '4 周',
        goals: '完成产品包装与电商页面设计，掌握 C4D 基础展示。',
        topics: ['包装结构与材质', '电商主图与详情页', 'C4D 产品展示基础', '活动页视觉设计'],
      },
      {
        title: '作品集与求职准备',
        duration: '3 周',
        goals: '整理作品集，提升提案表达能力并完成面试准备。',
        topics: ['作品集排版与叙事', '设计提案表达', '简历撰写与模拟面试'],
      },
    ],
    software: ['photoshop', 'illustrator', 'cinema-4d'],
    projects: [
      {
        title: '城市茶饮品牌视觉系统',
        description:
          '为一家虚构的城市茶饮品牌完成标志、色彩与辅助图形设计，并输出包含杯套、菜单和门头的 VI 规范手册。',
      },
      {
        title: '节气礼盒包装',
        description:
          '以二十四节气为灵感设计一套礼盒包装，考虑结构、材质与印刷工艺，并用 C4D 制作展示效果图。',
      },
      {
        title: '新品上市电商页',
        description:
          '为品牌新品设计电商主图与详情页，梳理卖点与信息层级，兼顾视觉风格的统一与浏览体验。',
      },
    ],
    careerDirections: [
      {
        title: '平面设计师',
        description:
          '负责海报、画册与各类宣传物料设计，课程中的版式与印刷训练能帮助较快适应实际工作。',
      },
      {
        title: '品牌视觉设计师',
        description:
          '为企业建立与维护视觉识别系统，课程中的品牌项目可以完整展示从调研到落地的设计思路。',
      },
      {
        title: '电商视觉设计师',
        description:
          '负责店铺页面、商品主图与活动视觉设计，适合节奏感强、愿意根据数据反馈不断调整设计的同学。',
      },
    ],
    salaryRef: demoSalary(
      '6,000–11,000 元/月',
      '为平面设计初级岗位的示意区间，不同城市与行业差异较大，不作为培训效果的依据。',
    ),
    faqs: [
      {
        question: '学平面设计需要手绘吗？',
        answer:
          '不需要很强的手绘能力。课程会安排一些草图练习帮助表达想法，大部分设计工作在 Photoshop 和 Illustrator 中完成。',
      },
      {
        question: '课程会讲印刷相关知识吗？',
        answer:
          '会。字体与版式阶段专门讲解出血、色彩模式、纸张与特殊工艺，并安排一次打样对比，帮助理解屏幕与印刷之间的差异。',
      },
    ],
    featured: true,
    seo: {
      title: '平面与品牌设计长期就业班｜EduVerse 数艺学院',
      description:
        '平面与品牌设计长期就业班为期 5 个月，线下面授，系统学习构成色彩、字体版式、标志与 VI 设计、包装和电商视觉，以虚构品牌项目贯穿全程，帮助学员完成平面设计作品集。',
      keywords: '平面设计培训班,品牌设计课程,VI设计培训,包装设计学习,平面设计课程',
    },
  },
  {
    slug: 'brand-identity',
    duration: { value: 8, unit: 'week' },
    schedule: '线上直播晚班（每周二、四、六）',
    campuses: [],
    summary:
      '面向有设计基础的学员，深入学习品牌视觉识别系统的设计方法。八周内从品牌调研、标志创意到 VI 规范与应用延展，完整操练一次品牌项目，学会把品牌策略转化为视觉语言。',
    highlights: [
      '讲解品牌策略与视觉的关系，让设计有据可依',
      '标志设计多轮推敲，讲师一对一点评方案',
      '输出完整 VI 手册，可直接作为作品集项目',
    ],
    audience: [
      '有平面设计基础、希望深入品牌方向的设计师',
      '需要为自有品牌建立视觉体系的创业者',
      '设计相关专业、准备求职品牌设计岗位的学生',
    ],
    stages: [
      {
        title: '品牌调研与标志设计',
        duration: '4 周',
        goals: '完成品牌调研与定位分析，设计并推敲标志方案。',
        topics: ['品牌调研方法', '关键词与情绪板', '标志创意与草图', '标志精修与网格'],
      },
      {
        title: 'VI 系统与应用延展',
        duration: '4 周',
        goals: '建立色彩、字体与辅助图形规范，完成多场景应用。',
        topics: [
          '色彩与字体系统',
          '辅助图形设计',
          'VI 手册编排',
          '线上线下应用延展',
          '品牌提案演示',
        ],
      },
    ],
    software: ['illustrator', 'photoshop', 'figma'],
    projects: [
      {
        title: '社区书店品牌形象',
        description:
          '为一家虚构的社区书店完成品牌调研、标志设计与 VI 规范，并延展至书签、帆布袋与店内导视。',
      },
      {
        title: '品牌提案演示稿',
        description:
          '把品牌项目整理成一份提案演示稿，练习用清晰的逻辑讲述设计思路、方案取舍与应用设想。',
      },
    ],
    careerDirections: [
      {
        title: '品牌视觉设计师',
        description:
          '在设计公司或企业品牌部负责视觉识别系统设计，本课程的品牌项目能完整展示设计流程。',
      },
      {
        title: '平面设计师（品牌方向）',
        description:
          '在日常物料设计中更好地遵循与维护品牌规范，积累经验后逐步承担更完整、更系统的品牌项目。',
      },
    ],
    faqs: [
      {
        question: '零基础适合报名吗？',
        answer:
          '本课程默认学员会使用 Illustrator 和 Photoshop。零基础学员建议先报读平面与品牌设计长期就业班，或先自学软件基础。',
      },
      {
        question: '作业可以用自己的真实项目吗？',
        answer:
          '可以。在讲师确认项目范围合适的前提下，你可以用自己正在做的品牌项目完成作业，讲师会结合实际情况点评。',
      },
    ],
    featured: false,
    seo: {
      title: '品牌视觉设计提升班｜EduVerse 数艺学院',
      description:
        '品牌视觉设计提升班为期 8 周，线上晚间直播，学习品牌调研、标志创意、色彩与字体系统、VI 手册编排与应用延展，完整操练一次品牌项目，适合有平面基础的设计师进阶。',
      keywords: '品牌设计培训,VI设计,标志设计教程,LOGO设计,品牌视觉',
    },
  },
  {
    slug: 'ecommerce-visual',
    duration: { value: 6, unit: 'week' },
    schedule: '线上直播（每周三次）',
    campuses: [],
    summary:
      '聚焦电商平台的视觉设计需求，六周内学习主图、详情页、活动页与店铺首页设计，并用 C4D 制作简单的产品展示图，在多个类目案例中练习卖点提炼与信息排布。',
    highlights: [
      '覆盖服饰、数码、食品等常见类目案例',
      '讲解平台尺寸规范与大促页面节奏',
      '加入 C4D 基础，提升产品展示的质感',
    ],
    audience: [
      '想从事电商设计、具备基本软件操作能力的学员',
      '经营网店、希望自己设计页面的店主',
      '从平面设计转向电商方向的设计师',
    ],
    stages: [
      {
        title: '主图与详情页',
        duration: '3 周',
        goals: '学会提炼卖点，完成主图与详情页设计。',
        topics: ['电商平台尺寸规范', '卖点提炼与文案排布', '产品修图与合成', '详情页结构设计'],
      },
      {
        title: '活动页与三维展示',
        duration: '3 周',
        goals: '完成大促活动页与店铺首页，掌握 C4D 产品展示基础。',
        topics: ['活动页视觉主题', '店铺首页布局', 'C4D 建模与材质基础', '产品场景渲染'],
      },
    ],
    software: ['photoshop', 'illustrator', 'cinema-4d'],
    projects: [
      {
        title: '保温杯详情页',
        description:
          '为一款虚构的保温杯设计主图与详情页，提炼保温、便携等卖点，并完成产品修图与场景合成。',
      },
      {
        title: '年中大促活动页',
        description:
          '为一家虚构的家居店铺设计年中活动页面，统一视觉主题，并用 C4D 制作主视觉中的产品展台。',
      },
    ],
    careerDirections: [
      {
        title: '电商视觉设计师',
        description:
          '负责店铺页面、主图与活动视觉设计，本课程的详情页与活动页案例可以直接整理为电商方向的作品集。',
      },
      {
        title: '网店美工',
        description:
          '在中小商家中负责日常上新与页面维护，工作内容多样，能在较短时间内积累大量实操经验。',
      },
    ],
    faqs: [
      {
        question: '需要会 C4D 吗？',
        answer:
          '不需要提前掌握。课程后半段会从 C4D 基础讲起，只涉及电商展示中常用的建模、材质与渲染操作。',
      },
      {
        question: '每周上课时间是怎样的？',
        answer: '每周三次线上直播，每次约两小时，课后有作业与回放。讲师会在固定时间段在线答疑。',
      },
    ],
    featured: false,
    seo: {
      title: '电商视觉设计实战班｜EduVerse 数艺学院',
      description:
        '电商视觉设计实战班为期 6 周，线上直播授课，学习主图与详情页设计、卖点提炼、活动页与店铺首页布局，以及 C4D 产品展示基础，通过多类目案例积累电商设计作品。',
      keywords: '电商设计培训,电商美工培训,详情页设计,主图设计,电商视觉',
    },
  },

  // ───────────── 动态图形与短视频 ─────────────
  {
    slug: 'motion-design-career',
    duration: { value: 6, unit: 'month' },
    schedule: '全日制（周一至周五）',
    campuses: ['beijing-haidian', 'shanghai-xuhui', 'shenzhen-nanshan'],
    summary:
      '面向品牌宣传、产品发布与新媒体内容需求，六个月内学习 After Effects 动效、Cinema 4D 三维动态、视频剪辑包装与短视频创作，结业时完成一支品牌宣传片和多支动态作品。',
    highlights: [
      '二维动效与三维动态并重，作品形式更丰富',
      '线下与线上两种班型，课程内容与作业要求一致',
      '引入短视频策划内容，兼顾设计与内容能力',
      '毕业项目模拟完整的品牌宣传片制作流程',
    ],
    audience: [
      '喜欢视频内容、希望从事动态设计的学员',
      '想拓展动态能力的平面设计师',
      '需要提升视频制作水平的新媒体从业者',
    ],
    stages: [
      {
        title: 'AE 动效基础',
        duration: '5 周',
        goals: '掌握关键帧动画、曲线编辑与常用效果，完成基础 MG 动画。',
        topics: [
          '关键帧与图层动画',
          '速度曲线与运动规律',
          '形状图层与遮罩',
          '文字动画',
          '表达式入门',
        ],
      },
      {
        title: 'MG 动画与信息图',
        duration: '4 周',
        goals: '能完成产品解说类 MG 动画，掌握分镜与节奏设计。',
        topics: ['脚本与分镜', '角色 MG 动画', '信息图动画', '声音与节奏'],
      },
      {
        title: 'C4D 三维动态',
        duration: '6 周',
        goals: '掌握 C4D 建模、灯光材质与运动图形模块。',
        topics: ['C4D 建模基础', '灯光与材质', '运动图形（MoGraph）', '渲染与 AE 合成'],
      },
      {
        title: '剪辑包装与短视频',
        duration: '5 周',
        goals: '完成节目包装与短视频的策划、剪辑与输出。',
        topics: ['Premiere Pro 剪辑', '片头与字幕包装', '短视频选题与脚本', 'DaVinci Resolve 调色'],
      },
      {
        title: '毕业项目与作品集',
        duration: '5 周',
        goals: '完成一支品牌宣传片，并剪辑个人作品合集。',
        topics: [
          '宣传片策划与风格提案',
          '分镜与样片',
          '制作与修改迭代',
          '作品合集剪辑',
          '简历与模拟面试',
        ],
      },
    ],
    software: ['after-effects', 'cinema-4d', 'premiere-pro', 'davinci-resolve', 'illustrator'],
    projects: [
      {
        title: '智能手表产品解说动画',
        description:
          '为一款虚构的智能手表制作 60 秒 MG 解说动画，从脚本、分镜到动画与配乐完整执行一遍。',
      },
      {
        title: '三维抽象动态海报',
        description:
          '使用 C4D 运动图形模块制作一组循环播放的抽象三维动态海报，练习材质、灯光与节奏的搭配。',
      },
      {
        title: '城市文化节宣传片',
        description:
          '为一个虚构的城市文化节制作 90 秒宣传片，综合运用二维动效、三维元素与实拍素材剪辑。',
      },
    ],
    careerDirections: [
      {
        title: 'MG 动画设计师',
        description:
          '负责产品解说、品牌宣传与信息图动画的设计制作，课程中的 MG 项目是作品集里的重点内容。',
      },
      {
        title: '视频包装设计师',
        description:
          '负责节目片头、字幕条与活动视觉包装，需要在统一风格的基础上，为画面制造恰当的视觉亮点。',
      },
      {
        title: '三维动态设计师',
        description:
          '使用 C4D 制作产品展示与抽象动态，常见于品牌广告和电商宣传项目，需要良好的材质与光影感。',
      },
    ],
    salaryRef: demoSalary(
      '7,000–13,000 元/月',
      '为动态设计初级岗位的示意区间，受城市、行业与作品质量影响，不作为培训效果的依据。',
    ),
    faqs: [
      {
        question: '平面设计师转动态设计难吗？',
        answer:
          '平面设计的版式和配色基础对动态设计很有帮助，主要需要补充动画规律和软件操作。课程前五周会系统讲解这部分内容。',
      },
      {
        question: '线上班的作业怎么批改？',
        answer:
          '线上班学员提交作业后，讲师会录制批注视频或在直播中集中点评，毕业项目阶段另有一对一视频沟通。',
      },
      {
        question: '需要自备电脑吗？',
        answer:
          '线下班教室提供电脑。线上班需要自备电脑，C4D 渲染建议使用独立显卡和 32GB 内存，报名前可咨询课程顾问。',
      },
    ],
    featured: true,
    seo: {
      title: '动态图形设计长期就业班｜EduVerse 数艺学院',
      description:
        '动态图形设计长期就业班为期 6 个月，线下与线上班型可选，学习 After Effects 动效、MG 动画、Cinema 4D 三维动态、剪辑包装与短视频创作，结业完成品牌宣传片与动态作品集。',
      keywords: 'MG动画培训班,AE培训,C4D动态设计,视频包装培训,动态设计课程',
    },
  },
  {
    slug: 'c4d-motion',
    duration: { value: 10, unit: 'week' },
    schedule: '线上直播（每周三次）',
    campuses: [],
    summary:
      '为有 AE 或平面基础的学员开设的三维动态课程。十周内学习 Cinema 4D 建模、材质灯光、运动图形与动力学，并与 After Effects 合成配合，完成产品展示与抽象动态两类作品。',
    highlights: [
      '围绕电商与品牌广告的常见需求设计案例',
      '讲解 MoGraph 与动力学，做出有节奏的动态',
      '课程工程文件可下载，便于课后拆解学习',
    ],
    audience: [
      '会使用 AE、想加入三维元素的动效设计师',
      '希望提升产品展示效果的电商设计师',
      '对三维动态感兴趣的平面设计师',
    ],
    stages: [
      {
        title: '建模与材质灯光',
        duration: '4 周',
        goals: '掌握 C4D 常用建模方式，能为产品布置灯光与材质。',
        topics: ['界面与基础建模', '样条与生成器', '材质节点与贴图', '产品布光方法'],
      },
      {
        title: '运动图形与动力学',
        duration: '4 周',
        goals: '用 MoGraph 与动力学制作节奏感强的三维动画。',
        topics: ['克隆与效果器', '关键帧与时间线', '刚体与柔体动力学', '布料与粒子'],
      },
      {
        title: '渲染与合成',
        duration: '2 周',
        goals: '完成多通道渲染，并在 AE 中合成与调色。',
        topics: ['渲染设置与多通道输出', 'AE 合成与调色', '作品包装与导出'],
      },
    ],
    software: ['cinema-4d', 'after-effects', 'photoshop'],
    projects: [
      {
        title: '耳机产品展示动画',
        description:
          '为一款虚构的无线耳机制作 15 秒产品展示动画，练习产品布光、材质表现与镜头运动设计。',
      },
      {
        title: '抽象循环动画',
        description:
          '用克隆与效果器制作一段可无缝循环的抽象动画，探索色彩、节奏与形体变化之间的组合方式。',
      },
    ],
    careerDirections: [
      {
        title: '三维动态设计师',
        description:
          '负责品牌广告与电商宣传中的三维动态部分，本课程的两类作品可以补充作品集中的三维内容。',
      },
      {
        title: '电商视觉设计师（三维方向）',
        description:
          '用三维手段制作产品主图与展示动画，在以平面为主的电商设计工作中形成有差异化的技能组合。',
      },
    ],
    faqs: [
      {
        question: '没有三维基础能学吗？',
        answer:
          '可以。课程从 C4D 界面讲起，但建议具备 AE 或 Photoshop 的使用经验，理解图层与合成的概念后学习会更顺畅。',
      },
      {
        question: '用什么渲染器？',
        answer:
          '课程以 C4D 自带渲染器为主，避免额外的插件费用。讲师会简单介绍常见第三方渲染器的特点，供学员课后选择。',
      },
    ],
    featured: false,
    seo: {
      title: 'C4D 三维动态提升班｜EduVerse 数艺学院',
      description:
        'C4D 三维动态提升班为期 10 周，线上直播授课，学习 Cinema 4D 建模、材质灯光、运动图形与动力学，并结合 After Effects 合成，完成产品展示与抽象动态两类作品。',
      keywords: 'C4D培训,C4D教程,三维动态设计,MoGraph,产品动画',
    },
  },
  {
    slug: 'short-video-creation',
    duration: { value: 6, unit: 'week' },
    schedule: '线上直播晚班（每周一、三、五）',
    campuses: [],
    summary:
      '面向内容创作者的短视频实战课程。六周内从选题策划、脚本分镜、手机拍摄讲到剪辑包装与数据复盘，围绕一个账号定位连续产出多条作品，建立可持续的内容生产流程。',
    highlights: [
      '从策划到复盘覆盖完整的内容生产流程',
      '手机即可拍摄，降低设备门槛',
      '讲师逐条点评作品，帮助找到账号风格',
    ],
    audience: [
      '想做个人账号、记录生活或分享专业知识的创作者',
      '负责品牌短视频内容的市场与运营人员',
      '希望提升视频表达能力的自由职业者',
    ],
    stages: [
      {
        title: '定位、选题与脚本',
        duration: '2 周',
        goals: '明确账号定位，学会选题与撰写分镜脚本。',
        topics: ['账号定位与受众分析', '选题方法与素材积累', '脚本结构与分镜', '开头三秒设计'],
      },
      {
        title: '拍摄与剪辑包装',
        duration: '3 周',
        goals: '用手机完成拍摄，并在 Premiere Pro 中完成剪辑与包装。',
        topics: ['手机拍摄与构图', '灯光与收音', '剪辑节奏与转场', '字幕与封面设计', '简单调色'],
      },
      {
        title: '发布与复盘',
        duration: '1 周',
        goals: '了解平台发布规范，学会根据数据复盘并优化内容。',
        topics: ['平台规则与内容合规', '数据指标解读', '内容迭代计划'],
      },
    ],
    software: ['premiere-pro', 'after-effects', 'davinci-resolve', 'photoshop'],
    projects: [
      {
        title: '账号定位与系列策划',
        description:
          '为自己或一个虚构品牌策划短视频账号定位，输出受众画像、内容方向与首批十条选题清单。',
      },
      {
        title: '三条系列短视频',
        description:
          '按策划完成三条同一系列的短视频，从拍摄、剪辑到封面设计独立完成，并进行一次数据复盘。',
      },
    ],
    careerDirections: [
      {
        title: '短视频编导',
        description:
          '负责短视频的选题策划、脚本撰写与拍摄统筹，需要兼具对内容的敏感度与扎实的执行能力。',
      },
      {
        title: '短视频剪辑师',
        description:
          '在新媒体或品牌团队中负责视频剪辑与包装，本课程能帮助建立从拍摄到成片的完整制作流程。',
      },
    ],
    faqs: [
      {
        question: '只有手机可以学吗？',
        answer:
          '可以。课程的拍摄部分以手机为主，讲解构图、光线与收音技巧。剪辑部分需要一台能运行 Premiere Pro 的电脑。',
      },
      {
        question: '课程会教如何涨粉吗？',
        answer:
          '课程会讲解选题、内容结构与数据复盘的方法，帮助你持续提升内容质量。账号表现受平台、题材与更新频率等多种因素影响，课程不对播放量和粉丝数作任何预期。',
      },
    ],
    featured: false,
    seo: {
      title: '短视频创作实战班｜EduVerse 数艺学院',
      description:
        '短视频创作实战班为期 6 周，线上晚间直播，覆盖账号定位、选题策划、脚本分镜、手机拍摄、剪辑包装与数据复盘，帮助个人创作者与品牌内容团队建立可持续的短视频内容生产流程。',
      keywords: '短视频培训,短视频剪辑,视频拍摄教程,短视频策划,内容创作',
    },
  },

  // ───────────── 建筑与室内可视化 ─────────────
  {
    slug: 'arch-viz-career',
    duration: { value: 6, unit: 'month' },
    schedule: '全日制（周一至周五）',
    campuses: ['beijing-haidian', 'shanghai-xuhui', 'guangzhou-tianhe', 'chengdu-gaoxin'],
    summary:
      '围绕家装、公装与建筑表现需求设计，六个月内学习识图与空间基础、SketchUp 与 3ds Max 建模、材质灯光、D5 Render 与 Unreal Engine 实时渲染，结业时完成效果图与漫游动画作品集。',
    highlights: [
      '从识图与尺度讲起，模型更符合真实空间',
      '离线渲染与实时渲染两条流程都会学',
      '案例覆盖住宅、商业空间与建筑外观',
      '讲解方案汇报的表现要点，作品更贴近业务需求',
    ],
    audience: [
      '对空间设计与效果表现感兴趣的学员',
      '建筑、环艺、室内设计等专业的在校生与毕业生',
      '家装公司设计助理、希望提升表现能力的从业者',
    ],
    stages: [
      {
        title: '空间基础与识图',
        duration: '3 周',
        goals: '学会阅读平面图与立面图，理解尺度、风格与人体工程学。',
        topics: ['室内设计风格概览', '平面图与立面图识读', '尺度与人体工程学', '量房与草图'],
      },
      {
        title: 'SketchUp 方案建模',
        duration: '4 周',
        goals: '使用 SketchUp 快速搭建方案模型，并进行初步推敲。',
        topics: ['SketchUp 建模基础', '组件与图层管理', '家具与软装摆放', '方案推敲与出图'],
      },
      {
        title: '3ds Max 建模与渲染',
        duration: '7 周',
        goals: '掌握 3ds Max 精细建模、材质表现与日景夜景灯光。',
        topics: [
          '3ds Max 室内建模',
          '真实材质表现',
          '日景与夜景布光',
          '渲染参数与出图',
          'Photoshop 后期处理',
        ],
      },
      {
        title: '实时渲染与漫游',
        duration: '6 周',
        goals: '使用 D5 Render 与 Unreal Engine 完成实时效果与漫游动画。',
        topics: [
          'D5 Render 场景搭建',
          '植物与环境配景',
          '漫游路径与镜头',
          'Unreal Engine 交互展示入门',
        ],
      },
      {
        title: '作品集与求职准备',
        duration: '4 周',
        goals: '完成综合项目，整理作品集并准备面试。',
        topics: ['综合项目：样板间表现', '作品集排版', '简历与模拟面试'],
      },
    ],
    software: ['sketchup', '3ds-max', 'd5-render', 'unreal-engine', 'photoshop'],
    projects: [
      {
        title: '三居室家装效果图',
        description:
          '根据平面图完成一套三居室的建模、材质与灯光，输出客厅、卧室与餐厨空间的日景与夜景效果图。',
      },
      {
        title: '精品咖啡店空间表现',
        description:
          '为一间虚构的精品咖啡店完成空间建模与软装搭配，用 D5 Render 输出效果图与 30 秒漫游动画。',
      },
      {
        title: '样板间实时展示',
        description:
          '在 Unreal Engine 中搭建一套样板间，实现材质切换与自由漫游，模拟售楼展示中的交互需求。',
      },
    ],
    careerDirections: [
      {
        title: '室内效果图设计师',
        description:
          '负责家装与公装空间的效果图制作，课程中的离线与实时渲染项目可以直接整理进作品集。',
      },
      {
        title: '建筑可视化设计师',
        description:
          '为建筑与景观项目制作效果图和动画，需要在课程基础上持续积累对环境氛围与光影的把握。',
      },
      {
        title: '室内设计助理',
        description:
          '协助设计师完成方案建模、出图与表现，在项目中逐步积累设计经验，向室内设计师方向发展。',
      },
    ],
    salaryRef: demoSalary(
      '6,000–11,000 元/月',
      '为效果图与室内设计助理等初级岗位的示意区间，项目提成等因素会带来较大差异，不作为培训效果的依据。',
    ),
    faqs: [
      {
        question: '没有设计专业背景可以学吗？',
        answer:
          '可以。课程开头三周会讲解识图、尺度与风格等基础知识，帮助非专业背景的学员建立空间概念。',
      },
      {
        question: '离线渲染和实时渲染都要学吗？',
        answer:
          '都要学。离线渲染适合高质量的单张效果图，实时渲染出图快、便于制作漫游动画，两者在工作中常常配合使用。',
      },
      {
        question: '需要自备电脑吗？',
        answer:
          '校区教室配备图形工作站。若课后自行练习，实时渲染对显卡要求较高，建议选择显存 8GB 以上的独立显卡。',
      },
    ],
    featured: true,
    seo: {
      title: '建筑与室内可视化长期就业班｜EduVerse 数艺学院',
      description:
        '建筑与室内可视化长期就业班为期 6 个月，线下面授，学习识图与空间基础、SketchUp 与 3ds Max 建模、材质灯光、D5 Render 与 Unreal Engine 实时渲染，结业完成效果图与漫游动画作品集。',
      keywords: '室内设计培训班,效果图培训,3dmax室内建模,D5渲染培训,建筑可视化课程',
    },
  },
  {
    slug: 'd5-realtime-rendering',
    duration: { value: 6, unit: 'week' },
    schedule: '线上直播晚班（每周二、四）',
    campuses: [],
    summary:
      '面向会 SketchUp 或 3ds Max 的设计师，六周内学习 D5 Render 的材质、灯光、配景与动画功能，把方案模型快速转化为高质量效果图和漫游视频，提升方案汇报效率。',
    highlights: [
      '晚间直播，适合在职设计师',
      '从方案模型直接出图，减少反复调参的时间',
      '覆盖室内、建筑与景观三类常见场景',
    ],
    audience: [
      '使用 SketchUp 或 3ds Max 建模的室内与建筑设计师',
      '需要快速出图汇报方案的设计团队成员',
      '想从离线渲染转向实时渲染的效果图设计师',
    ],
    stages: [
      {
        title: '材质灯光与出图',
        duration: '3 周',
        goals: '掌握 D5 的材质调节与灯光布置，输出室内日景和夜景效果图。',
        topics: ['模型导入与同步', '材质库与自定义材质', '天光与人工光源', '室内日景与夜景出图'],
      },
      {
        title: '配景与动画输出',
        duration: '3 周',
        goals: '完成建筑与景观场景，并制作漫游动画。',
        topics: ['植物与环境配景', '天气与季节效果', '相机动画与路径', '视频输出与剪辑'],
      },
    ],
    software: ['d5-render', 'sketchup', '3ds-max', 'photoshop'],
    projects: [
      {
        title: '北欧风客餐厅表现',
        description:
          '使用课程提供的 SketchUp 模型完成北欧风客餐厅的材质与灯光，输出日景、夜景两组效果图。',
      },
      {
        title: '庭院景观漫游',
        description:
          '为一处虚构的住宅庭院布置植物与配景，设置季节效果，并输出一段 30 秒的漫游视频。',
      },
    ],
    careerDirections: [
      {
        title: '效果图设计师',
        description:
          '使用实时渲染工具快速完成效果表现，本课程能帮助缩短出图周期、提升方案汇报的效率。',
      },
      {
        title: '实时漫游制作师',
        description:
          '负责地产展示与方案汇报中的漫游动画制作，需要兼顾镜头语言、行进节奏与场景氛围的表达。',
      },
    ],
    faqs: [
      {
        question: '对显卡有什么要求？',
        answer:
          'D5 Render 依赖显卡进行实时渲染，建议使用显存 6GB 以上的独立显卡。没有合适设备的同学可在报名前咨询，了解替代方案。',
      },
      {
        question: '需要先会 3ds Max 吗？',
        answer:
          '会 SketchUp 或 3ds Max 其中之一即可。课程案例以 SketchUp 模型为主，同时会演示 3ds Max 的模型同步流程。',
      },
    ],
    featured: false,
    seo: {
      title: 'D5 实时渲染提升班｜EduVerse 数艺学院',
      description:
        'D5 实时渲染提升班为期 6 周，线上晚间直播，学习 D5 Render 材质灯光、配景布置、天气效果与漫游动画，帮助会 SketchUp 或 3ds Max 的设计师快速输出高质量效果图与漫游视频。',
      keywords: 'D5渲染器教程,D5 Render培训,实时渲染,效果图渲染,室内漫游动画',
    },
  },
  {
    slug: 'interior-design-foundation',
    duration: { value: 10, unit: 'week' },
    schedule: '周末班（周六、周日）',
    campuses: ['shanghai-xuhui', 'shenzhen-nanshan', 'hangzhou-binjiang'],
    summary:
      '为零基础学员设计的室内设计入门课程。十周内学习风格与色彩搭配、平面布局、尺度规范和 SketchUp 建模，在周末双师课堂中完成一套小户型的方案设计与效果表现。',
    highlights: [
      '周末授课，助教老师在教室现场辅导',
      '以常见户型为案例，从量房到方案一步步推进',
      '兼顾设计思维与软件表现，适合入门',
    ],
    audience: [
      '对室内设计感兴趣、准备转行的零基础学员',
      '正在装修、想自己参与方案设计的业主',
      '希望提升专业能力的家居、建材行业销售与顾问',
    ],
    stages: [
      {
        title: '空间与风格基础',
        duration: '4 周',
        goals: '了解常见室内风格与色彩搭配，掌握基础尺度与动线规划。',
        topics: ['常见室内风格', '色彩与材质搭配', '人体尺度与动线', '平面布局方法'],
      },
      {
        title: 'SketchUp 建模与表现',
        duration: '4 周',
        goals: '使用 SketchUp 搭建空间模型，并用 D5 Render 输出效果图。',
        topics: ['SketchUp 基础操作', '墙体、门窗与家具建模', '软装搭配', 'D5 Render 出图'],
      },
      {
        title: '小户型方案设计',
        duration: '2 周',
        goals: '独立完成一套小户型方案，并进行方案讲解。',
        topics: ['需求分析与平面方案', '效果图表现', '方案讲解与点评'],
      },
    ],
    software: ['sketchup', 'd5-render', 'photoshop'],
    projects: [
      {
        title: '一居室改造方案',
        description:
          '针对一套 45 平方米的一居室，完成需求分析、平面布局与软装搭配，输出主要空间的效果图。',
      },
      {
        title: '风格情绪板',
        description:
          '选择两种室内风格制作情绪板，整理色彩、材质与家具元素，练习风格判断与搭配表达能力。',
      },
    ],
    careerDirections: [
      {
        title: '室内设计助理',
        description:
          '协助设计师完成方案绘制与效果表现，本课程能帮助了解行业工作内容，为进一步深造打基础。',
      },
      {
        title: '软装搭配顾问',
        description:
          '在家居或软装门店为客户提供风格与搭配建议，需要良好的审美判断与耐心细致的沟通能力。',
      },
    ],
    faqs: [
      {
        question: '学完能做室内设计师吗？',
        answer:
          '本课程以入门为主，帮助你了解室内设计的基本方法与工作内容。若希望从事相关工作，建议继续学习建筑与室内可视化长期就业班，系统提升表现与方案能力。',
      },
      {
        question: '双师课堂是怎么上的？',
        answer:
          '主讲讲师通过直播授课，校区教室内有助教老师组织练习、现场答疑和批改作业，学员每周末到校上课。',
      },
    ],
    featured: false,
    seo: {
      title: '室内设计基础班｜EduVerse 数艺学院',
      description:
        '室内设计基础班为期 10 周，周末双师授课，学习室内风格、色彩搭配、平面布局与尺度规范，使用 SketchUp 建模并通过 D5 Render 出图，完成一套小户型方案设计，适合零基础入门。',
      keywords: '室内设计入门,室内设计培训,SketchUp教程,家装设计学习,软装搭配',
    },
  },
]
