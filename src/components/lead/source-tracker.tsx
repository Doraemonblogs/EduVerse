'use client'

import { useEffect } from 'react'

import { buildLandingInfo, shouldReplaceLanding, type LandingInfo } from '@/lib/lead/source'

const STORAGE_KEY = 'eduverse:landing'

/** 读取本次会话记录的首次触达信息（sessionStorage 不可用时返回 null） */
export function readLandingInfo(): LandingInfo | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LandingInfo) : null
  } catch {
    return null
  }
}

/** 记录首次触达（落地页、外部来源、UTM）。放在根布局中，每次页面加载执行一次 */
export function SourceTracker() {
  useEffect(() => {
    try {
      const next = buildLandingInfo(window.location.href, document.referrer)
      if (shouldReplaceLanding(readLandingInfo(), next)) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      }
    } catch {
      // 隐私模式等存储不可用：忽略，提交时退回到当前页面信息
    }
  }, [])
  return null
}
