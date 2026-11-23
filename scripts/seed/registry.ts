/**
 * 种子数据的“骨架”：专业方向、课程、软件、校区的 slug 与名称。
 * 其它种子数据通过这里的 slug 互相引用，类型系统保证引用有效（写错 slug 会编译失败）。
 * 所有内容均为虚构，仅用于演示。
 */

export const DISCIPLINES = [
  { slug: '3d-animation', name: '三维动画', shortName: '三维动画', hue: 205 },
  { slug: 'game-art', name: '游戏美术', shortName: '游戏美术', hue: 165 },
  { slug: 'vfx', name: '影视特效与后期', shortName: '影视后期', hue: 12 },
  { slug: 'ui-ux', name: 'UI/UX 设计', shortName: 'UI 设计', hue: 228 },
  { slug: 'concept-art', name: '原画与概念设计', shortName: '原画设计', hue: 38 },
  { slug: 'graphic-design', name: '平面与品牌设计', shortName: '平面设计', hue: 345 },
  { slug: 'motion-design', name: '动态图形与短视频', shortName: '动态设计', hue: 275 },
  { slug: 'arch-viz', name: '建筑与室内可视化', shortName: '室内设计', hue: 110 },
] as const

export type DisciplineSlug = (typeof DISCIPLINES)[number]['slug']

export const SOFTWARE = [
  { slug: 'maya', name: 'Maya', category: 'modeling' },
  { slug: '3ds-max', name: '3ds Max', category: 'modeling' },
  { slug: 'blender', name: 'Blender', category: 'modeling' },
  { slug: 'zbrush', name: 'ZBrush', category: 'modeling' },
  { slug: 'cinema-4d', name: 'Cinema 4D', category: 'modeling' },
  { slug: 'marvelous-designer', name: 'Marvelous Designer', category: 'modeling' },
  { slug: 'sketchup', name: 'SketchUp', category: 'modeling' },
  { slug: 'substance-painter', name: 'Substance 3D Painter', category: 'rendering' },
  { slug: 'unreal-engine', name: 'Unreal Engine', category: 'rendering' },
  { slug: 'unity', name: 'Unity', category: 'rendering' },
  { slug: 'd5-render', name: 'D5 Render', category: 'rendering' },
  { slug: 'houdini', name: 'Houdini', category: 'compositing' },
  { slug: 'nuke', name: 'Nuke', category: 'compositing' },
  { slug: 'after-effects', name: 'After Effects', category: 'compositing' },
  { slug: 'premiere-pro', name: 'Premiere Pro', category: 'compositing' },
  { slug: 'davinci-resolve', name: 'DaVinci Resolve', category: 'compositing' },
  { slug: 'photoshop', name: 'Photoshop', category: 'design' },
  { slug: 'illustrator', name: 'Illustrator', category: 'design' },
  { slug: 'figma', name: 'Figma', category: 'design' },
  { slug: 'procreate', name: 'Procreate', category: 'painting' },
] as const

export type SoftwareSlug = (typeof SOFTWARE)[number]['slug']

export const CAMPUSES = [
  {
    slug: 'beijing-haidian',
    name: '北京海淀校区',
    city: '北京',
    citySlug: 'beijing',
    lng: 116.31,
    lat: 39.98,
  },
  {
    slug: 'shanghai-xuhui',
    name: '上海徐汇校区',
    city: '上海',
    citySlug: 'shanghai',
    lng: 121.44,
    lat: 31.19,
  },
  {
    slug: 'guangzhou-tianhe',
    name: '广州天河校区',
    city: '广州',
    citySlug: 'guangzhou',
    lng: 113.36,
    lat: 23.13,
  },
  {
    slug: 'shenzhen-nanshan',
    name: '深圳南山校区',
    city: '深圳',
    citySlug: 'shenzhen',
    lng: 113.93,
    lat: 22.53,
  },
  {
    slug: 'chengdu-gaoxin',
    name: '成都高新校区',
    city: '成都',
    citySlug: 'chengdu',
    lng: 104.06,
    lat: 30.58,
  },
  {
    slug: 'hangzhou-binjiang',
    name: '杭州滨江校区',
    city: '杭州',
    citySlug: 'hangzhou',
    lng: 120.21,
    lat: 30.21,
  },
] as const

export type CampusSlug = (typeof CAMPUSES)[number]['slug']

type DeliveryMode = 'offline' | 'online' | 'dual'

