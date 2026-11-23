'use client'

import { LockIcon, LockOpenIcon } from 'lucide-react'

import { useHydrated } from '@/components/common/use-hydrated'
import { Badge } from '@/components/ui/badge'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { cn } from '@/lib/utils'

import { useTutorialPlayer } from './tutorial-player'
import { useTutorialUnlocked } from './tutorial-unlocks'

const t = zh.tutorials.card

export type TutorialPlayButtonProps = {
  tutorialId: number
  /** 教程标题：读屏名称为“观看教程：{title}” */
  title: string
  /** 卡片上的补充信息（留资徽标、专业 / 难度 / 时长 / 平台）的元素 id，空格分隔 */
  describedBy?: string
  className?: string
}

/**
 * 教程卡片上打开播放弹窗的按钮（客户端组件）：铺满整张卡片的透明按钮，键盘焦点描边落在整张卡片上。
 * 水合前不可用（点击不会有反应），与作品灯箱、播放按钮一致。
 */
export function TutorialPlayButton({
  tutorialId,
  title,
  describedBy,
  className,
}: TutorialPlayButtonProps) {
  const { open } = useTutorialPlayer()
  const hydrated = useHydrated()

  return (
    <button
      type="button"
      data-tutorial-play={tutorialId}
      aria-label={formatMessage(t.open, { title })}
      aria-describedby={describedBy || undefined}
      aria-haspopup="dialog"
      disabled={!hydrated}
      onClick={() => open(tutorialId)}
      className={cn('cursor-pointer disabled:cursor-default', className)}
    />
  )
}

/**
 * “留资解锁”文字徽标（客户端组件）：本浏览器已解锁后改为“已解锁”——与播放弹窗同一判断
 * （useTutorialUnlocked：留资过任意一个教程后，所有 gated 教程都算已解锁）。
 * 服务端渲染与水合阶段一律显示“留资解锁”，水合后读取本地记录。
 */
export function TutorialGateBadge({
  tutorialId,
  id,
  className,
}: {
  tutorialId: number
  id?: string
  className?: string
}) {
  const unlocked = useTutorialUnlocked(tutorialId)
  const Icon = unlocked ? LockOpenIcon : LockIcon
  return (
    <Badge id={id} variant="inverse" className={className}>
      <Icon aria-hidden />
      {unlocked ? t.unlocked : t.gated}
    </Badge>
  )
}
