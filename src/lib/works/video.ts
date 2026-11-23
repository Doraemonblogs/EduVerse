/**
 * 作品视频的外部播放器白名单（纯函数，无依赖：后台字段校验、数据层与前台客户端组件共用）。
 * 只允许大陆可稳定访问的视频平台官方播放器域名，且必须是 https。
 */

/** 外部播放器白名单：只允许大陆可稳定访问的视频平台官方播放器域名（https） */
export const ALLOWED_VIDEO_HOSTS = [
  'player.bilibili.com',
  'www.bilibili.com',
  'v.qq.com',
  'player.youku.com',
] as const

/**
 * 是否为白名单内的 https 播放器地址。
 * 后台保存时校验一次；数据层映射时再校验一次（历史数据 / 绕过校验写入的地址当作无视频）；
 * 前台插入 iframe 前还应再校验一次（纵深防御）。
 */
export function isAllowedVideoEmbedUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      (ALLOWED_VIDEO_HOSTS as readonly string[]).includes(url.hostname)
    )
  } catch {
    return false
  }
}
