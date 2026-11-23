/**
 * 本浏览器已解锁的教程（localStorage）。留资解锁只是引导，不是访问控制：
 * 记录丢失（清除站点数据、隐私模式、存储被禁用）最多让访客再看到一次留资表单。
 * 每次读写都包 try/catch：隐私模式、存储已满、被浏览器禁用时 localStorage 会抛错。
 *
 * 两条记录：
 * - 已解锁的教程 ID（逐个记录，M7 规格 §2）；
 * - “已留资”标记：任意一个教程留资成功后写入，之后其它 gated 教程也直接解锁——
 *   否则每解锁一个教程都要再交一次线索，同一手机号 / IP 很快会触发提交频率限制（每天 3 次），访客卡在留资表单上。
 */

/** localStorage 键：值是已解锁教程 ID 的 JSON 数组 */
export const TUTORIAL_UNLOCK_STORAGE_KEY = 'eduverse:tutorials-unlocked'

/** localStorage 键：本浏览器已通过教程留资（值为 TUTORIAL_GATE_PASSED_VALUE） */
export const TUTORIAL_GATE_PASSED_STORAGE_KEY = 'eduverse:tutorials-gate-passed'

const TUTORIAL_GATE_PASSED_VALUE = '1'

/** 最多记住的教程数（只保留最近解锁的） */
const MAX_REMEMBERED = 200

/** 把存储里的原始值解析为 ID 列表；格式不对时按空列表处理 */
export function parseUnlockedTutorialIds(raw: string | null): number[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return [
      ...new Set(value.filter((id): id is number => Number.isSafeInteger(id) && id > 0)),
    ].slice(-MAX_REMEMBERED)
  } catch {
    return []
  }
}

/** 读取已解锁的教程 ID（存储不可用时返回空数组） */
export function readUnlockedTutorialIds(): number[] {
  try {
    return parseUnlockedTutorialIds(window.localStorage.getItem(TUTORIAL_UNLOCK_STORAGE_KEY))
  } catch {
    return []
  }
}

/** 记录一个已解锁的教程；返回记录后的列表（存储不可用时只返回内存中的结果） */
export function rememberUnlockedTutorial(id: number): number[] {
  const ids = [...readUnlockedTutorialIds().filter((item) => item !== id), id].slice(
    -MAX_REMEMBERED,
  )
  try {
    window.localStorage.setItem(TUTORIAL_UNLOCK_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // 存储不可用：本次页面内仍视为已解锁（由调用方的状态保存）
  }
  return ids
}

/** 本浏览器是否已通过教程留资（存储不可用或值不对时为 false） */
export function readTutorialGatePassed(): boolean {
  try {
    return (
      window.localStorage.getItem(TUTORIAL_GATE_PASSED_STORAGE_KEY) === TUTORIAL_GATE_PASSED_VALUE
    )
  } catch {
    return false
  }
}

/**
 * 记下“已通过教程留资”（教程留资提交成功后调用）。
 * 返回之后能否从存储读回这条记录：false 表示存储不可用，调用方需要自己在内存里记住（本页面内有效）。
 */
export function rememberTutorialGatePassed(): boolean {
  try {
    window.localStorage.setItem(TUTORIAL_GATE_PASSED_STORAGE_KEY, TUTORIAL_GATE_PASSED_VALUE)
  } catch {
    return false
  }
  return readTutorialGatePassed()
}
