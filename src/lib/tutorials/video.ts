import { isAllowedVideoEmbedUrl } from '@/lib/works/video'

/**
 * 免费教程的外部播放器地址（纯函数，无服务端依赖：后台字段校验、数据层与前台客户端组件共用）。
 * 只支持大陆可稳定访问的平台；地址构造后再用作品视频的白名单（isAllowedVideoEmbedUrl）校验一遍。
 */

/** 哔哩哔哩 BV 号：BV + 10 位字母数字（后台「免费教程」的视频 ID 字段按它校验） */
export const BILIBILI_BV_PATTERN = /^BV[0-9A-Za-z]{10}$/

/** 哔哩哔哩官方外链播放器 */
const BILIBILI_PLAYER = 'https://player.bilibili.com/player.html'

/**
 * 教程的播放器地址：平台受支持、视频 ID 格式正确、且构造出的地址在白名单内时返回地址，否则 null
 * （前台显示“视频暂不可用”，不插入 iframe）。
 * 哔哩哔哩：`https://player.bilibili.com/player.html?bvid=BV…`。
 */
export function tutorialEmbedUrl(provider: unknown, videoId: unknown): string | null {
  if (provider !== 'bilibili' || typeof videoId !== 'string') return null
  const id = videoId.trim()
  if (!BILIBILI_BV_PATTERN.test(id)) return null
  const url = `${BILIBILI_PLAYER}?bvid=${encodeURIComponent(id)}`
  return isAllowedVideoEmbedUrl(url) ? url : null
}
