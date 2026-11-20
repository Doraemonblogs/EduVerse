import * as React from 'react'

import { cn } from '@/lib/utils'

import { fieldClassName } from './input'

function Textarea({ className, rows = 4, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(fieldClassName, 'min-h-24 resize-y px-3.5 py-2.5', className)}
      {...props}
    />
  )
}

export { Textarea }
