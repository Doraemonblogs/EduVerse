import { zh } from '@/i18n/zh'
import { submitLeadAction, type LeadActionState } from '@/lib/lead/actions'

/**
 * 客户端调用留资 Server Action 的包装：永远不 reject。
 * 弱网请求失败、发版后旧页面的 Action ID 失效（UnrecognizedActionError）、服务端返回非 RSC 响应等
 * 都会让 Action 的 Promise reject；React 19 会在渲染时把它重新抛出，冒泡到错误边界，
 * 访客填写的内容随之丢失。这里统一转成表单可显示的错误状态（附咨询热线兜底提示）。
 */
export async function submitLeadSafely(
  previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  try {
    return await submitLeadAction(previous, formData)
  } catch (err) {
    console.warn('留资提交请求失败', err)
    return { status: 'error', message: zh.lead.errors.generic }
  }
}
