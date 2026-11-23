/**
 * 种子数据的日期工具（纯函数，可单测）。
 */

/** 北京时间（Asia/Shanghai，UTC+8，没有夏令时）相对 UTC 的偏移 */
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

/** 北京时间的钟点：HH:mm（00:00–23:59） */
const CLOCK_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

/**
 * 北京时间“今天 + daysFromNow 天”的 time 时刻（如 '14:00'）对应的 ISO 时间戳（UTC）。
 * 招聘活动等需要显示钟点的种子数据用它：时间落在合理的整点 / 半点，不随种子执行的时刻变化
 * （直接用 Date.now() + n 天会把执行种子时的钟点带进去，如深夜 23:35 的线下活动）。
 * “今天”按北京时间计算：UTC 16:00 之后执行时，北京已经是第二天。
 */
export function beijingDateTime(daysFromNow: number, time: string, now: Date = new Date()): string {
  const match = CLOCK_TIME.exec(time)
  if (!match) throw new Error(`钟点格式应为 HH:mm（北京时间）：${time}`)
  const beijingNow = new Date(now.getTime() + BEIJING_OFFSET_MS)
  const utc =
    Date.UTC(
      beijingNow.getUTCFullYear(),
      beijingNow.getUTCMonth(),
      beijingNow.getUTCDate() + daysFromNow,
      Number(match[1]),
      Number(match[2]),
    ) - BEIJING_OFFSET_MS
  return new Date(utc).toISOString()
}
