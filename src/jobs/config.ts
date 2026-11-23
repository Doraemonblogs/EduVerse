import { type JobsConfig, type Payload, type PayloadRequest } from 'payload'

import { hasRole } from '@/access/roles'

import { notifyLeadTask } from './notify-lead'
import { recoverStaleJobs } from './recover-stale-jobs'

const adminOnly = ({ req }: { req: PayloadRequest }) => hasRole(req.user, 'admin')

/**
 * 任务队列的接口权限。Payload 默认“任何已登录用户”都能调用 GET /api/payload-jobs/run
 * （以及 /handle-schedules），内容编辑、课程顾问因此可以随时触发线索推送、提前消耗重试次数。
 * 这里收紧为仅管理员；queue / cancel 只在 Local API 传 overrideAccess: false 时检查，同样仅管理员。
 * 定时任务（autoRun）与提交后的 runByID 走 Local API，默认 overrideAccess，不受影响。
 */
export const jobsAccess = {
  run: adminOnly,
  queue: adminOnly,
  cancel: adminOnly,
} satisfies NonNullable<JobsConfig['access']>

/** 只在 Next 服务端运行时自动执行（构建、种子脚本、测试中不启动定时器） */
export function isJobRunnerRuntime(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.NEXT_RUNTIME) && env.NEXT_PHASE !== 'phase-production-build'
}

/**
 * 每个定时任务周期领取任务前调用：先把执行中断（进程重启 / 崩溃）的任务放回队列，再照常领取。
 * 回收出错只记日志，不阻止本周期执行。
 */
export async function shouldAutoRunJobs(payload: Payload): Promise<boolean> {
  if (!isJobRunnerRuntime()) return false
  await recoverStaleJobs(payload)
  return true
}

/** payload.config.ts 的 jobs 配置 */
export const jobsConfig = {
  tasks: [notifyLeadTask],
  access: jobsAccess,
  // 线索推送任务：提交后由 Server Action 立即触发；失败重试（含退避等待）与中断回收由这里的定时任务兜底（每分钟）
  autoRun: [{ cron: '* * * * *', queue: 'default', limit: 20 }],
  shouldAutoRun: shouldAutoRunJobs,
  deleteJobOnComplete: true,
} satisfies JobsConfig