export const COURSES = [
  // 三维动画
  {
    slug: '3d-animation-career',
    title: '三维动画设计长期就业班',
    discipline: '3d-animation',
    classType: 'long_term',
    modes: ['offline', 'dual'],
  },
  {
    slug: 'character-modeling-rigging',
    title: '角色建模与绑定提升班',
    discipline: '3d-animation',
    classType: 'short_term',
    modes: ['online'],
  },
  {
    slug: 'blender-3d-foundation',
    title: 'Blender 三维入门班',
    discipline: '3d-animation',
    classType: 'short_term',
    modes: ['online'],
  },
  // 游戏美术
  {
    slug: 'game-art-career',
    title: '游戏美术长期就业班',
    discipline: 'game-art',
    classType: 'long_term',
    modes: ['offline'],
  },
  {
    slug: 'game-scene-design',
    title: '游戏场景设计提升班',
    discipline: 'game-art',
    classType: 'short_term',
    modes: ['dual'],
  },
  {
    slug: 'ue5-realtime-art',
    title: 'UE5 实时美术提升班',
    discipline: 'game-art',
    classType: 'short_term',
    modes: ['online'],
  },
  // 影视特效与后期
  {
    slug: 'vfx-compositing-career',
    title: '影视特效与合成长期就业班',
    discipline: 'vfx',
    classType: 'long_term',
    modes: ['offline'],
  },
  {
    slug: 'houdini-fx',
    title: 'Houdini 特效提升班',
    discipline: 'vfx',
    classType: 'short_term',
    modes: ['online'],
  },
  {
    slug: 'video-editing-grading',
    title: '视频剪辑与调色入门班',
    discipline: 'vfx',
    classType: 'short_term',
    modes: ['online'],
  },
  // UI/UX
  {
    slug: 'ui-ux-career',
    title: 'UI/UX 设计长期就业班',
    discipline: 'ui-ux',
    classType: 'long_term',
    modes: ['offline', 'online'],
  },
  {
    slug: 'interaction-prototyping',
    title: '交互设计与原型提升班',
    discipline: 'ui-ux',
    classType: 'short_term',
    modes: ['online'],
  },
  {
    slug: 'figma-design-system',
    title: 'Figma 设计系统实战班',
    discipline: 'ui-ux',
    classType: 'short_term',
    modes: ['online'],
  },
  // 原画与概念设计
  {
    slug: 'concept-art-career',
    title: '原画与概念设计长期就业班',
    discipline: 'concept-art',
    classType: 'long_term',
    modes: ['offline'],
  },
  {
    slug: 'character-concept',
    title: '角色原画提升班',
    discipline: 'concept-art',
    classType: 'short_term',
    modes: ['dual'],
  },
  {
    slug: 'digital-painting-foundation',
    title: '数字绘画入门班',
    discipline: 'concept-art',
    classType: 'short_term',
    modes: ['online'],
  },
  // 平面与品牌设计
  {
    slug: 'graphic-design-career',
    title: '平面与品牌设计长期就业班',
    discipline: 'graphic-design',
    classType: 'long_term',
    modes: ['offline'],
  },
  {
    slug: 'brand-identity',
    title: '品牌视觉设计提升班',
    discipline: 'graphic-design',
    classType: 'short_term',
    modes: ['online'],
  },
  {
    slug: 'ecommerce-visual',
    title: '电商视觉设计实战班',
    discipline: 'graphic-design',
    classType: 'short_term',
    modes: ['online'],
  },
  // 动态图形与短视频
  {
    slug: 'motion-design-career',
    title: '动态图形设计长期就业班',
    discipline: 'motion-design',
    classType: 'long_term',
    modes: ['offline', 'online'],
  },
  {
    slug: 'c4d-motion',
    title: 'C4D 三维动态提升班',
    discipline: 'motion-design',
    classType: 'short_term',
    modes: ['online'],
  },
  {
    slug: 'short-video-creation',
    title: '短视频创作实战班',
    discipline: 'motion-design',
    classType: 'short_term',
    modes: ['online'],
  },
  // 建筑与室内可视化
  {
    slug: 'arch-viz-career',
    title: '建筑与室内可视化长期就业班',
    discipline: 'arch-viz',
    classType: 'long_term',
    modes: ['offline'],
  },
  {
    slug: 'd5-realtime-rendering',
    title: 'D5 实时渲染提升班',
    discipline: 'arch-viz',
    classType: 'short_term',
    modes: ['online'],
  },
  {
    slug: 'interior-design-foundation',
    title: '室内设计基础班',
    discipline: 'arch-viz',
    classType: 'short_term',
    modes: ['dual'],
  },
] as const satisfies ReadonlyArray<{
  slug: string
  title: string
  discipline: DisciplineSlug
  classType: 'long_term' | 'short_term'
  modes: readonly DeliveryMode[]
}>

export type CourseSlug = (typeof COURSES)[number]['slug']

/** 资讯分类；description 是分类页 h1 下的简介与 meta description（原创，不含绝对化用语与效果承诺） */
export const ARTICLE_CATEGORIES = [
  {
    slug: 'news',
    name: '学院新闻',
    description: '各校区的开放日、公开课、学员活动与教学安排更新，了解学院最近在做些什么。',
  },
  {
    slug: 'industry',
    name: '行业资讯',
    description:
      '游戏、影视动画、视觉设计等数字艺术行业的岗位变化、制作流程与常用工具观察，帮助入行前建立对行业的整体认识。',
  },
  {
    slug: 'learning',
    name: '学习干货',
    description:
      '软件操作、造型与色彩基础、建模与渲染技巧、作品集整理等学习方法，适合自学者与在读学员随时查阅。',
  },
  {
    slug: 'faq',
    name: '常见问题',
    description: '关于选择专业方向、零基础能否入门、上课方式、报名流程与费用的常见疑问解答。',
  },
] as const

export type ArticleCategorySlug = (typeof ARTICLE_CATEGORIES)[number]['slug']
