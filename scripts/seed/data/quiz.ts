import type { SeedQuizQuestion } from '../types'

/**
 * 职业方向测试题。每个选项给 1–2 个专业方向加分（权重 1–3），
 * 各方向在全部选项中的总权重大致均衡，让每个方向都有机会成为推荐结果。
 */
export const quizQuestions: SeedQuizQuestion[] = [
  {
    question: '你更享受哪种创作过程？',
    options: [
      {
        label: '把脑海中的角色或场景一笔一笔画出来',
        scores: [
          { discipline: 'concept-art', weight: 3 },
          { discipline: 'game-art', weight: 1 },
        ],
      },
      {
        label: '在三维空间里搭建模型，反复调整造型与光影',
        scores: [
          { discipline: '3d-animation', weight: 2 },
          { discipline: 'arch-viz', weight: 2 },
        ],
      },
      {
        label: '研究别人怎么使用一个产品，再把流程设计得更顺',
        scores: [{ discipline: 'ui-ux', weight: 3 }],
      },
      {
        label: '把零散的素材剪辑、合成为一段有节奏的影像',
        scores: [
          { discipline: 'vfx', weight: 2 },
          { discipline: 'motion-design', weight: 2 },
        ],
      },
    ],
  },
  {
    question: '你更喜欢静态画面还是动态影像？',
    options: [
      {
        label: '静态画面，喜欢慢慢打磨构图与细节',
        scores: [
          { discipline: 'concept-art', weight: 2 },
          { discipline: 'graphic-design', weight: 2 },
        ],
      },
      {
        label: '动态影像，喜欢镜头与节奏带来的感受',
        scores: [
          { discipline: 'motion-design', weight: 2 },
          { discipline: 'vfx', weight: 2 },
        ],
      },
      {
        label: '可以交互的画面，喜欢点一下就有反馈',
        scores: [
          { discipline: 'ui-ux', weight: 2 },
          { discipline: 'game-art', weight: 1 },
        ],
      },
      {
        label: '可以自由走动的空间，比如游戏地图或样板间',
        scores: [
          { discipline: 'arch-viz', weight: 2 },
          { discipline: 'game-art', weight: 2 },
        ],
      },
    ],
  },
  {
    question: '你平时打开得最多的是哪类软件？',
    options: [
      {
        label: '绘画类：Procreate、Photoshop 等',
        scores: [
          { discipline: 'concept-art', weight: 2 },
          { discipline: 'graphic-design', weight: 1 },
        ],
      },
      {
        label: '剪辑类：Premiere Pro、DaVinci Resolve 等',
        scores: [
          { discipline: 'vfx', weight: 2 },
          { discipline: 'motion-design', weight: 2 },
        ],
      },
      {
        label: '三维类：Blender、Maya、SketchUp 等',
        scores: [
          { discipline: '3d-animation', weight: 2 },
          { discipline: 'arch-viz', weight: 2 },
        ],
      },
      {
        label: '设计类：Figma、Illustrator 等',
        scores: [
          { discipline: 'ui-ux', weight: 2 },
          { discipline: 'graphic-design', weight: 2 },
        ],
      },
    ],
  },
  {
    question: '朋友找你帮忙时，通常是哪类事情？',
    options: [
      {
        label: '做生日海报或活动邀请函',
        scores: [{ discipline: 'graphic-design', weight: 3 }],
      },
      {
        label: '把旅行或聚会的素材剪成一段视频',
        scores: [
          { discipline: 'motion-design', weight: 2 },
          { discipline: 'vfx', weight: 1 },
        ],
      },
      {
        label: '帮忙看看新房的装修方案',
        scores: [{ discipline: 'arch-viz', weight: 3 }],
      },
      {
        label: '给他们做的小程序或网页提提意见',
        scores: [{ discipline: 'ui-ux', weight: 3 }],
      },
    ],
  },
  {
    question: '玩游戏或看动画时，你会特别留意什么？',
    options: [
      {
        label: '角色的动作是否自然、有表现力',
        scores: [{ discipline: '3d-animation', weight: 3 }],
      },
      {
        label: '场景、道具和角色的美术风格',
        scores: [
          { discipline: 'game-art', weight: 3 },
          { discipline: 'concept-art', weight: 2 },
        ],
      },
      {
        label: '爆炸、魔法等特效镜头够不够震撼',
        scores: [{ discipline: 'vfx', weight: 3 }],
      },
      {
        label: '菜单和操作界面用起来是否顺手',
        scores: [
          { discipline: 'ui-ux', weight: 1 },
          { discipline: 'game-art', weight: 1 },
        ],
      },
    ],
  },
  {
    question: '你更喜欢哪种工作节奏？',
    options: [
      {
        label: '长时间专注打磨一个作品，追求细节',
        scores: [
          { discipline: 'concept-art', weight: 2 },
          { discipline: '3d-animation', weight: 2 },
        ],
      },
      {
        label: '节奏快、项目多，经常接触新内容',
        scores: [
          { discipline: 'motion-design', weight: 3 },
          { discipline: 'graphic-design', weight: 1 },
        ],
      },
      {
        label: '和团队紧密配合，按流程分工推进',
        scores: [
          { discipline: 'game-art', weight: 2 },
          { discipline: 'vfx', weight: 2 },
        ],
      },
      {
        label: '和客户沟通需求，再把方案落地',
        scores: [
          { discipline: 'arch-viz', weight: 2 },
          { discipline: 'graphic-design', weight: 2 },
        ],
      },
    ],
  },
  {
    question: '面对一个新软件，你通常怎么上手？',
    options: [
      {
        label: '先找案例照着做，再慢慢摸索参数',
        scores: [
          { discipline: '3d-animation', weight: 2 },
          { discipline: 'motion-design', weight: 1 },
        ],
      },
      {
        label: '喜欢研究节点和底层逻辑，弄清它为什么这样运作',
        scores: [{ discipline: 'vfx', weight: 3 }],
      },
      {
        label: '先想清楚它能解决什么问题，再决定学多深',
        scores: [
          { discipline: 'ui-ux', weight: 1 },
          { discipline: 'arch-viz', weight: 2 },
        ],
      },
      {
        label: '先拿来随手画几笔，试试笔刷手感',
        scores: [
          { discipline: 'concept-art', weight: 2 },
          { discipline: 'game-art', weight: 1 },
        ],
      },
    ],
  },
  {
    question: '完成下面哪种作品会让你很有成就感？',
    options: [
      {
        label: '一个能动起来、有性格的三维角色',
        scores: [
          { discipline: '3d-animation', weight: 3 },
          { discipline: 'game-art', weight: 1 },
        ],
      },
      {
        label: '一套风格统一、用在各种物料上的品牌视觉',
        scores: [{ discipline: 'graphic-design', weight: 3 }],
      },
      {
        label: '一段几十秒、节奏紧凑的动态短片',
        scores: [{ discipline: 'motion-design', weight: 3 }],
      },
      {
        label: '一组让人想住进去的室内效果图',
        scores: [{ discipline: 'arch-viz', weight: 3 }],
      },
    ],
  },
  {
    question: '你觉得自己更擅长哪一类能力？',
    options: [
      {
        label: '造型与手绘，能把想法画出来',
        scores: [{ discipline: 'concept-art', weight: 3 }],
      },
      {
        label: '空间想象，能在脑中旋转一个物体',
        scores: [
          { discipline: '3d-animation', weight: 2 },
          { discipline: 'game-art', weight: 2 },
        ],
      },
      {
        label: '逻辑与表达，能把复杂的事情讲清楚',
        scores: [{ discipline: 'ui-ux', weight: 3 }],
      },
      {
        label: '色彩与排版，对字体和配色很敏感',
        scores: [
          { discipline: 'graphic-design', weight: 2 },
          { discipline: 'motion-design', weight: 2 },
        ],
      },
    ],
  },
  {
    question: '你理想中的工作场景更接近哪一种？',
    options: [
      {
        label: '在游戏团队里制作角色或场景美术',
        scores: [
          { discipline: 'game-art', weight: 3 },
          { discipline: 'concept-art', weight: 1 },
        ],
      },
      {
        label: '在后期团队里参与电影或广告镜头的制作',
        scores: [
          { discipline: 'vfx', weight: 3 },
          { discipline: '3d-animation', weight: 1 },
        ],
      },
      {
        label: '在互联网团队里设计产品界面',
        scores: [{ discipline: 'ui-ux', weight: 3 }],
      },
      {
        label: '在设计事务所或工作室做空间与品牌项目',
        scores: [
          { discipline: 'arch-viz', weight: 2 },
          { discipline: 'graphic-design', weight: 2 },
        ],
      },
    ],
  },
]
