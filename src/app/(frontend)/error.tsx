'use client'

import { useEffect } from 'react'

import { StatusPage } from '@/components/common/status-page'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'

export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusPage
      eyebrow={zh.error.eyebrow}
      title={zh.error.title}
      description={zh.error.description}
      homeLabel={zh.error.backHome}
      primaryAction={
        <Button type="button" onClick={() => reset()}>
          {zh.error.retry}
        </Button>
      }
    />
  )
}
