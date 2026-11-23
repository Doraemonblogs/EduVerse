'use client'

import { useEffect, useSyncExternalStore } from 'react'

import type { LeadContextProps } from './types'

/**
 * 页面级留资上下文：课程详情页、专业方向页声明“本页属于哪门课程 / 哪个专业”，
 * 全站弹窗（头部按钮、桌面悬浮栏、移动端底部操作条……）打开时把它们作为默认值带上，
 * 线索就能记录访客是在哪门课程页面上预约的。
 *
 * 用法（服务端组件里直接放，不渲染任何内容）：
 *   <PageLeadContext courseId={course.id} disciplineId={course.discipline.id} />
 *   <PageLeadContext disciplineId={discipline.id} />
 *
 * 合并规则见 mergePageLeadContext：open(props) 里显式给出的 courseId / disciplineId 优先，
 * 没给的才用页面上下文；position、intent 等其它字段不变。
 * 页面上下文只在客户端挂载后写入（服务端渲染不写），卸载（离开页面）时清除。
 */

export type PageLeadDefaults = Pick<LeadContextProps, 'courseId' | 'disciplineId'>

type Entry = { token: symbol; value: PageLeadDefaults }

/** 已挂载的上下文（后挂载的在后）。客户端导航时新旧页面的挂载 / 卸载顺序不固定，用栈保证结果正确 */
let entries: Entry[] = []
let snapshot: PageLeadDefaults | null = null
const listeners = new Set<() => void>()

function publish() {
  snapshot = entries.at(-1)?.value ?? null
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 当前页面的留资上下文（最近挂载的那个）；没有时为 null */
export function getPageLeadContext(): PageLeadDefaults | null {
  return snapshot
}

const getServerSnapshot = () => null

/** 订阅当前页面的留资上下文（客户端组件按需显示课程信息等） */
export function usePageLeadContext(): PageLeadDefaults | null {
  return useSyncExternalStore(subscribe, getPageLeadContext, getServerSnapshot)
}

/**
 * 把页面上下文作为默认值合并进打开弹窗的参数：
 * props 中显式给出（不是 undefined）的 courseId / disciplineId 优先，其余字段原样保留。
 */
export function mergePageLeadContext(
  props: LeadContextProps,
  defaults: PageLeadDefaults | null,
): LeadContextProps {
  if (!defaults) return props
  const courseId = props.courseId ?? defaults.courseId
  const disciplineId = props.disciplineId ?? defaults.disciplineId
  return {
    ...props,
    ...(courseId !== undefined ? { courseId } : {}),
    ...(disciplineId !== undefined ? { disciplineId } : {}),
  }
}

/** 声明当前页面的留资上下文；不渲染任何内容 */
export function PageLeadContext({ courseId, disciplineId }: PageLeadDefaults) {
  useEffect(() => {
    const entry: Entry = { token: Symbol('page-lead-context'), value: { courseId, disciplineId } }
    entries = [...entries, entry]
    publish()
    return () => {
      entries = entries.filter((item) => item.token !== entry.token)
      publish()
    }
  }, [courseId, disciplineId])
  return null
}
