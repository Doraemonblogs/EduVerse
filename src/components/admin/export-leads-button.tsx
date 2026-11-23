'use client'

import { toast, useConfig } from '@payloadcms/ui'
import { useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'

import { zh } from '@/i18n/zh'

import { buildExportUrl, exportNotice, requestLeadExport, saveBlob } from './export-leads-request'

const MESSAGES = zh.export

/**
 * 线索列表页右上角“更多”菜单中的导出项（admin.components.listMenuItems）。
 * 把列表当前的筛选条件带到 GET /api/leads/export；权限过滤与操作留痕在服务端完成。
 * 用 fetch 而不是普通链接：
 * - 导出期间按钮禁用，并显示“正在导出”的提示条（菜单点击后会收起，提示条仍可见）；
 *   重复点击不会重复导出（每次导出都会写一条操作日志）；
 * - 失败（登录过期、无权限、筛选无效）时提示条显示服务端返回的原因，不会跳到一页 JSON；
 * - 超出单次上限被截断时提示导出条数与匹配总数，提示条需手动关闭；
 * - 成功后用 Blob + Object URL 下载，文件名取自服务端的 Content-Disposition。
 */
export function ExportLeadsButton() {
  const searchParams = useSearchParams()
  const {
    config: {
      routes: { api },
    },
  } = useConfig()
  const [busy, setBusy] = useState(false)
  // 状态更新前的连续点击也要拦住
  const pending = useRef(false)

  const handleClick = async () => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    const toastId = toast.loading(MESSAGES.busy)
    try {
      const result = await requestLeadExport(buildExportUrl(api, searchParams))
      if (!result.ok) {
        toast.error(result.message, { id: toastId })
        return
      }
      saveBlob(result.blob, result.filename)
      const notice = exportNotice(result)
      if (notice.type === 'warning') {
        toast.warning(notice.message, { id: toastId, duration: Infinity })
      } else {
        toast.success(notice.message, { id: toastId })
      }
    } catch {
      toast.error(MESSAGES.failed, { id: toastId })
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={
        busy ? 'popup-button-list__button popup-button-list__disabled' : 'popup-button-list__button'
      }
      onClick={() => void handleClick()}
      disabled={busy}
      aria-busy={busy}
    >
      {busy ? MESSAGES.busy : MESSAGES.menuLabel}
    </button>
  )
}
