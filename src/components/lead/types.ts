import type { ImageSource } from '@/lib/media'
import type { LeadIntent } from '@/lib/validation/lead'

/** 留资表单所需的公开选项（服务端读取后传给客户端组件，可序列化） */
export type LeadFormConfig = {
  disciplines: { id: number; name: string }[]
  cities: string[]
  successTitle: string
  successMessage: string
  wechatId: string | null
  wechatQr: ImageSource | null
  hotline: string | null
}

/** 打开 / 渲染留资表单时的上下文 */
export type LeadContextProps = {
  /** 按钮位置标识，如 header_cta、course_sticky（小写字母、数字、下划线） */
  position: string
  intent?: LeadIntent
  disciplineId?: number
  courseId?: number
  tutorialId?: number
  quizResult?: string
  /** 弹窗标题（不传使用默认） */
  title?: string
  description?: string
  submitLabel?: string
}
