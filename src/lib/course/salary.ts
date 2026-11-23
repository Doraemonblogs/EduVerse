import type { SalaryReference } from './types'

/** 后台薪资参考字段组（课程 / 专业方向的 salaryRef） */
export type SalaryRefInput =
  | {
      range?: string | null
      source?: string | null
      statDate?: string | null
      note?: string | null
    }
  | null
  | undefined

const text = (value: string | null | undefined) => value?.trim() ?? ''

/**
 * 选出要展示的薪资参考（纯函数）：
 * - 课程填写了薪资区间就用课程的整组数据，否则继承专业方向的；
 * - 区间、数据来源、统计时间任一为空，或免责声明为空，返回 null（不展示薪资卡）。
 *   广告法第十一条：引用数据必须标明出处与时间；PRD §7：必须注明“不作为培训效果承诺”。
 */
export function pickSalary(
  courseSalary: SalaryRefInput,
  disciplineSalary: SalaryRefInput,
  disclaimer: string | null | undefined,
): SalaryReference | null {
  const ref = text(courseSalary?.range) ? courseSalary : disciplineSalary
  const range = text(ref?.range)
  const source = text(ref?.source)
  const statDate = text(ref?.statDate)
  const notice = text(disclaimer)
  if (!range || !source || !statDate || !notice) return null
  return { range, source, statDate, note: text(ref?.note) || null, disclaimer: notice }
}
