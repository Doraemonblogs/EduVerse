'use client'

import { useSyncExternalStore } from 'react'

import {
  readTutorialGatePassed,
  readUnlockedTutorialIds,
  rememberTutorialGatePassed,
  rememberUnlockedTutorial,
  TUTORIAL_GATE_PASSED_STORAGE_KEY,
  TUTORIAL_UNLOCK_STORAGE_KEY,
} from '@/lib/tutorials/storage'

/**
 * 本浏览器已留资解锁的教程（客户端状态，播放弹窗与卡片徽标共用）。
 * 留资解锁只是引导，不是访问控制：记录在 localStorage（src/lib/tutorials/storage.ts，读写都包 try/catch）。
 *
 * 一个教程算“已解锁”：本浏览器已通过教程留资（任意一个教程留资成功即可，之后其它 gated 教程不再要求留资），
 * 或者这个教程单独记录过解锁。弹窗是否要求留资与卡片徽标（“留资解锁” / “已解锁”）都按这一条判断，两处始终一致。
 *
 * 存储不可用（隐私模式、被禁用）时，本次页面内的解锁记在内存里，刷新后需要重新留资：
 * - 刚解锁的教程 ID 一律记在内存里（其它标签页清空存储后，正在看的教程也不会突然重新上锁）；
 * - “已留资”标记只在写不进存储时记在内存里。
 *
 * 用 useSyncExternalStore 订阅：服务端渲染与水合阶段一律视为“未解锁”（与服务端 HTML 一致），
 * 水合后读取本地记录；其它标签页解锁（storage 事件）也会同步过来。
 */

const listeners = new Set<() => void>()

/** 本页面内解锁过的教程：localStorage 写入失败时靠它保持解锁 */
const sessionUnlocked = new Set<number>()

/** 本页面内通过了留资，但 localStorage 写不进“已留资”标记 */
let sessionGatePassed = false

function isTutorialUnlocked(id: number): boolean {
  if (sessionGatePassed || sessionUnlocked.has(id)) return true
  return readTutorialGatePassed() || readUnlockedTutorialIds().includes(id)
}

const getServerSnapshot = () => false

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    // key 为 null：其它标签页清空了全部存储
    if (
      event.key === null ||
      event.key === TUTORIAL_UNLOCK_STORAGE_KEY ||
      event.key === TUTORIAL_GATE_PASSED_STORAGE_KEY
    ) {
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** 这个教程在本浏览器是否已解锁（水合前为 false） */
export function useTutorialUnlocked(id: number): boolean {
  return useSyncExternalStore(subscribe, () => isTutorialUnlocked(id), getServerSnapshot)
}

/**
 * 教程留资成功后调用：记下这个教程，并标记本浏览器已通过教程留资（其它 gated 教程一并解锁），
 * 然后通知所有订阅的组件。
 */
export function unlockTutorial(id: number): void {
  rememberUnlockedTutorial(id)
  sessionUnlocked.add(id)
  if (!rememberTutorialGatePassed()) sessionGatePassed = true
  for (const listener of listeners) listener()
}
