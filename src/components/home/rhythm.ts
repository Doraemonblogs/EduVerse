import type { HOME_SECTION_ORDER } from './constants'

/**
 * 首页的整页节奏（纯函数，单元测试覆盖）：按实际渲染的区块（后台可关闭任意区块，没有内容的区块不渲染）
 * 决定每个区块的色调与分隔，保证任何组合下都深浅交替、不出现两个同色区块直接相接：
 *
 * - 学员作品（衬托作品）与预约试听（页尾转化）固定为深色；
 * - 其余区块白底 / 米色交替；主视觉之后、深色区块之后的第一个区块为白底
 *   （快速了解紧贴主视觉，与主视觉同为页面白底）；
 * - 两个深色区块相接（中间的区块都关闭了）时，后一个加顶部分隔线；
 * - 主视觉没有底部留白（下一个白底区块的上边距即间距）；紧接着的是深色区块、或者后面没有区块时，
 *   主视觉补上底部留白，横幅不贴着色块边缘。
 *
 * 全部区块开启时的结果与各区块组件的默认色调一致：
 * 快速了解 白 → 热门专业 米 → 精选课程 白 → 学员作品 深 → 学员故事 白 → 合作企业 米 → 师资 白 →
 * 校区 米 → 资讯 白 → 预约试听 深 → 页脚（深，预约试听自带底部分隔线）。
 */

/** 主视觉以外的区块（与 HomePageData 的键一致） */
export type HomeSectionKey = Exclude<(typeof HOME_SECTION_ORDER)[number], 'hero'>

/** 固定为深色的区块 */
const DARK_SECTIONS = ['works', 'leadForm'] as const satisfies readonly HomeSectionKey[]
type DarkSectionKey = (typeof DARK_SECTIONS)[number]
type AlternatingSectionKey = Exclude<HomeSectionKey, DarkSectionKey>

/** 区块色调 */
export type HomeSurface = 'light' | 'paper' | 'dark'

/** 白底 / 米色交替的区块接受的外框 props */
export type HomeSectionFrameProps = {
  /** 色调（页面按整页节奏传入；不传时用区块的默认色调） */
  tone?: 'light' | 'paper'
  /** 追加到 <Section> 的类名（如与上一个同色区块之间的分隔线） */
  className?: string
}

/** 固定深色的区块（学员作品、预约试听）接受的外框 props */
export type HomeDarkSectionFrameProps = Pick<HomeSectionFrameProps, 'className'>

export type HomePageFrames = {
  /** 追加到主视觉 <section> 的类名（需要底部留白时） */
  hero: string | undefined
} & {
  [K in AlternatingSectionKey]: Required<Pick<HomeSectionFrameProps, 'tone'>> &
    HomeSectionFrameProps
} & {
  [K in DarkSectionKey]: HomeDarkSectionFrameProps
}

/** 同色区块相接时的分隔线（深色区块内 border 令牌自动切换为深色描边） */
export const HOME_SECTION_SEPARATOR_CLASS = 'border-t border-border'
/** 主视觉的底部留白（与快速了解的上边距同一档） */
export const HOME_HERO_GAP_CLASS = 'pb-section-sm'

/**
 * 首页每个区块（含主视觉）的版心 <Container> 都加这个类：桌面端（lg 起）右侧给悬浮操作栏让出位置
 * （见 globals.css 的 avoid-floating-actions）。1024–1439px 时版心右缘紧贴视口，不让位的话
 * 贴着右缘的轮播 / 横滑按钮、卡片会滚到悬浮栏下面（点“下一组”实际点到悬浮栏）；
 * 所有区块统一让位，上下区块的右缘也对齐。≥ 1440px 时页边距已够，不影响版式。
 * 必须加在 Container 上（覆盖 container-site 的右内边距，按通栏区块的宽度计算），不能加在 Section 上。
 */
export const HOME_CONTAINER_CLASS = 'lg:avoid-floating-actions'

const isDark = (key: HomeSectionKey): key is DarkSectionKey =>
  (DARK_SECTIONS as readonly HomeSectionKey[]).includes(key)

/** 每个区块的色调（按渲染顺序） */
export function homeSectionTones(
  rendered: readonly HomeSectionKey[],
): Map<HomeSectionKey, HomeSurface> {
  const tones = new Map<HomeSectionKey, HomeSurface>()
  // 主视觉放在页面白底上，紧跟其后的区块延续白底
  let previous: HomeSurface | 'hero' = 'hero'
  for (const key of rendered) {
    const tone: HomeSurface = isDark(key) ? 'dark' : previous === 'light' ? 'paper' : 'light'
    tones.set(key, tone)
    previous = tone
  }
  return tones
}

/**
 * 页面组装用的外框：rendered 是实际渲染的区块（按 HOME_SECTION_ORDER 的顺序）。
 * 没有渲染的区块也给出默认外框（不会被用到）。
 */
export function homePageFrames(rendered: readonly HomeSectionKey[]): HomePageFrames {
  const tones = homeSectionTones(rendered)
  const separated = new Set<HomeSectionKey>()
  rendered.forEach((key, index) => {
    const before = index > 0 ? tones.get(rendered[index - 1]!) : undefined
    if (before !== undefined && before === tones.get(key)) separated.add(key)
  })
  const className = (key: HomeSectionKey) =>
    separated.has(key) ? HOME_SECTION_SEPARATOR_CLASS : undefined
  const alternating = (key: AlternatingSectionKey) => ({
    tone: tones.get(key) === 'paper' ? ('paper' as const) : ('light' as const),
    className: className(key),
  })
  const first = rendered[0]

  return {
    hero: first === undefined || isDark(first) ? HOME_HERO_GAP_CLASS : undefined,
    quickEntries: alternating('quickEntries'),
    hotDisciplines: alternating('hotDisciplines'),
    courses: alternating('courses'),
    works: { className: className('works') },
    stories: alternating('stories'),
    partners: alternating('partners'),
    teachers: alternating('teachers'),
    campuses: alternating('campuses'),
    articles: alternating('articles'),
    leadForm: { className: className('leadForm') },
  }
}
