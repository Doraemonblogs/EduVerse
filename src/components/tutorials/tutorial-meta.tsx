import { Fragment } from 'react'

import { zh } from '@/i18n/zh'
import { tutorialLevelLabel, tutorialProviderLabel } from '@/lib/tutorials/format'
import type { TutorialCardData } from '@/lib/tutorials/types'
import { cn } from '@/lib/utils'

const t = zh.tutorials.card

export type TutorialMetaProps = {
  tutorial: Pick<TutorialCardData, 'discipline' | 'level' | 'duration' | 'provider'>
  /** 元素 id（卡片按钮用 aria-describedby 引用它） */
  id?: string
  /**
   * 时长的显示方式：visible 显示在这一行里（播放弹窗）；
   * sr-only 只给读屏（卡片：时长已显示在封面右下角，那里对读屏隐藏）
   */
  duration?: 'visible' | 'sr-only'
  className?: string
}

/**
 * 教程信息行：专业方向（简称）· 难度 · 时长 · 播放平台（“哔哩哔哩”）。
 * 难度、时长、平台的可见文字只有取值，读屏补充前缀（“难度”“时长”“播放平台”）；
 * 各项之间用细竖线分隔（对读屏隐藏，另补读屏停顿）。卡片与播放弹窗共用（不含交互，服务端 / 客户端组件都能用）。
 */
export function TutorialMeta({ tutorial, id, duration = 'visible', className }: TutorialMetaProps) {
  const items: { key: string; label: string | null; value: string; strong?: boolean }[] = []
  if (tutorial.discipline) {
    items.push({
      key: 'discipline',
      label: null,
      value: tutorial.discipline.shortName,
      strong: true,
    })
  }
  items.push({ key: 'level', label: t.level, value: tutorialLevelLabel(tutorial.level) })
  if (tutorial.duration && duration === 'visible') {
    items.push({ key: 'duration', label: t.duration, value: tutorial.duration })
  }
  items.push({
    key: 'provider',
    label: t.provider,
    value: tutorialProviderLabel(tutorial.provider),
  })

  return (
    <p
      id={id}
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground',
        className,
      )}
    >
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 ? (
            <>
              <span aria-hidden className="h-3 w-px bg-border" />
              <span className="sr-only">，</span>
            </>
          ) : null}
          <span
            className={cn(
              item.strong && 'font-medium text-foreground',
              item.key === 'duration' && 'numeric',
            )}
          >
            {item.label ? <span className="sr-only">{item.label} </span> : null}
            {item.value}
          </span>
        </Fragment>
      ))}
      {tutorial.duration && duration === 'sr-only' ? (
        <span className="sr-only">
          ，{t.duration} {tutorial.duration}
        </span>
      ) : null}
    </p>
  )
}
