import type { SeedWork } from '../types'

/**
 * 学员作品（作者均为化名，作品与客户均为虚构，仅用于演示）。
 * 按课程分组排列；学员故事通过下标引用，调整顺序时需同步更新 stories.ts 的 workIndexes。
 * videoBvid 为格式合法的占位 BV 号，不对应真实视频（同免费教程）。
 */
/** 哔哩哔哩官方外部播放器地址（域名在作品视频白名单内，见 src/lib/works/video.ts） */
export function bilibiliPlayerUrl(bvid: string): string {
  return `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}`
}

/** 作品图集每张图的说明：作品自己填写的优先；否则精选作品 2 张（过程稿、细节），其余没有图集 */
export function galleryCaptions(work: Pick<SeedWork, 'gallery' | 'featured'>): string[] {
  return work.gallery ?? (work.featured ? ['过程稿', '细节'] : [])
}

export const works: SeedWork[] = [
  // —— 三维动画 · 三维动画设计长期就业班（0–3）
  {
    title: '《灯塔守望者》角色动画短片',
    author: { displayName: '林同学', cohortLabel: '2026 届' },
    discipline: '3d-animation',
    course: '3d-animation-career',
    software: ['maya', 'substance-painter', 'premiere-pro'],
    description:
      '毕业短片，讲述老守塔人与一只海鸟的告别。独立完成角色表演、镜头调度与灯光，重点打磨了雨夜里的细微表情变化。',
    featured: true,
    aspect: '16:9',
    videoBvid: 'BV1ED00000w1',
  },
  {
    title: '《纸鹤快递》三维动画短片',
    author: { displayName: '阿哲', cohortLabel: '2025 届' },
    discipline: '3d-animation',
    course: '3d-animation-career',
    software: ['maya', 'zbrush', 'after-effects'],
    description:
      '三人小组合作的 90 秒短片，本人负责角色建模与关键帧动画。为让纸鹤飞得轻盈，反复调整了翅膀的跟随与重叠动作。',
    featured: false,
    aspect: '16:9',
  },
  {
    title: '《午后的猫》表演动画练习',
    author: { displayName: '小周', cohortLabel: '2026 届' },
    discipline: '3d-animation',
    course: '3d-animation-career',
    software: ['maya'],
    description:
      '以一只猫跳上窗台为题的表演练习。参考了大量家猫视频，逐帧分析重心转移，完成了一段 12 秒、带情绪起伏的完整动作。',
    featured: false,
    aspect: '4:3',
  },
  {
    title: '《雪原驿站》场景灯光渲染',
    author: { displayName: '何同学', cohortLabel: '2025 届' },
    discipline: '3d-animation',
    course: '3d-animation-career',
    software: ['maya', 'substance-painter'],
    description:
      '长期班中期作业，围绕暴风雪将至的黄昏设计冷暖对比光，完成场景搭建、材质贴图，并输出三套灯光方案做对比。',
    featured: false,
    aspect: '1:1',
  },
  // —— 三维动画 · 角色建模与绑定提升班（4–5）
  {
    title: '《机甲少女·澜》角色建模',
    author: { displayName: 'Momo', cohortLabel: '2026 届' },
    discipline: '3d-animation',
    course: 'character-modeling-rigging',
    software: ['zbrush', 'maya', 'substance-painter', 'marvelous-designer'],
    description:
      '从原画拆解到高模雕刻、拓扑与贴图的全流程练习。服装部分借助 Marvelous Designer 制作褶皱，收尾时核对了面数与贴图规格。',
    featured: true,
    aspect: '3:4',
    gallery: ['高模雕刻', '拓扑与 UV 展开', '贴图细节', '服装褶皱'],
  },
  {
    title: '《老木匠》角色绑定与表情系统',
    author: { displayName: '老K', cohortLabel: '2025 届' },
    discipline: '3d-animation',
    course: 'character-modeling-rigging',
    software: ['maya'],
    description:
      '为一位老年角色搭建身体与面部绑定，包含 40 余个表情控制器，并用一段台词的口型测试检验绑定是否顺手好用。',
    featured: false,
    aspect: '4:3',
  },
  // —— 三维动画 · Blender 三维入门班（6–7）
  {
    title: '《小镇面包房》低多边形场景',
    author: { displayName: '豆豆', cohortLabel: '2026 届' },
    discipline: '3d-animation',
    course: 'blender-3d-foundation',
    software: ['blender'],
    description:
      '入门班结课作品，用低多边形风格搭建一间清晨开门的面包房，练习了基础建模、材质节点与三点布光。',
    featured: false,
    aspect: '1:1',
  },
  {
    title: '《桌面上的宇航员》静物渲染',
    author: { displayName: '叶子', cohortLabel: '2025 届' },
    discipline: '3d-animation',
    course: 'blender-3d-foundation',
    software: ['blender', 'photoshop'],
    description:
      '以手办摆拍为灵感的静物练习，重点处理浅景深与柔和反光。用 Cycles 渲染后，在 Photoshop 里做了少量调色。',
    featured: false,
    aspect: '4:5',
  },
  // —— 游戏美术 · 游戏美术长期就业班（8–11）
  {
    title: '《锈蚀前哨》硬表面道具',
    author: { displayName: '阿岩', cohortLabel: '2026 届' },
    discipline: 'game-art',
    course: 'game-art-career',
    software: ['maya', 'zbrush', 'substance-painter'],
    description:
      '以废土世界的通讯塔为对象，完成高低模制作、法线烘焙与锈迹磨损贴图，结构细节参考了真实的机械连接方式。',
    featured: true,
    aspect: '4:3',
  },
  {
    title: '《机械鲸》硬表面建模',
    author: { displayName: '阿岩', cohortLabel: '2026 届' },
    discipline: 'game-art',
    course: 'game-art-career',
    software: ['blender', 'zbrush', 'substance-painter', 'unreal-engine'],
    description:
      '设想一头被改造成运输舰的机械鲸。在控制游戏面数的前提下拆分模块化部件，再到虚幻引擎中完成展示镜头。',
    featured: false,
    aspect: '16:9',
  },
  {
    title: '《青石巷》卡通渲染场景',
    author: { displayName: '七七', cohortLabel: '2025 届' },
    discipline: 'game-art',
    course: 'game-art-career',
    software: ['3ds-max', 'substance-painter', 'unity'],
    description:
      '卡通渲染风格的江南小巷，从原画还原到建模、手绘质感贴图，再到 Unity 中调整描边粗细与色阶过渡。',
    featured: false,
    aspect: '4:3',
  },
  {
    title: '《赤焰骑士》次世代角色',
    author: { displayName: '大熊', cohortLabel: '2025 届' },
    discipline: 'game-art',
    course: 'game-art-career',
    software: ['zbrush', 'maya', 'substance-painter', 'marvelous-designer'],
    description:
      '毕业设计角色。铠甲与披风分开处理：铠甲在 ZBrush 中雕刻战损细节，披风用布料解算，再统一到 PBR 流程里。',
    featured: false,
    aspect: '3:4',
  },
  // —— 游戏美术 · 游戏场景设计提升班（12–13）
  {
    title: '《雾港码头》游戏关卡场景',
    author: { displayName: '夏夏', cohortLabel: '2026 届' },
    discipline: 'game-art',
    course: 'game-scene-design',
    software: ['unreal-engine', 'blender', 'substance-painter'],
    description:
      '夜雾中的港口关卡片段。搭建了可复用的木栈道与集装箱模块，用体积雾和点光源引导玩家的行进视线。',
    featured: true,
    aspect: '16:9',
  },
  {
    title: '《沙海遗迹》关卡氛围设计',
    author: { displayName: '子墨', cohortLabel: '2025 届' },
    discipline: 'game-art',
    course: 'game-scene-design',
    software: ['unreal-engine', '3ds-max'],
    description:
      '围绕“迷路的商队”编写场景叙事，用倒塌的石柱和风沙遮挡安排探索路线，分白盒、资产替换、光照三个阶段推进。',
    featured: false,
    aspect: '4:3',
  },
  // —— 游戏美术 · UE5 实时美术提升班（14–15）
  {
    title: '《雨后神社》UE5 实时场景',
    author: { displayName: '阿初', cohortLabel: '2026 届' },
    discipline: 'game-art',
    course: 'ue5-realtime-art',
    software: ['unreal-engine', 'blender', 'substance-painter'],
    description:
      '借助 Nanite 与 Lumen 制作雨后的山间小庙，地面积水的反射与苔藓混合材质是这次练习的重点。',
    featured: false,
    aspect: '16:9',
  },
  {
    title: '《午夜便利店》实时光照练习',
    author: { displayName: '橙子', cohortLabel: '2025 届' },
    discipline: 'game-art',
    course: 'ue5-realtime-art',
    software: ['unreal-engine', 'maya'],
    description:
      '还原深夜街角的便利店，霓虹招牌与冷柜灯光共同构成画面，练习了实时光照下的曝光控制与后处理调色。',
    featured: false,
    aspect: '4:3',
  },
  // —— 影视特效与后期 · 影视特效与合成长期就业班（16–18）
  {
    title: '《城市坠星》特效合成镜头',
    author: { displayName: '阿凯', cohortLabel: '2026 届' },
    discipline: 'vfx',
    course: 'vfx-compositing-career',
    software: ['nuke', 'houdini', 'maya'],
    description:
      '在实拍街道素材上合成陨石坠落与冲击波，走完了摄像机反求、破碎模拟、烟尘渲染与多通道合成的完整流程。',
    featured: true,
    aspect: '16:9',
  },
  {
    title: '《绿幕少女》抠像与环境替换',
    author: { displayName: '小雨', cohortLabel: '2025 届' },
    discipline: 'vfx',
    course: 'vfx-compositing-career',
    software: ['nuke', 'after-effects'],
    description:
      '攻克发丝与半透明纱裙的绿幕抠像难点，把背景替换为黄昏麦田，并统一前后景的光线方向与颗粒质感。',
    featured: false,
    aspect: '16:9',
  },
  {
    title: '《旧城改造》数字绘景',
    author: { displayName: '南风', cohortLabel: '2026 届' },
    discipline: 'vfx',
    course: 'vfx-compositing-career',
    software: ['nuke', 'photoshop', 'blender'],
    description:
      '把一段老街空镜改造成近未来城市，结合投射绘景与简单三维模型，让镜头推进时画面仍有可信的透视变化。',
    featured: false,
    aspect: '16:9',
  },
  // —— 影视特效与后期 · Houdini 特效提升班（19–20）
  {
    title: '《沙之手》粒子消散特效',
    author: { displayName: '阿凡', cohortLabel: '2026 届' },
    discipline: 'vfx',
    course: 'houdini-fx',
    software: ['houdini', 'nuke'],
    description:
      '角色手掌化作细沙随风飘散的程序化特效。用 POP 粒子控制消散方向，并整理出参数面板方便后续镜头复用。',
    featured: true,
    aspect: '16:9',
  },
  {
    title: '《深海涌浪》流体模拟',
    author: { displayName: '石头', cohortLabel: '2025 届' },
    discipline: 'vfx',
    course: 'houdini-fx',
    software: ['houdini', 'maya', 'nuke'],
    description:
      '模拟巨浪拍击礁石的海洋镜头，分层解算主体海浪、白沫与水雾，合成阶段又校正了远处海面的空气透视。',
    featured: false,
    aspect: '16:9',
  },
  // —— 影视特效与后期 · 视频剪辑与调色入门班（21–22）
  {
    title: '《一碗面的清晨》纪录短片',
    author: { displayName: '晓晓', cohortLabel: '2026 届' },
    discipline: 'vfx',
    course: 'video-editing-grading',
    software: ['premiere-pro', 'davinci-resolve'],
    description:
      '跟拍一家面馆清晨备料的三分钟纪录短片。剪辑上用声音先行串联段落，调色时保留了蒸汽与暖光的质感。',
    featured: false,
    aspect: '16:9',
  },
  {
    title: '《城市夜跑》三版调色对比',
    author: { displayName: '阿北', cohortLabel: '2025 届' },
    discipline: 'vfx',
    course: 'video-editing-grading',
    software: ['davinci-resolve'],
    description:
      '同一段夜跑素材的三版调色：写实、青橙电影感与低饱和胶片风，每一版都附上节点结构与思路说明。',
    featured: false,
    aspect: '1:1',
  },
  // —— UI/UX · UI/UX 设计长期就业班（23–26）
  {
    title: '《栖息》植物养护 App 设计',
    author: { displayName: '小鹿', cohortLabel: '2026 届' },
    discipline: 'ui-ux',
    course: 'ui-ux-career',
    software: ['figma', 'photoshop'],
    description:
      '从用户访谈出发，梳理新手养花的常见困扰，完成信息架构、低保真原型到高保真界面，并做了两轮可用性测试。',
    featured: true,
    aspect: '3:4',
    gallery: ['信息架构', '首页与植物详情', '养护提醒流程', '组件与配色规范'],
  },
  {
    title: '《记账小管家》界面重设计',
    author: { displayName: '小鹿', cohortLabel: '2026 届' },
    discipline: 'ui-ux',
    course: 'ui-ux-career',
    software: ['figma', 'illustrator'],
    description:
      '结合自己做财务的经验，重新设计一款个人记账工具：压缩录入步骤，用图表帮助用户看懂月度收支结构。',
    featured: false,
    aspect: '4:3',
  },
  {
    title: '《社区图书角》小程序设计',
    author: { displayName: '阿宁', cohortLabel: '2025 届' },
    discipline: 'ui-ux',
    course: 'ui-ux-career',
    software: ['figma'],
    description:
      '为小区共享书架设计借还书小程序，重点解决扫码借书与归还提醒两个环节，界面采用温和的纸张质感配色。',
    featured: false,
    aspect: '3:4',
  },
  {
    title: '《城市骑行》数据可视化大屏',
    author: { displayName: '程同学', cohortLabel: '2026 届' },
    discipline: 'ui-ux',
    course: 'ui-ux-career',
    software: ['figma', 'illustrator'],
    description:
      '以虚构的城市骑行数据为素材设计监控大屏，在有限的屏幕空间里平衡实时数据、地图与告警信息的层级。',
    featured: false,
    aspect: '16:9',
  },
  // —— UI/UX · 交互设计与原型提升班（27–28）
  {
    title: '《慢旅》旅行规划交互原型',
    author: { displayName: 'Ivy', cohortLabel: '2026 届' },
    discipline: 'ui-ux',
    course: 'interaction-prototyping',
    software: ['figma'],
    description:
      '用可交互原型演示拖拽调整行程、自动估算路程时间等关键流程，并录制用户测试视频来辅助后续迭代。',
    featured: true,
    aspect: '4:3',
  },
  {
    title: '《咖啡点单》微交互动效',
    author: { displayName: '阿森', cohortLabel: '2025 届' },
    discipline: 'ui-ux',
    course: 'interaction-prototyping',
    software: ['figma', 'after-effects'],
    description:
      '围绕加购、选杯型与下单成功设计一组微交互，动效时长与缓动曲线都整理成说明文档，便于和开发对接。',
    featured: false,
    aspect: '3:4',
  },
  // —— UI/UX · Figma 设计系统实战班（29–30）
  {
    title: '《云笺》设计系统组件库',
    author: { displayName: '小满', cohortLabel: '2026 届' },
    discipline: 'ui-ux',
    course: 'figma-design-system',
    software: ['figma'],
    description:
      '为一款虚构的在线文档产品搭建组件库，包含颜色与字号令牌、60 多个组件变体，以及深浅两套主题。',
    featured: false,
    aspect: '4:3',
  },
  {
    title: '《医疗预约》后台设计规范',
    author: { displayName: '老唐', cohortLabel: '2025 届' },
    discipline: 'ui-ux',
    course: 'figma-design-system',
    software: ['figma'],
    description:
      '梳理预约后台的表格、筛选与表单模式，沉淀成可复用的规范文档，统一了原先散落在各个页面的交互细节。',
    featured: false,
    aspect: '4:3',
  },
  // —— 原画与概念设计 · 原画与概念设计长期就业班（31–34）
  {
    title: '《雾港夜巡》场景概念',
    author: { displayName: '沐沐', cohortLabel: '2026 届' },
    discipline: 'concept-art',
    course: 'concept-art-career',
    software: ['photoshop', 'procreate'],
    description:
      '为一款虚构的蒸汽朋克游戏绘制港口夜景。先用剪影快速试了十余版构图，再确定雾气层次与灯光叙事。',
    featured: true,
    aspect: '16:9',
    gallery: ['构图线稿', '色彩小稿', '光影细化'],
  },
  {
    title: '《山鬼》角色设定',
    author: { displayName: '沐沐', cohortLabel: '2026 届' },
    discipline: 'concept-art',
    course: 'concept-art-career',
    software: ['photoshop'],
    description:
      '取材于楚辞意象的角色设计，包含三视图、服饰细节拆解与表情稿，在神秘感与可制作性之间做了不少取舍。',
    featured: false,
    aspect: '2:3',
  },
  {
    title: '《浮空集市》世界观设定集',
    author: { displayName: '阿岳', cohortLabel: '2025 届' },
    discipline: 'concept-art',
    course: 'concept-art-career',
    software: ['photoshop', 'blender'],
    description:
      '为浮空岛屿上的商队集市设计建筑、交通工具与摊位道具，部分复杂结构先在 Blender 中搭出体块再绘制。',
    featured: false,
    aspect: '2:3',
  },
  {
    title: '《潮汐守卫》生物设计',
    author: { displayName: '林木', cohortLabel: '2025 届' },
    discipline: 'concept-art',
    course: 'concept-art-career',
    software: ['photoshop', 'zbrush'],
    description:
      '设计一种栖息在潮间带的守卫生物，从骨骼结构与生态习性推导外形，并用 ZBrush 快速雕刻来验证体积关系。',
    featured: false,
    aspect: '4:5',
  },
  // —— 原画与概念设计 · 角色原画提升班（35–36）
  {
    title: '《九色》民族服饰角色',
    author: { displayName: '阿朵', cohortLabel: '2026 届' },
    discipline: 'concept-art',
    course: 'character-concept',
    software: ['photoshop', 'procreate'],
    description:
      '以西南地区刺绣纹样为灵感设计三位角色，重点研究服饰结构与配色比例，避免纹样的简单堆砌。',
    featured: true,
    aspect: '2:3',
  },
  {
    title: '《废土信使》角色迭代稿',
    author: { displayName: '小川', cohortLabel: '2025 届' },
    discipline: 'concept-art',
    course: 'character-concept',
    software: ['photoshop'],
    description:
      '展示同一角色从剪影、线稿到上色的五轮迭代，并记录了每一轮根据讲师反馈做出的具体调整。',
    featured: false,
    aspect: '3:4',
  },
  // —— 原画与概念设计 · 数字绘画入门班（37–38）
  {
    title: '《窗边的橘子》数字静物',
    author: { displayName: '糖糖', cohortLabel: '2026 届' },
    discipline: 'concept-art',
    course: 'digital-painting-foundation',
    software: ['procreate'],
    description:
      '入门阶段的光影练习，只用三种笔刷表现橘子皮的颗粒感、玻璃杯的折射，以及午后斜射进来的阳光。',
    featured: false,
    aspect: '4:5',
  },
  {
    title: '《傍晚的公交站》场景速涂',
    author: { displayName: '阿远', cohortLabel: '2025 届' },
    discipline: 'concept-art',
    course: 'digital-painting-foundation',
    software: ['photoshop', 'procreate'],
    description:
      '限时两小时的场景速涂，训练快速概括大色块与环境光；课后又针对人物比例和透视画了一版修正稿。',
    featured: false,
    aspect: '4:3',
  },
  // —— 平面与品牌设计 · 平面与品牌设计长期就业班（39–41）
  {
    title: '《栖山茶舍》品牌视觉',
    author: { displayName: '小葵', cohortLabel: '2026 届' },
    discipline: 'graphic-design',
    course: 'graphic-design-career',
    software: ['illustrator', 'photoshop'],
    description:
      '为一家虚构的山间茶舍设计标志、辅助图形与包装系统，图形取自茶田梯田的等高线，并延展到菜单与门头。',
    featured: true,
    aspect: '4:3',
  },
  {
    title: '《城市声音节》系列海报',
    author: { displayName: '阿宽', cohortLabel: '2025 届' },
    discipline: 'graphic-design',
    course: 'graphic-design-career',
    software: ['illustrator', 'photoshop'],
    description:
      '为虚构的户外音乐节设计系列海报，用各城市街景的声波图形构成主视觉，同时保持字体系统的统一。',
    featured: false,
    aspect: '2:3',
  },
  {
    title: '《二十四节气》书籍装帧',
    author: { displayName: '晴晴', cohortLabel: '2026 届' },
    discipline: 'graphic-design',
    course: 'graphic-design-career',
    software: ['illustrator', 'photoshop'],
    description:
      '一套节气主题的小开本书籍装帧。封面使用各节气代表植物的剪影，内页网格兼顾图片与竖排文字。',
    featured: false,
    aspect: '3:4',
  },
  // —— 平面与品牌设计 · 品牌视觉设计提升班（42–43）
  {
    title: '《拾味》社区餐馆品牌升级',
    author: { displayName: 'Leo', cohortLabel: '2026 届' },
    discipline: 'graphic-design',
    course: 'brand-identity',
    software: ['illustrator', 'photoshop'],
    description:
      '为一家开了多年的社区小馆做品牌升级，保留老顾客熟悉的红色基调，重新整理字标、辅助图形与物料规范。',
    featured: false,
    aspect: '4:3',
  },
  {
    title: '《小森林》绘本品牌与吉祥物',
    author: { displayName: '安安', cohortLabel: '2025 届' },
    discipline: 'graphic-design',
    course: 'brand-identity',
    software: ['illustrator', 'procreate'],
    description:
      '为虚构的儿童绘本出版品牌设计标志与吉祥物，吉祥物有六种基础表情，可灵活用在书脊、贴纸与活动物料上。',
    featured: true,
    aspect: '1:1',
  },
  // —— 平面与品牌设计 · 电商视觉设计实战班（44–45）
  {
    title: '《晨露》护肤品详情页',
    author: { displayName: '小橘', cohortLabel: '2026 届' },
    discipline: 'graphic-design',
    course: 'ecommerce-visual',
    software: ['photoshop', 'cinema-4d'],
    description:
      '从卖点梳理到版式节奏，完成一套护肤品详情页。产品主图用 C4D 渲染以统一光影，省去了部分实拍环节。',
    featured: false,
    aspect: '2:3',
  },
  {
    title: '《年货节》店铺首页视觉',
    author: { displayName: '阿峰', cohortLabel: '2025 届' },
    discipline: 'graphic-design',
    course: 'ecommerce-visual',
    software: ['photoshop', 'illustrator'],
    description:
      '为虚构的零食店铺设计节日首页与活动会场，在热闹氛围和商品信息的清晰度之间反复调整色彩比例。',
    featured: false,
    aspect: '3:4',
  },
  // —— 动态图形与短视频 · 动态图形设计长期就业班（46–48）
  {
    title: '《城市脉搏》MG 动画短片',
    author: { displayName: '阿乐', cohortLabel: '2026 届' },
    discipline: 'motion-design',
    course: 'motion-design-career',
    software: ['after-effects', 'illustrator'],
    description:
      '一支 60 秒的城市公共服务科普动画，脚本、分镜、图形与动画均独立完成，重点练习了转场之间的节奏衔接。',
    featured: true,
    aspect: '16:9',
    videoBvid: 'BV1ED00000w2',
  },
  {
    title: '《节气字》动态字体实验',
    author: { displayName: '阿乐', cohortLabel: '2026 届' },
    discipline: 'motion-design',
    course: 'motion-design-career',
    software: ['after-effects', 'cinema-4d'],
    description:
      '把节气汉字拆解为笔画，用不同的运动规律表现风、雨、霜、雪，尝试让文字本身带出季节的情绪。',
    featured: false,
    aspect: '1:1',
  },
  {
    title: '《耳机拆解》产品动态演示',
    author: { displayName: 'Kiki', cohortLabel: '2025 届' },
    discipline: 'motion-design',
    course: 'motion-design-career',
    software: ['cinema-4d', 'after-effects'],
    description:
      '为虚构的耳机品牌制作产品演示动画，用三维拆解展示内部结构，再配合简洁的文字动效说明卖点。',
    featured: false,
    aspect: '16:9',
  },
  // —— 动态图形与短视频 · C4D 三维动态提升班（49–50）
  {
    title: '《软糖星球》三维动态海报',
    author: { displayName: '圆圆', cohortLabel: '2026 届' },
    discipline: 'motion-design',
    course: 'c4d-motion',
    software: ['cinema-4d', 'after-effects'],
    description:
      '用柔体动力学制作软糖弹跳的循环动画，搭配高饱和的糖果配色，输出为适合社交平台的竖版动态海报。',
    featured: true,
    aspect: '4:5',
  },
  {
    title: '《几何呼吸》循环动画',
    author: { displayName: '阿木', cohortLabel: '2025 届' },
    discipline: 'motion-design',
    course: 'c4d-motion',
    software: ['cinema-4d'],
    description:
      '以“呼吸”为主题的抽象几何循环动画，练习克隆器、效果器与材质过渡，整段首尾无缝衔接。',
    featured: false,
    aspect: '1:1',
  },
  // —— 动态图形与短视频 · 短视频创作实战班（51–52）
  {
    title: '《老街修表匠》人物短视频',
    author: { displayName: '小林', cohortLabel: '2026 届' },
    discipline: 'motion-design',
    course: 'short-video-creation',
    software: ['premiere-pro', 'after-effects'],
    description:
      '竖屏人物短视频，从选题、采访提纲到拍摄剪辑都由本人完成，用手部特写与环境音还原修表铺的日常节奏。',
    featured: false,
    aspect: '2:3',
  },
  {
    title: '《一分钟学手冲》知识短视频',
    author: { displayName: '阿七', cohortLabel: '2025 届' },
    discipline: 'motion-design',
    course: 'short-video-creation',
    software: ['premiere-pro', 'after-effects', 'davinci-resolve'],
    description:
      '知识类短视频练习，把手冲咖啡的步骤拆成四个镜头段落，配合字幕动效与卡点剪辑控制信息密度。',
    featured: false,
    aspect: '3:4',
  },
  // —— 建筑与室内可视化 · 建筑与室内可视化长期就业班（53–55）
  {
    title: '《湖畔美术馆》建筑表现',
    author: { displayName: '阿然', cohortLabel: '2026 届' },
    discipline: 'arch-viz',
    course: 'arch-viz-career',
    software: ['3ds-max', 'd5-render', 'photoshop'],
    description:
      '依据虚构的方案图完成湖畔小型美术馆的建模与表现，分别输出清晨薄雾与夜间亮灯两组效果图。',
    featured: true,
    aspect: '16:9',
  },
  {
    title: '《小户型的光》室内效果图',
    author: { displayName: '阿然', cohortLabel: '2026 届' },
    discipline: 'arch-viz',
    course: 'arch-viz-career',
    software: ['3ds-max', 'd5-render'],
    description:
      '为一套 45 平方米的小户型做空间表现，用浅色材质与自然光营造开阔感，并附上软装选材说明。',
    featured: false,
    aspect: '4:3',
  },
  {
    title: '《山居民宿》景观鸟瞰',
    author: { displayName: '宁宁', cohortLabel: '2025 届' },
    discipline: 'arch-viz',
    course: 'arch-viz-career',
    software: ['sketchup', 'd5-render', 'photoshop'],
    description:
      '山地民宿项目的鸟瞰表现，重点处理地形高差、植被层次与远山的大气透视，后期统一了整体色调。',
    featured: false,
    aspect: '4:3',
  },
  // —— 建筑与室内可视化 · D5 实时渲染提升班（56–57）
  {
    title: '《雨夜书店》实时渲染漫游',
    author: { displayName: '阿诚', cohortLabel: '2026 届' },
    discipline: 'arch-viz',
    course: 'd5-realtime-rendering',
    software: ['sketchup', 'd5-render'],
    description:
      '用 D5 制作一段 40 秒的书店漫游动画，练习了雨天的湿润材质、室内暖光以及镜头路径的设计。',
    featured: true,
    aspect: '16:9',
  },
  {
    title: '《北欧客厅》多风格方案对比',
    author: { displayName: '小雅', cohortLabel: '2025 届' },
    discipline: 'arch-viz',
    course: 'd5-realtime-rendering',
    software: ['3ds-max', 'd5-render'],
    description:
      '同一客厅空间的三种软装风格对比，借助实时渲染快速切换材质与灯光，方便和业主沟通方案。',
    featured: false,
    aspect: '4:3',
  },
  // —— 建筑与室内可视化 · 室内设计基础班（58–59）
  {
    title: '《一居室改造》平面布局方案',
    author: { displayName: '毛毛', cohortLabel: '2026 届' },
    discipline: 'arch-viz',
    course: 'interior-design-foundation',
    software: ['sketchup', 'photoshop'],
    description:
      '基础班课题：为独居上班族改造一居室，从动线分析、收纳规划到彩色平面图，完整呈现设计思路。',
    featured: false,
    aspect: '1:1',
  },
  {
    title: '《竹影》新中式茶室方案',
    author: { displayName: '青青', cohortLabel: '2025 届' },
    discipline: 'arch-viz',
    course: 'interior-design-foundation',
    software: ['sketchup', 'd5-render'],
    description:
      '小型新中式茶室设计练习，用木格栅与竹帘处理光影，完成平立面图、材料板与两张透视效果图。',
    featured: false,
    aspect: '3:4',
  },
]
