import type { Metadata } from 'next'

import { StatusPage } from '@/components/common/status-page'
import { zh } from '@/i18n/zh'

/**
 * 不在这里声明 robots：Next 给所有 404 响应自动输出 `<meta name="robots" content="noindex">`
 * （流式渲染中途 notFound()、状态码已是 200 时也会输出），再声明一次会出现两个 robots 标签。
 */
export const metadata: Metadata = {
  title: zh.notFound.title,
}

export default function NotFound() {
  return (
    <StatusPage
      eyebrow={zh.notFound.eyebrow}
      title={zh.notFound.title}
      description={zh.notFound.description}
      homeLabel={zh.notFound.backHome}
    />
  )
}
