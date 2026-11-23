import type * as LeadValidationModule from '@/lib/validation/lead'

export type LeadValidation = typeof LeadValidationModule

/**
 * 留资表单的 zod 校验规则（@/lib/validation/lead，zod 约 40KB gzip、137KB 未压缩）按需加载：
 * 每个页面都有留资入口，静态导入会让 zod 进入全站首屏 JS，而它只在提交时才用到。
 * 访客聚焦或按下表单内的控件时开始加载（填写期间就绪），提交时若仍未完成则等它完成再校验。
 * 加载失败（断网等）时清掉缓存，下次提交重新加载。
 */
let loaded: LeadValidation | undefined
let loading: Promise<LeadValidation> | undefined

export function loadLeadValidation(): Promise<LeadValidation> {
  loading ??= import('@/lib/validation/lead').then(
    (mod) => {
      loaded = mod
      return mod
    },
    (error: unknown) => {
      loading = undefined
      throw error
    },
  )
  return loading
}

/** 已加载完成时同步返回（提交时直接校验，与静态导入的行为一致）；否则为 undefined */
export function getLoadedLeadValidation(): LeadValidation | undefined {
  return loaded
}

/** 预加载：失败时不报错（提交时会重试并提示） */
export function preloadLeadValidation(): void {
  loadLeadValidation().catch(() => {})
}
