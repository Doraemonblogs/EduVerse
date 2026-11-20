import { WCAG_AA } from '@/lib/a11y/contrast'

/**
 * 需要满足对比度要求的语义令牌组合。
 * - 单元测试会在每种区块（light / paper / dark）下解析 globals.css 并逐一校验；
 * - /styleguide 页面也用它展示实际对比度。
 * 新增语义令牌组合时，请在这里登记。
 */
export type Surface = 'light' | 'paper' | 'dark'

export type ContrastPair = {
  label: string
  foreground: string // 语义变量名（不含 --）
  background: string
  min: number
}

export const SURFACES: Surface[] = ['light', 'paper', 'dark']

export const CONTRAST_PAIRS: ContrastPair[] = [
  { label: '正文', foreground: 'foreground', background: 'background', min: WCAG_AA.text },
  {
    label: '次要文字',
    foreground: 'muted-foreground',
    background: 'background',
    min: WCAG_AA.text,
  },
  {
    label: '弱化文字',
    foreground: 'subtle-foreground',
    background: 'background',
    min: WCAG_AA.text,
  },
  {
    label: '次要文字（浅底块上）',
    foreground: 'muted-foreground',
    background: 'muted',
    min: WCAG_AA.text,
  },
  { label: '卡片文字', foreground: 'card-foreground', background: 'card', min: WCAG_AA.text },
  { label: '卡片次要文字', foreground: 'muted-foreground', background: 'card', min: WCAG_AA.text },
  { label: '浮层文字', foreground: 'popover-foreground', background: 'popover', min: WCAG_AA.text },
  { label: '强调文字 / 链接', foreground: 'emphasis', background: 'background', min: WCAG_AA.text },
  { label: '错误提示', foreground: 'destructive', background: 'background', min: WCAG_AA.text },
  { label: '成功提示', foreground: 'success', background: 'background', min: WCAG_AA.text },
  {
    label: '主按钮（CTA）',
    foreground: 'primary-foreground',
    background: 'primary',
    min: WCAG_AA.text,
  },
  {
    label: '主按钮悬停',
    foreground: 'primary-foreground',
    background: 'primary-hover',
    min: WCAG_AA.text,
  },
  {
    label: '主按钮按下',
    foreground: 'primary-foreground',
    background: 'primary-active',
    min: WCAG_AA.text,
  },
  {
    label: '次按钮',
    foreground: 'secondary-foreground',
    background: 'secondary',
    min: WCAG_AA.text,
  },
  {
    label: '次按钮悬停',
    foreground: 'secondary-foreground',
    background: 'secondary-hover',
    min: WCAG_AA.text,
  },
  {
    label: '幽灵按钮悬停',
    foreground: 'accent-foreground',
    background: 'accent',
    min: WCAG_AA.text,
  },
  { label: '输入框文字', foreground: 'foreground', background: 'field', min: WCAG_AA.text },
  { label: '输入框边框', foreground: 'input', background: 'background', min: WCAG_AA.nonText },
  { label: '输入框边框（框内）', foreground: 'input', background: 'field', min: WCAG_AA.nonText },
  { label: '焦点描边', foreground: 'ring', background: 'background', min: WCAG_AA.nonText },
]
