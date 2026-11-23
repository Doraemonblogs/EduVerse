'use client'

import { useSyncExternalStore } from 'react'

const subscribeNothing = () => () => {}

/**
 * 是否已在客户端接管：服务端渲染与水合阶段为 false，水合后为 true。
 * 灯箱（src/components/common/lightbox.tsx）、作品视频的播放按钮在水合前点击不会有反应，
 * 先置为不可用（与留资表单的提交按钮一致），水合后再启用。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )
}
