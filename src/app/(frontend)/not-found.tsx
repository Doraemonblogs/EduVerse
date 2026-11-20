import type { Metadata } from 'next'

import { StatusPage } from '@/components/common/status-page'
import { zh } from '@/i18n/zh'

export const metadata: Metadata = {
  title: zh.notFound.title,
  robots: { index: false, follow: true },
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
