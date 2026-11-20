import { describe, expect, it } from 'vitest'

import { toLexical } from '../../scripts/seed/lexical'
import {
  createRandom,
  dimensions,
  generatePlaceholder,
  hashString,
} from '../../scripts/seed/placeholders'

describe('占位图生成', () => {
  it('同一个种子得到相同的随机序列，不同种子不同', () => {
    const a = createRandom('work-1')
    const b = createRandom('work-1')
    const c = createRandom('work-2')
    const seqA = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(seqA)
    expect([c(), c(), c()]).not.toEqual(seqA)
    expect(hashString('x')).toBe(hashString('x'))
  })

  it('按宽高比计算尺寸，长边等于指定尺寸', () => {
    expect(dimensions('16:9', 1600)).toEqual({ width: 1600, height: 900 })
    expect(dimensions('3:4', 1600)).toEqual({ width: 1200, height: 1600 })
    expect(dimensions('1:1', 600)).toEqual({ width: 600, height: 600 })
  })

  it('生成真实可解码的图片，相同输入结果一致', async () => {
    const opts = {
      kind: 'art',
      seed: 's',
      hue: 200,
      aspect: '4:3',
      label: '占位图 · 测试',
      size: 200,
    } as const
    const first = await generatePlaceholder(opts, 'seed-test')
    const second = await generatePlaceholder(opts, 'seed-test')
    expect(first.mimetype).toBe('image/jpeg')
    expect(first.filename).toBe('seed-test.jpg')
    expect(first.width).toBe(200)
    expect(first.height).toBe(150)
    expect(first.data.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]))
    expect(Buffer.compare(first.data, second.data)).toBe(0)
  })

  it('Logo 与二维码输出无损 PNG', async () => {
    const logo = await generatePlaceholder(
      { kind: 'wordmark', seed: 'p', hue: 10, aspect: '2:1', label: '示例企业', size: 200 },
      'seed-logo',
    )
    expect(logo.mimetype).toBe('image/png')
    expect(logo.data.subarray(1, 4).toString()).toBe('PNG')
  })
})

describe('富文本转换', () => {
  it('生成 Lexical 根节点与段落、标题、列表', () => {
    const state = toLexical([
      { h2: '标题' },
      { p: '正文' },
      { ul: ['一', '二'] },
      { ol: ['甲'] },
      { quote: '引用' },
    ])
    const types = state.root.children.map((n) => n.type)
    expect(types).toEqual(['heading', 'paragraph', 'list', 'list', 'quote'])
    expect(state.root.children[2]).toMatchObject({ listType: 'bullet', tag: 'ul' })
    expect(state.root.children[3]).toMatchObject({ listType: 'number', tag: 'ol' })
    const list = state.root.children[2] as unknown as {
      children: { children: { text: string }[] }[]
    }
    expect(list.children.map((li) => li.children[0]!.text)).toEqual(['一', '二'])
  })
})
