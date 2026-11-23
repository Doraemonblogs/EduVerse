/**
 * 主视觉轮播的纯逻辑（无 DOM、无 React），供 hero-carousel-frame.tsx 使用并单独单测：
 * 张数环绕、按滚动位置求当前张、自动轮播是否运行，以及可暂停的倒计时（暂停时保留剩余时间）。
 */

/**
 * 内缩横幅的外框（服务端的单张横幅与客户端轮播外壳共用）：令牌圆角、裁切内部滚动区域；
 * 深色语义令牌（surface-dark）让文字层、遮罩与焦点描边按深色区块配色，图片加载前也有石墨底色。
 */
export const HERO_VIEWPORT_CLASS = 'surface-dark relative overflow-hidden rounded-lg'

/** 把任意整数索引环绕到 [0, count)：第一张再往前是最后一张，最后一张再往后是第一张 */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}

/** 按滚动位置求最接近的一张（每张与滚动区域同宽） */
export function nearestSlideIndex(scrollLeft: number, slideWidth: number, count: number): number {
  if (slideWidth <= 0 || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / slideWidth)))
}

/** 后台开启了自动轮播，且至少有 2 张（只有 1 张时不显示任何控件） */
export function canAutoplay(autoplay: boolean, slideCount: number): boolean {
  return autoplay && slideCount > 1
}

/**
 * 是否处于“播放”状态（暂停 / 播放按钮显示的状态）：
 * 访客按过按钮时以访客的选择为准；否则默认播放，但系统开启“减少动态效果”时默认不播放。
 */
export function resolvePlaying(userChoice: boolean | null, reducedMotion: boolean): boolean {
  return userChoice ?? !reducedMotion
}

/** 自动轮播临时让路的情形（任意一个为 true 时倒计时暂停，恢复后从剩余时间继续） */
export type AutoplayHolds = {
  /** 鼠标悬停在轮播区域（含控件） */
  hovered: boolean
  /** 键盘焦点在轮播区域内（暂停 / 播放按钮本身除外，见 HeroCarouselFrame） */
  focused: boolean
  /** 手指正在滑动 */
  touching: boolean
  /** 页面在后台标签页 */
  hidden: boolean
  /** 轮播已滚出视口 */
  offscreen: boolean
}

/** 自动轮播此刻是否在走：可自动轮播 && 播放中 && 没有任何让路情形 */
export function isAutoplayRunning(
  available: boolean,
  playing: boolean,
  holds: AutoplayHolds,
): boolean {
  return (
    available &&
    playing &&
    !holds.hovered &&
    !holds.focused &&
    !holds.touching &&
    !holds.hidden &&
    !holds.offscreen
  )
}

/**
 * 可暂停的倒计时：key 标识“这一轮”（换张、或访客重新按下播放时换新 key，倒计时从头开始）；
 * 同一轮里暂停 / 继续只扣除已经走过的时间，悬停后移开会接着走，而不是从头再等一个完整间隔。
 */
export type Countdown = {
  key: string
  /** 剩余毫秒 */
  remaining: number
  /** 本段开始计时的时间戳；暂停中为 null */
  startedAt: number | null
}

export function createCountdown(key: string, intervalMs: number): Countdown {
  return { key, remaining: intervalMs, startedAt: null }
}

/** 开始（或继续）计时：key 变了，或剩余时间不合理（间隔被改短）时从头开始 */
export function startCountdown(
  countdown: Countdown,
  key: string,
  intervalMs: number,
  now: number,
): Countdown {
  const fresh =
    countdown.key !== key || countdown.remaining <= 0 || countdown.remaining > intervalMs
  return {
    key,
    remaining: fresh ? intervalMs : countdown.remaining,
    startedAt: now,
  }
}

/** 暂停计时：扣除本段已经走过的时间 */
export function pauseCountdown(countdown: Countdown, now: number): Countdown {
  if (countdown.startedAt === null) return countdown
  return {
    key: countdown.key,
    remaining: Math.max(0, countdown.remaining - Math.max(0, now - countdown.startedAt)),
    startedAt: null,
  }
}
