import type { SeedTutorial } from '../types'

/**
 * 免费教程。videoId 为格式合法的占位 BV 号，不对应真实视频。
 * gated 为软门槛：留资后解锁，仅用于引导留资，并非内容保护。
 */
export const tutorials: SeedTutorial[] = [
  {
    slug: 'blender-low-poly-cabin',
    title: 'Blender 入门：做一座低多边形小木屋',
    discipline: '3d-animation',
    videoId: 'BV1ED00000a1',
    duration: '18:40',
    level: 'beginner',
    gated: false,
    description:
      '从界面与视图操作讲起，用挤出、倒角和环切完成一座低多边形小木屋，最后加上简单的灯光与材质，适合刚安装好 Blender 的同学。',
  },
  {
    slug: 'walk-cycle-key-poses',
    title: '角色走路循环：关键姿势与节奏',
    discipline: '3d-animation',
    videoId: 'BV1ED00000a2',
    duration: '24:15',
    level: 'intermediate',
    gated: true,
    description:
      '拆解走路循环中的接触、下沉、经过、抬升四个关键姿势，讲解重心起伏与手臂摆动的节奏关系，并演示如何用曲线编辑器修顺循环。',
  },
  {
    slug: 'stylized-prop-texturing',
    title: '风格化道具材质：以木桶为例',
    discipline: 'game-art',
    videoId: 'BV1ED00000a3',
    duration: '21:05',
    level: 'intermediate',
    gated: false,
    description:
      '在 Substance 3D Painter 中为一只木桶制作手绘风格材质，涉及颜色分层、边缘高光与磨损处理，讲解如何让风格化材质既统一又不单调。',
  },
  {
    slug: 'ue5-scene-lighting-basics',
    title: 'UE5 场景灯光入门',
    discipline: 'game-art',
    videoId: 'BV1ED00000a4',
    duration: '16:30',
    level: 'beginner',
    gated: false,
    description:
      '认识定向光、天空光与后期处理体积，搭建一个简单的室外场景并调出清晨与黄昏两种氛围，了解实时光照中常用参数的作用。',
  },
  {
    slug: 'nuke-hair-keying',
    title: 'Nuke 复杂绿幕抠像：发丝与运动模糊',
    discipline: 'vfx',
    videoId: 'BV1ED00000a5',
    duration: '27:20',
    level: 'advanced',
    gated: true,
    description:
      '针对发丝、半透明物体与运动模糊等难点，演示分区抠像、边缘修复与溢色处理的组合方法，并讲解如何检查合成后的边缘质量。',
  },
  {
    slug: 'figma-auto-layout',
    title: 'Figma 自动布局从入门到实用',
    discipline: 'ui-ux',
    videoId: 'BV1ED00000a6',
    duration: '14:20',
    level: 'beginner',
    gated: false,
    description:
      '用按钮、卡片和列表三个例子讲清自动布局的方向、间距、填充与对齐设置，让组件在文字长度变化时依然保持整齐。',
  },
  {
    slug: 'lightweight-usability-test',
    title: '一小时完成一轮轻量可用性测试',
    discipline: 'ui-ux',
    videoId: 'BV1ED00000a7',
    duration: '12:45',
    level: 'intermediate',
    gated: false,
    description:
      '介绍如何准备测试任务、招募少量测试者、记录观察结果并整理问题优先级，帮助你在资源有限的情况下验证设计方案。',
  },
  {
    slug: 'character-silhouette-sketching',
    title: '角色剪影草图快速练习',
    discipline: 'concept-art',
    videoId: 'BV1ED00000a8',
    duration: '15:10',
    level: 'beginner',
    gated: false,
    description:
      '用套索工具和大号笔刷快速生成角色剪影，讲解圆、方、三角三种形状语言的运用，并示范如何从一批剪影中挑选方向继续深化。',
  },
  {
    slug: 'logo-grid-and-proportion',
    title: '标志设计中的网格与比例',
    discipline: 'graphic-design',
    videoId: 'BV1ED00000a9',
    duration: '17:35',
    level: 'intermediate',
    gated: true,
    description:
      '以一个虚构品牌的标志为例，演示如何用网格与比例关系校正图形，处理视觉误差，并输出适用于不同尺寸的标志规范。',
  },
  {
    slug: 'ae-text-animation-rhythm',
    title: 'AE 文字动画的五种节奏处理',
    discipline: 'motion-design',
    videoId: 'BV1ED00000b1',
    duration: '11:20',
    level: 'beginner',
    gated: false,
    description:
      '通过五个短案例，讲解文字逐字出现、弹性缩放、遮罩揭示等动画的缓动设置，让字幕与标题动画更有节奏感。',
  },
  {
    slug: 'c4d-mograph-cloner',
    title: 'C4D 运动图形：克隆与效果器',
    discipline: 'motion-design',
    videoId: 'BV1ED00000b2',
    duration: '26:40',
    level: 'advanced',
    gated: true,
    description:
      '深入讲解克隆对象的多种模式，以及简易、随机、延迟等效果器的叠加使用，完成一段由几何体阵列组成的品牌开场动画。',
  },
  {
    slug: 'd5-interior-daylight',
    title: 'D5 Render 室内日光场景渲染',
    discipline: 'arch-viz',
    videoId: 'BV1ED00000b3',
    duration: '22:10',
    level: 'intermediate',
    gated: false,
    description:
      '从模型导入开始，设置太阳角度、天空环境与曝光，调整木材、布艺和石材的质感，输出一张自然光下的客厅效果图。',
  },
]
