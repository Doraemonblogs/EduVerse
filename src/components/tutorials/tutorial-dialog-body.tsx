'use client'

import { ArrowRightIcon, CheckIcon, LockIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

import { VideoFacade } from '@/components/common/video-facade'
import { LeadForm } from '@/components/lead/lead-form'
import type { LeadFormConfig } from '@/components/lead/types'
import { DialogDescription } from '@/components/ui/dialog'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { majorPath } from '@/lib/course/paths'
import type { TutorialCardData, TutorialPagesSettings } from '@/lib/tutorials/types'
import { cn } from '@/lib/utils'

import { unlockTutorial, useTutorialUnlocked } from './tutorial-unlocks'

const t = zh.tutorials

/** 留资位置标识（M7 规格 §2） */
export const TUTORIAL_GATE_POSITION = 'tutorial_gate'

/** 播放器封面宽度：弹窗最宽 48rem，左右各留 1.5rem；移动端为通栏底部面板 */
const PLAYER_SIZES = '(min-width: 640px) 720px, 100vw'

/** 留资区左栏封面宽度（≥ md 两栏） */
const LOCKED_COVER_SIZES = '(min-width: 768px) 400px, 100vw'

export type TutorialDialogBodyProps = {
  tutorial: TutorialCardData
  gate: TutorialPagesSettings['gate']
  config: LeadFormConfig
}

/**
 * 播放弹窗的内容（标题与信息行在弹窗头部，由 TutorialPlayer 渲染）：
 * - gated 且本浏览器未解锁：左栏带锁的封面 + 简介，右栏留资区（后台文案 + 留资表单，
 *   intent tutorial / position tutorial_gate / 教程与专业方向）；提交成功后记录解锁（localStorage），
 *   原地换成播放器，提示“已解锁，可以观看了”（role=status），焦点移到播放按钮上；
 *   本浏览器留资一次后，其它 gated 教程也直接解锁（见 tutorial-unlocks.ts），不会每个教程都要再交一次线索；
 * - 其它情况：“点击后加载”的播放器（VideoFacade，按教程 ID 重新挂载，换教程不会沿用正在播放的 iframe）。
 * 播放器地址不可用（embedUrl 为 null）时不要求留资，直接显示“视频暂不可用”。
 * 留资解锁只是引导，不是访问控制：视频本身在公开平台。
 */
export function TutorialDialogBody({ tutorial, gate, config }: TutorialDialogBodyProps) {
  const unlocked = useTutorialUnlocked(tutorial.id)
  const locked = tutorial.gated && tutorial.embedUrl !== null && !unlocked
  const [justUnlocked, setJustUnlocked] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)
  const gateTitleId = useId()

  // 解锁后留资表单卸载：把焦点移到播放按钮上（否则会掉到 <body>，键盘用户要从头找）
  useEffect(() => {
    if (justUnlocked && !locked) playerRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [justUnlocked, locked])

  const details = <TutorialDetails tutorial={tutorial} />

  return (
    <div className="flex flex-col gap-4 px-6 pt-5">
      {/* 读屏播报区：先渲染（空），解锁后填入文字才会被播报 */}
      <p
        role="status"
        className={cn(
          justUnlocked ? 'flex items-center gap-2 text-sm font-medium text-success' : 'sr-only',
        )}
      >
        {justUnlocked ? (
          <>
            <CheckIcon aria-hidden className="size-4 shrink-0" strokeWidth={3} />
            {t.gate.unlocked}
          </>
        ) : null}
      </p>

      {locked ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
          {/* ≥ md 两栏：右栏表单较长，弹窗内滚动时左栏封面与简介停在顶部 */}
          <div className="flex flex-col gap-4 md:sticky md:top-6 md:self-start">
            <LockedCover tutorial={tutorial} />
            {details}
          </div>
          <section
            aria-labelledby={gateTitleId}
            className="flex flex-col gap-4 rounded-md border border-border p-4 md:p-5"
          >
            <div className="flex flex-col gap-1.5">
              <h3 id={gateTitleId} className="text-lg leading-snug font-semibold text-foreground">
                {gate.title}
              </h3>
              {gate.description ? (
                <p className="text-sm text-muted-foreground">{gate.description}</p>
              ) : null}
            </div>
            {/* 紧凑形态（留言折叠为“+ 留言”）：放在窄栏里，提交按钮尽量不用滚动就能看到 */}
            <LeadForm
              config={config}
              variant="sidebar"
              intent="tutorial"
              position={TUTORIAL_GATE_POSITION}
              tutorialId={tutorial.id}
              disciplineId={tutorial.discipline?.id}
              submitLabel={gate.submitLabel}
              onSuccess={() => {
                unlockTutorial(tutorial.id)
                setJustUnlocked(true)
              }}
            />
          </section>
        </div>
      ) : (
        <>
          <div ref={playerRef} className="flex flex-col gap-2">
            <VideoFacade
              key={tutorial.id}
              embedUrl={tutorial.embedUrl}
              title={tutorial.title}
              poster={tutorial.cover}
              posterSizes={PLAYER_SIZES}
            />
            {tutorial.embedUrl ? (
              <p className="text-xs text-muted-foreground">{zh.video.notice}</p>
            ) : null}
          </div>
          {details}
        </>
      )}
    </div>
  )
}

/** 封面 + 锁形图标：留资前的占位（不是播放按钮，不可点击） */
function LockedCover({ tutorial }: { tutorial: TutorialCardData }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
      {tutorial.cover ? (
        <Image
          src={tutorial.cover.src}
          alt=""
          fill
          sizes={LOCKED_COVER_SIZES}
          className="object-cover"
        />
      ) : null}
      <span aria-hidden className="absolute inset-0 grid place-items-center bg-background/40">
        <span className="grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-lg">
          <LockIcon className="size-6" />
        </span>
      </span>
    </div>
  )
}

/** 简介（弹窗的无障碍描述）与专业方向链接 */
function TutorialDetails({ tutorial }: { tutorial: TutorialCardData }) {
  if (!tutorial.description && !tutorial.discipline) return null
  return (
    <div className="flex flex-col items-start gap-3">
      {tutorial.description ? (
        <DialogDescription className="text-base text-foreground">
          {tutorial.description}
        </DialogDescription>
      ) : null}
      {tutorial.discipline ? (
        <Link
          href={majorPath(tutorial.discipline.slug)}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-emphasis underline-offset-4 hover:underline"
        >
          {formatMessage(t.player.learnMore, { name: tutorial.discipline.name })}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Link>
      ) : null}
    </div>
  )
}
