'use client'

import { useMemo } from 'react'

import { contrastRatio } from '@/lib/a11y/contrast'

import { useCssVars } from './use-css-vars'

type Swatch = { name: string; label: string }

/** 读取 :root 上的原始色板变量并展示（值来自真实 CSS，不会与样式表脱节） */
export function TokenSwatches({ swatches }: { swatches: Swatch[] }) {
  const names = useMemo(() => swatches.map((s) => s.name), [swatches])
  const values = useCssVars(names)

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
      {swatches.map((swatch) => {
        const hex = values[swatch.name]
        const onWhite = hex?.startsWith('#') ? contrastRatio(hex, '#ffffff') : null
        return (
          <li key={swatch.name} className="flex flex-col gap-2">
            <div
              className="aspect-[4/3] rounded-sm border border-black/10"
              style={{ background: `var(--${swatch.name})` }}
            />
            <div className="text-sm">
              <p className="font-medium">{swatch.label}</p>
              <p className="font-mono text-xs text-muted-foreground">--{swatch.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {hex || '…'}
                {onWhite ? ` · 白底 ${onWhite.toFixed(2)}` : ''}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
