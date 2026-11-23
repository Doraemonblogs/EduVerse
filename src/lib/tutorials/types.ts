import type { DisciplineRef } from '@/lib/course/types'
import type { ImageSource } from '@/lib/media'
import type { Tutorial, TutorialPage } from '@/payload-types'

/**
 * 免费教程模块（/tutorials 列表与播放弹窗）的视图模型。
 *
 * - 全部是可 JSON 序列化的普通对象：可以直接作为 props 传给客户端组件，也能进 unstable_cache；
 * - 由数据层 `src/lib/data/tutorials.ts` 从 Payload 文档映射而来；
 * - 草稿已在数据层剔除：这里出现的教程都是已发布的，专业方向只在已发布时给出。
 * - “留资后解锁”（gated）只是引导留资的软门槛，不是访问控制：视频在公开平台，embedUrl 对所有教程都给出。
 */

/** 难度：入门 / 进阶 / 高阶（显示文字用 tutorialLevelLabel()） */
export type TutorialLevel = NonNullable<Tutorial['level']>

/** 视频平台（显示文字用 tutorialProviderLabel()） */
export type TutorialProvider = Tutorial['provider']

export type TutorialCardData = {
  id: number
  slug: string
  title: string
  /** 简介（纯文本，可能为空） */
  description: string | null
  /** 封面（card 尺寸 800 宽，16:9 左右）；alt 可能为空，组件用标题兜底 */
  cover: ImageSource | null
  /** 所属专业方向；未填写或未发布时为 null（教程照常展示，只是不显示 / 不能按它筛选） */
  discipline: DisciplineRef | null
  level: TutorialLevel
  provider: TutorialProvider
  /** 视频 ID（哔哩哔哩 BV 号） */
  videoId: string
  /**
   * 白名单内的播放器地址（tutorialEmbedUrl 构造并校验）；视频 ID 不合法时为 null → 前台显示“视频暂不可用”。
   * 必须“点击后加载”（VideoFacade），首屏 / 打开弹窗时都不请求第三方。
   */
  embedUrl: string | null
  /** 时长文字，如“18:40”（后台自由填写，可能为空） */
  duration: string | null
  /** 留资后解锁（软门槛） */
  gated: boolean
  /** 收录时间（后台创建时间，ISO 时间戳）；不是视频在平台上的上传时间 */
  addedAt: string
}

export type TutorialListData = {
  /** 全部已发布的教程，按后台排序（order、ID） */
  tutorials: TutorialCardData[]
  /** 筛选项来源：已发布的专业方向（按后台排序；页面可只保留有教程的方向） */
  facets: { disciplines: DisciplineRef[] }
}

/** 教程页面设置（全局 tutorial-pages），缺省值见 src/globals/tutorial-pages-defaults.ts */
export type TutorialPagesSettings = {
  list: {
    title: string
    /** 后台清空时为 null（不显示） */
    description: string | null
    /** 原样交给 buildMetadata({ seo }) */
    seo: TutorialPage['list']['seo'] | null
  }
  gate: {
    title: string
    description: string | null
    submitLabel: string
  }
}

/** 列表筛选条件（都是单选；未选择的维度不出现） */
export type TutorialFilters = {
  /** 专业方向 slug */
  discipline?: string
  level?: TutorialLevel
}

export type TutorialFilterKey = keyof TutorialFilters
