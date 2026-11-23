import { describe, expect, it } from 'vitest'

import { isRichTextFilled } from '@/lib/rich-text-filled'

/**
 * 富文本是否有内容（专业介绍、讲师简介、学员故事正文共用）：后台清空正文后编辑器保存的是“只有一个空段落”，
 * 不是 null，这种情况必须视为没有内容（不渲染空区块 / 不显示“阅读完整故事”）。
 */

type Node = { type: string; version: number; children?: unknown[]; [key: string]: unknown }

const state = (...children: Node[]) => ({
  root: { type: 'root', format: '' as const, indent: 0, version: 1, direction: null, children },
})

const text = (value: string) => ({ type: 'text', text: value, version: 1, format: 0 })

describe('isRichTextFilled', () => {
  it('未填写（null / undefined）、没有顶层节点、只有空段落：视为没有内容', () => {
    expect(isRichTextFilled(null)).toBe(false)
    expect(isRichTextFilled(undefined)).toBe(false)
    expect(isRichTextFilled(state())).toBe(false)
    expect(isRichTextFilled(state({ type: 'paragraph', version: 1, children: [] }))).toBe(false)
    expect(
      isRichTextFilled(
        state(
          { type: 'paragraph', version: 1, children: [] },
          { type: 'paragraph', version: 1, children: [] },
        ),
      ),
    ).toBe(false)
  })

  it('有文字的段落，或任一非段落节点（标题、图片、列表…）：视为有内容', () => {
    expect(
      isRichTextFilled(state({ type: 'paragraph', version: 1, children: [text('简介')] })),
    ).toBe(true)
    expect(
      isRichTextFilled(
        state(
          { type: 'paragraph', version: 1, children: [] },
          { type: 'heading', tag: 'h2', version: 1, children: [text('作品集')] },
        ),
      ),
    ).toBe(true)
    // 上传图片节点没有 children，同样算有内容
    expect(isRichTextFilled(state({ type: 'upload', version: 1, value: 3 }))).toBe(true)
  })

  it('类型守卫：判断为有内容后可以直接当作非空富文本使用', () => {
    const data: ReturnType<typeof state> | null = state({
      type: 'paragraph',
      version: 1,
      children: [text('正文')],
    })
    if (!isRichTextFilled(data)) throw new Error('应有内容')
    expect(data.root.children).toHaveLength(1)
  })
})
