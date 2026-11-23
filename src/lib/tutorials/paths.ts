/**
 * 免费教程的站内路径（不含 basePath；交给 next/link 会自动补上）。
 * 教程没有独立详情页：播放弹窗通过 `/tutorials?play=<id>` 深链接打开。
 */

/** 教程列表页；也是带筛选 / 播放参数时的规范地址（canonical） */
export const TUTORIALS_PATH = '/tutorials'

/** 打开播放弹窗的查询参数名 */
export const TUTORIAL_PLAY_PARAM = 'play'

/** 打开某个教程播放弹窗的可分享地址 */
export function tutorialPlayHref(id: number): string {
  return `${TUTORIALS_PATH}?${TUTORIAL_PLAY_PARAM}=${id}`
}

/** PostgreSQL integer 的上限：超出的 ID 不可能存在 */
const MAX_ID = 2_147_483_647

/**
 * 解析 ?play= 参数：只接受不带前导 0 的正整数（如 "12"），其它（缺失、"0"、"012"、"1.5"、"abc"、
 * 超出整数范围）返回 null → 不打开弹窗。是否存在由页面在已发布教程里查找。
 */
export function parseTutorialId(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value)) return null
  const id = Number(value)
  return id <= MAX_ID ? id : null
}
