'use client'

import { useRef } from 'react'

import { contrastRatio } from '@/lib/a11y/contrast'
import { CONTRAST_PAIRS } from '@/styles/contrast-pairs'

import { useCssVars } from './use-css-vars'

const TOKEN_NAMES = [...new Set(CONTRAST_PAIRS.flatMap((p) => [p.foreground, p.background]))]

/** 在所在区块（light / paper / dark）内实时计算语义令牌的对比度 */
export function ContrastTable() {
  const ref = useRef<HTMLDivElement>(null)
  const values = useCssVars(TOKEN_NAMES, ref)

  return (
    <div ref={ref}>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">语义令牌对比度</caption>
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th scope="col" className="py-2 font-medium">
              组合
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              对比度
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              要求
            </th>
          </tr>
        </thead>
        <tbody>
          {CONTRAST_PAIRS.map((pair) => {
            const fg = values[pair.foreground] ?? ''
            const bg = values[pair.background] ?? ''
            const ratio = fg.startsWith('#') && bg.startsWith('#') ? contrastRatio(fg, bg) : null
            const pass = ratio !== null && ratio >= pair.min
            return (
              <tr key={pair.label} className="border-b last:border-b-0">
                <td className="py-2">
                  <span
                    aria-hidden
                    className="mr-2 inline-block size-3 rounded-xs align-[-1px]"
                    style={{ background: bg, boxShadow: `inset 0 0 0 3px ${fg}` }}
                  />
                  {pair.label}
                </td>
                <td className="numeric py-2 text-right">{ratio ? ratio.toFixed(2) : '—'}</td>
                <td
                  className={
                    ratio === null
                      ? 'py-2 text-right text-muted-foreground'
                      : pass
                        ? 'py-2 text-right text-success'
                        : 'py-2 text-right text-destructive'
                  }
                >
                  {ratio === null ? '计算中' : pass ? '通过' : '未通过'} ≥{pair.min}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
