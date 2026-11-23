/**
 * 线索状态流转：新线索 → 已联系 → 已到访 → 已报名；任何未结束的状态都可以标为“无效”。
 * 课程顾问只能向前推进；管理员可以任意调整（含回退、重新激活）。
 */
export const LEAD_STATUS_ORDER = ['new', 'contacted', 'visited', 'enrolled'] as const
export type LeadStatus = (typeof LEAD_STATUS_ORDER)[number] | 'invalid'

const rank = (status: LeadStatus) =>
  status === 'invalid' ? Number.POSITIVE_INFINITY : LEAD_STATUS_ORDER.indexOf(status)

export function canTransition(from: LeadStatus, to: LeadStatus, isAdmin: boolean): boolean {
  if (from === to || isAdmin) return true
  // 已报名、无效是终态，只能由管理员调整
  if (from === 'enrolled' || from === 'invalid') return false
  if (to === 'invalid') return true
  return rank(to) > rank(from)
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: '新线索',
  contacted: '已联系',
  visited: '已到访',
  enrolled: '已报名',
  invalid: '无效',
}
