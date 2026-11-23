/**
 * 本会话内是否已为职业测试留资（sessionStorage）：留资后再次完成测试时直接展开完整报告，不再显示留资表单。
 * 完整报告是营销引导而非访问控制：记录丢失（关闭标签页、隐私模式、存储被禁用）最多让访客再看到一次留资表单。
 * 每次读写都包 try/catch：隐私模式、存储已满、被浏览器禁用时 sessionStorage 会抛错。
 * 只在客户端（事件处理、effect 或 useSyncExternalStore 的客户端快照）中调用；服务端渲染时按未解锁处理。
 */

/** sessionStorage 键：值为 '1' 表示本会话已留资 */
export const QUIZ_REPORT_STORAGE_KEY = 'eduverse:quiz-report-unlocked'

const UNLOCKED = '1'

/** 本会话是否已解锁完整报告（存储不可用、在服务端调用时返回 false） */
export function readQuizReportUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(QUIZ_REPORT_STORAGE_KEY) === UNLOCKED
  } catch {
    return false
  }
}

/** 记录本会话已解锁完整报告；存储不可用时静默忽略（本次页面内的状态由调用方保存） */
export function rememberQuizReportUnlocked(): void {
  try {
    window.sessionStorage.setItem(QUIZ_REPORT_STORAGE_KEY, UNLOCKED)
  } catch {
    // 存储不可用：本次页面内仍视为已解锁（由调用方的状态保存）
  }
}
