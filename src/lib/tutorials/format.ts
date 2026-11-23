import { zh } from '@/i18n/zh'

import type { TutorialLevel, TutorialProvider } from './types'

const t = zh.tutorials

/** 全部难度（与后台选项顺序一致：入门 → 进阶 → 高阶），筛选栏按这个顺序排列 */
export const TUTORIAL_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
] as const satisfies readonly TutorialLevel[]

/** 难度的显示文字（与后台选项标签一致） */
export function tutorialLevelLabel(level: TutorialLevel): string {
  return t.levels[level]
}

/** 是否为合法的难度取值（?level= 参数校验用） */
export function isTutorialLevel(value: unknown): value is TutorialLevel {
  return typeof value === 'string' && (TUTORIAL_LEVELS as readonly string[]).includes(value)
}

/** 视频平台的显示文字，如“哔哩哔哩” */
export function tutorialProviderLabel(provider: TutorialProvider): string {
  return t.providers[provider]
}
