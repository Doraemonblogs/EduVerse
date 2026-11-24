import { type TestInfo } from '@playwright/test'

/**
 * 端到端测试提交线索时用的模拟访客身份（X-Forwarded-For 与手机号）。
 *
 * 服务端按 IP 限频（进程内每分钟 3 次 + 数据库 10 分钟 / 每天计数），按手机号限频并查重，
 * 所以并行运行的测试之间、同一 worker 里先后运行的测试之间，IP 与手机号都不能重复。
 * 这里不用时间戳、worker 序号之类会变的值，而是按「测试文件 + 项目 + 第几次运行 + 用例序号」
 * 逐位编码，取值稳定、可复现，并且按构造两两不同：
 *
 * - 测试文件：登记在 LEAD_SPECS 中的序号（类型约束，未登记的文件无法调用）；
 * - 项目：playwright.config.ts 中的 desktop / mobile；
 * - 第几次运行：重试（retry）与 --repeat-each 的序号，重试不复用上一次的 IP；
 * - 用例序号 n：同一测试文件内每个提交线索的用例各取一个，不得重复（同一 worker 内重复会直接报错）。
 *
 * 不需要 worker 序号：同一时刻在不同 worker 里运行的必然是不同的（文件、项目、用例、重复序号）组合；
 * worker 序号还会随 worker 重启不断增大，正是以前各文件的偏移量互相重叠的原因。
 */

/**
 * 会提交线索的端到端测试文件。新增时追加到末尾（最多 64 个）。
 * 每个文件独占一段模拟 IP（198.18.x.0/24 中的若干个 /24）与一段手机号。
 */
export const LEAD_SPECS = [
  'lead',
  'courses-list',
  'course-detail',
  'majors',
  'work-detail',
  'teachers',
  'home',
  'campuses',
  'articles',
  'careers',
  'tutorials',
  'quiz',
  'journey',
] as const
export type LeadSpec = (typeof LEAD_SPECS)[number]

/** playwright.config.ts 中的项目名；新增项目时在这里登记（最多 4 个） */
export const LEAD_PROJECTS = ['desktop', 'mobile'] as const

/** 每个文件最多 16 个提交线索的用例；每个用例最多 15 次运行（重试 × 重复） */
const MAX_CASES = 16
const MAX_ATTEMPTS = 15
const MAX_SPECS = 64
const MAX_PROJECTS = 4

/** 只取 TestInfo 中用得到的字段，便于单元测试构造 */
export type LeadTestInfo = {
  project: Pick<TestInfo['project'], 'name' | 'retries'>
  retry: number
  repeatEachIndex: number
  titlePath: readonly string[]
}

export type LeadNamespace = {
  readonly spec: LeadSpec
  readonly specIndex: number
  readonly projectIndex: number
  readonly attempt: number
  readonly title: string
}

/** 当前用例的命名空间：在用例内调用，传入 Playwright 的 testInfo */
export function leadNamespace(spec: LeadSpec, testInfo: LeadTestInfo): LeadNamespace {
  const specIndex = LEAD_SPECS.indexOf(spec)
  const projectIndex = (LEAD_PROJECTS as readonly string[]).indexOf(testInfo.project.name)
  if (projectIndex < 0) {
    throw new Error(
      `未登记的 Playwright 项目“${testInfo.project.name}”：请加入 tests/helpers/lead-identity.ts 的 LEAD_PROJECTS`,
    )
  }
  // 同一用例的第几次运行：重复序号 × 每次重复的最多尝试次数 + 当前重试序号
  const attempt = testInfo.repeatEachIndex * (testInfo.project.retries + 1) + testInfo.retry
  assertRange('测试文件序号', specIndex, MAX_SPECS)
  assertRange('项目序号', projectIndex, MAX_PROJECTS)
  assertRange('运行次数（重试 × 重复）', attempt, MAX_ATTEMPTS)
  return { spec, specIndex, projectIndex, attempt, title: testInfo.titlePath.join(' › ') }
}

/** 本 worker 内已分配的（命名空间, 序号）→ 用例标题，用来发现同一文件里两个用例取了同一序号 */
const claimed = new Map<string, string>()

function claim(ns: LeadNamespace, n: number): void {
  assertRange('用例序号', n, MAX_CASES)
  const key = `${ns.specIndex}:${ns.projectIndex}:${ns.attempt}:${n}`
  const owner = claimed.get(key)
  if (owner !== undefined && owner !== ns.title) {
    throw new Error(`${ns.spec} 中的用例序号 ${n} 已被“${owner}”使用，请换一个序号`)
  }
  claimed.set(key, ns.title)
}

/**
 * 模拟客户端 IP（198.18.0.0/15 基准测试保留段，作为唯一的 X-Forwarded-For 值发送；
 * 服务端取最后一个地址，需以 TRUST_PROXY=true 启动）。
 * 第三段 = 文件 × 4 + 项目（每个文件 × 项目独占一个 /24），第四段 = 1 + 运行次数 × 16 + 序号（1–240）。
 */
export function testIp(ns: LeadNamespace, n: number): string {
  claim(ns, n)
  const block = ns.specIndex * MAX_PROJECTS + ns.projectIndex
  const host = 1 + ns.attempt * MAX_CASES + n
  return `198.18.${block}.${host}`
}

/**
 * 测试手机号：1990 + 文件（2 位）+ 项目（1 位）+ 运行次数（2 位）+ 序号（2 位），共 11 位。
 * 种子数据的演示线索用 138 号段，不会与之重复。
 */
export function testPhone(ns: LeadNamespace, n: number): string {
  claim(ns, n)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `1990${pad(ns.specIndex)}${ns.projectIndex}${pad(ns.attempt)}${pad(n)}`
}

function assertRange(label: string, value: number, max: number): void {
  if (!Number.isInteger(value) || value < 0 || value >= max) {
    throw new RangeError(`${label}超出范围：${value}（应为 0–${max - 1}）`)
  }
}
