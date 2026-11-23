'use client'

import { useSearchParams } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

import { useLeadDialog } from '@/components/lead/lead-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { parseTutorialId, TUTORIAL_PLAY_PARAM } from '@/lib/tutorials/paths'
import type { TutorialCardData, TutorialPagesSettings } from '@/lib/tutorials/types'

import { TutorialDialogBody } from './tutorial-dialog-body'
import { TutorialMeta } from './tutorial-meta'

type TutorialPlayerContextValue = {
  /** 打开某个教程的播放弹窗（地址栏同步为 ?play=<id>） */
  open: (id: number) => void
}

const TutorialPlayerContext = createContext<TutorialPlayerContextValue | null>(null)

export function useTutorialPlayer(): TutorialPlayerContextValue {
  const value = useContext(TutorialPlayerContext)
  if (!value) throw new Error('useTutorialPlayer 必须在 <TutorialPlayer> 内使用')
  return value
}

/**
 * 把地址栏的 play 参数改为 id（null 去掉），保留其它参数（筛选条件）与路径（含 basePath）。
 * 用 history.replaceState：Next 会同步到 useSearchParams，但不重新请求页面；不新增历史记录，
 * 关闭弹窗后“返回”回到上一个页面，而不是在同一页面里来回开关弹窗。
 */
function replacePlayParam(id: number | null): void {
  const params = new URLSearchParams(window.location.search)
  if (id === null) params.delete(TUTORIAL_PLAY_PARAM)
  else params.set(TUTORIAL_PLAY_PARAM, String(id))
  const query = params.toString()
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
  )
}

export type TutorialPlayerProps = {
  /**
   * 可以在弹窗中打开的教程：当前筛选结果，加上深链接 ?play= 指向、但不在结果里的那一个。
   * 地址里的 play 指向不在这里的教程时不打开弹窗（页面另行提示）。
   */
  tutorials: TutorialCardData[]
  /** 留资解锁区的文案（教程页面设置） */
  gate: TutorialPagesSettings['gate']
  /** 页面内容（教程网格；卡片里的 TutorialPlayButton 调用 open） */
  children: React.ReactNode
}

/**
 * 免费教程的播放弹窗（客户端组件，整页只有一个）：
 * - 卡片按钮调用 open(id) 打开，地址栏同步为 `?play=<id>`（可分享）；关闭后去掉 play 参数；
 * - 打开带 `?play=<id>` 的地址时直接打开对应弹窗；浏览器前进 / 后退改变 play 参数时同步开关；
 * - 弹窗内容见 TutorialDialogBody：留资解锁（gated 且本浏览器未解锁）或“点击后加载”的播放器；
 * - Esc / 关闭按钮 / 点击遮罩关闭，焦点回到打开它的卡片按钮；深链接直接打开时没有打开它的按钮，
 *   关闭后聚焦网格里对应的卡片按钮（不在当前结果里时交给 Radix 默认处理）。
 */
export function TutorialPlayer({ tutorials, gate, children }: TutorialPlayerProps) {
  const { config } = useLeadDialog()
  const searchParams = useSearchParams()
  const urlPlayId = parseTutorialId(searchParams.get(TUTORIAL_PLAY_PARAM))

  // 弹窗状态以组件状态为准（点击后立即打开）；地址栏的 play 参数从外部改变（前进 / 后退、站内链接）时跟随它
  const [openId, setOpenId] = useState<number | null>(urlPlayId)
  const [syncedUrlId, setSyncedUrlId] = useState<number | null>(urlPlayId)
  if (urlPlayId !== syncedUrlId) {
    setSyncedUrlId(urlPlayId)
    setOpenId(urlPlayId)
  }

  const current = openId === null ? null : (tutorials.find((item) => item.id === openId) ?? null)
  // 关闭后保留最后一次的内容，直到下次打开（关闭过程中弹窗内容不会突然变空）
  const [shown, setShown] = useState<TutorialCardData | null>(current)
  if (current && current !== shown) setShown(current)

  const returnFocusRef = useRef<HTMLElement | null>(null)

  const open = useCallback((id: number) => {
    setOpenId(id)
    replacePlayParam(id)
  }, [])

  const close = () => {
    // 关闭时焦点的退路：深链接直接打开时，打开前的焦点不在任何按钮上
    returnFocusRef.current =
      openId === null
        ? null
        : document.querySelector<HTMLElement>(`[data-tutorial-play="${openId}"]`)
    setOpenId(null)
    replacePlayParam(null)
  }

  const value = useMemo(() => ({ open }), [open])

  return (
    <TutorialPlayerContext.Provider value={value}>
      {children}
      <Dialog
        open={current !== null}
        onOpenChange={(next) => {
          if (!next) close()
        }}
      >
        {shown ? (
          <DialogContent
            className="sm:w-[calc(100%-2rem)] sm:max-w-3xl"
            returnFocusFallbackRef={returnFocusRef}
            // 没有简介时不关联描述（否则 Radix 会提示缺少 Description）
            {...(shown.description ? {} : { 'aria-describedby': undefined })}
          >
            <DialogHeader className="gap-2">
              <DialogTitle>{shown.title}</DialogTitle>
              <TutorialMeta tutorial={shown} className="text-sm" />
            </DialogHeader>
            <TutorialDialogBody key={shown.id} tutorial={shown} gate={gate} config={config} />
          </DialogContent>
        ) : null}
      </Dialog>
    </TutorialPlayerContext.Provider>
  )
}
