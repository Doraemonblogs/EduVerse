'use client'

import { useEffect } from 'react'

import { isStaticPreview } from '@/config/site'
import { articleViewSessionKey, articleViewUrl } from '@/lib/articles/paths'

/**
 * 本次页面会话里已上报过的文章：会话存储不可用（隐私模式、被禁用）时兜底，
 * 也让开发环境 StrictMode 重复执行的 effect 不会重复上报。客户端导航离开再回来同样不再上报。
 */
const reported = new Set<number>()

/** 会话存储里是否已有标记；没有时写入。存储不可用时返回 false（由 reported 兜底去重） */
function markInSession(id: number): boolean {
  const key = articleViewSessionKey(id)
  try {
    if (window.sessionStorage.getItem(key) !== null) return true
    window.sessionStorage.setItem(key, '1')
  } catch {
    // 无法使用会话存储：只按本次页面会话去重
  }
  return false
}

/**
 * 上报一次阅读（POST /api/articles/:id/view，见 src/endpoints/article-view.ts）：
 * - 同一会话同一文章只报一次（sessionStorage 标记 + 页面内记录）；
 * - 优先 navigator.sendBeacon（离开页面也能发出），不可用或排队失败时改用 fetch keepalive；
 * - 失败静默：接口访问不到、返回错误都不影响阅读，也不重试；
 * - 静态预览站没有服务端，不上报。
 * 返回本次是否发出了上报（测试用）。
 */
export function reportArticleView(id: number): boolean {
  if (isStaticPreview || reported.has(id)) return false
  reported.add(id)
  if (markInSession(id)) return false

  const url = articleViewUrl(id)
  try {
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url)) return true
  } catch {
    // 个别浏览器在页面隐藏等时机会抛错：改用 fetch
  }
  try {
    void fetch(url, { method: 'POST', keepalive: true }).catch(() => undefined)
  } catch {
    return false
  }
  return true
}

/**
 * 资讯详情的阅读量上报（客户端组件，不渲染任何内容）：页面在浏览器里加载后上报一次。
 * 页面上显示的阅读量来自缓存数据（最迟 1 小时更新），不随上报变化。
 */
export function ArticleViewBeacon({ articleId }: { articleId: number }) {
  useEffect(() => {
    reportArticleView(articleId)
  }, [articleId])

  return null
}
