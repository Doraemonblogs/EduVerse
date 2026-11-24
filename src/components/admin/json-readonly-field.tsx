'use client'

import { useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'

import { zh } from '@/i18n/zh'

/**
 * 只读 JSON 字段在后台的展示（线索的职业测试结果、导出日志的筛选条件）：格式化后的文本。
 *
 * 替代 Payload 默认的 JSON 编辑器：默认编辑器基于 Monaco，运行时从境外 CDN（cdn.jsdelivr.net）加载脚本，
 * 在大陆访问不稳定，也违反“不引入境外 CDN”的约束（M8 发现）。这两个字段在后台都不可编辑，用不到编辑器。
 */
export const JsonReadOnlyField: JSONFieldClientComponent = ({ field, path }) => {
  const { value } = useField<unknown>({ path })
  const labelId = `field-label-${path.replace(/\./g, '__')}`
  const label = typeof field.label === 'string' ? field.label : (field.name ?? path)
  const text = value === null || value === undefined ? '' : JSON.stringify(value, null, 2)

  return (
    <div className="field-type json" style={{ marginBottom: 'var(--spacing-field, 1.5rem)' }}>
      <span id={labelId} className="field-label">
        {label}
      </span>
      {text ? (
        <pre
          aria-labelledby={labelId}
          tabIndex={0}
          style={{
            margin: 0,
            padding: '0.75rem 1rem',
            maxHeight: '24rem',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.8125rem',
            lineHeight: 1.6,
            background: 'var(--theme-elevation-50)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-s, 3px)',
          }}
        >
          {text}
        </pre>
      ) : (
        <p aria-labelledby={labelId} style={{ margin: 0, color: 'var(--theme-elevation-500)' }}>
          {zh.adminFields.jsonEmpty}
        </p>
      )}
    </div>
  )
}
